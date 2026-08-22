import { NextRequest } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { createClient as createServiceClient, SupabaseClient } from "@supabase/supabase-js";
import { createChatCompletionStream, ChatMessage } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPT, parseGalaxiumResponse, compactAssistantMessageForHistory } from "@/lib/ai/rules";

export const runtime = "edge";

const MAX_HISTORY_MESSAGES = 30;

const ALLOWED_ORIGINS = new Set([
  "https://galaxium.lol",
  "https://www.galaxium.lol",
]);

function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (origin) {
    return ALLOWED_ORIGINS.has(origin);
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      return ALLOWED_ORIGINS.has(refOrigin);
    } catch {
      return false;
    }
  }
  return false;
}

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin":
      origin && ALLOWED_ORIGINS.has(origin) ? origin : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

function cleanMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter(
      (message) =>
        ["user", "assistant", "system"].includes(message.role) &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));
}

const MAX_CONTEXT_CHARS = 20000;
const CONTEXT_STALE_AFTER_MS = 2 * 60 * 1000;

async function buildDataModelContextMessage(
  supabaseAdmin: SupabaseClient,
  projectId: string
): Promise<ChatMessage | null> {
  const { data, error } = await supabaseAdmin
    .from("plugin_datamodel_snapshots")
    .select("snapshot, updated_at")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch DataModel snapshot:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  const age = Date.now() - new Date(data.updated_at).getTime();
  if (age > CONTEXT_STALE_AFTER_MS) {
    return null;
  }

  let json = JSON.stringify(data.snapshot);
  let truncated = false;
  if (json.length > MAX_CONTEXT_CHARS) {
    json = json.slice(0, MAX_CONTEXT_CHARS);
    truncated = true;
  }

  const content =
    "Here is the current state of the Roblox place, captured from Studio. " +
    "Use it to know what already exists before creating anything. If the user refers to an existing " +
    "instance by name, target it using its exact existing path as the parent field for any new children " +
    "instead of recreating it, and do not duplicate instances that already exist unless explicitly asked " +
    "to create a new one." +
    (truncated ? " (truncated for length)" : "") +
    "\n\n" +
    json;

  return { role: "system", content };
}

async function consumeAndPersist({
  stream,
  supabaseAdmin,
  projectId,
  userMessageToPersist,
}: {
  stream: ReadableStream<Uint8Array>;
  supabaseAdmin: SupabaseClient;
  projectId: string;
  userMessageToPersist: ChatMessage | null;
}) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const data = trimmed.slice("data:".length).trim();
        if (data === "[DONE]" || data.length === 0) continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (typeof delta === "string") {
            fullContent += delta;
          }
        } catch (err) {
          console.error("Failed to parse Groq stream chunk:", err, data);
        }
      }
    }
  } catch (err) {
    console.error("Error reading Groq stream for persistence:", err);
    return;
  }

  if (userMessageToPersist) {
    const { error: userInsertError } = await supabaseAdmin
      .from("messages")
      .insert({
        project_id: projectId,
        role: "user",
        content: userMessageToPersist.content,
      });

    if (userInsertError) {
      console.error("Failed to persist user message:", userInsertError);
    }
  }

  if (!fullContent.trim()) {
    console.error("Groq stream produced no content, skipping message/insert persistence");
    return;
  }

  const { data: assistantMessage, error: assistantInsertError } = await supabaseAdmin
    .from("messages")
    .insert({
      project_id: projectId,
      role: "assistant",
      content: fullContent,
    })
    .select("id")
    .single();

  if (assistantInsertError || !assistantMessage) {
    console.error("Failed to persist assistant message:", assistantInsertError);
    return;
  }

  const parsed = parseGalaxiumResponse(fullContent);

  if (!parsed) {
    console.error("Failed to parse Galaxium JSON from assistant output; skipping plugin_inserts");
    return;
  }

  if (parsed.instances.length === 0) {
    return;
  }

  const { error: pluginInsertError } = await supabaseAdmin
    .from("plugin_inserts")
    .insert({
      project_id: projectId,
      message_id: assistantMessage.id,
      payload: { instances: parsed.instances },
    });

  if (pluginInsertError) {
    console.error("Failed to write plugin_inserts row:", pluginInsertError);
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const baseHeaders = corsHeaders(origin);

  try {
    if (!isAllowedOrigin(req)) {
      return new Response(
        JSON.stringify({ error: "Forbidden origin" }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            ...baseHeaders,
          },
        }
      );
    }

    const body = await req.json();

    const { messages, projectId } = body as {
      messages: ChatMessage[];
      projectId: string;
    };

    if (!Array.isArray(messages) || !projectId) {
      return new Response(
        JSON.stringify({
          error: "Missing messages or projectId",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...baseHeaders,
          },
        }
      );
    }

    const supabase = await createClient();

    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: userError?.message,
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...baseHeaders,
          },
        }
      );
    }

    const {
      data: project,
      error: projectError,
    } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({
          error: "Project not found or access denied",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...baseHeaders,
          },
        }
      );
    }

    const cleanedIncoming = cleanMessages(messages);
    const latestUserMessage = cleanedIncoming.at(-1);

    if (!latestUserMessage || latestUserMessage.role !== "user") {
      return new Response(
        JSON.stringify({
          error: "Send a user message to start chatting",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...baseHeaders,
          },
        }
      );
    }

    const {
      data: history,
      error: historyError,
    } = await supabase
      .from("messages")
      .select("role, content, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (historyError) {
      return new Response(
        JSON.stringify({
          error: "Couldn't load conversation history",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...baseHeaders,
          },
        }
      );
    }

    const dbMessages = cleanMessages((history ?? []) as ChatMessage[]);

    const lastDbMessage = dbMessages.at(-1);

    const alreadyPersisted =
      lastDbMessage?.role === "user" &&
      lastDbMessage.content === latestUserMessage.content;

    const fullHistory = alreadyPersisted
      ? dbMessages
      : [...dbMessages, latestUserMessage];

    let trimmed = fullHistory.slice(-MAX_HISTORY_MESSAGES);

    while (trimmed.length > 1 && trimmed[0].role !== "user") {
      trimmed = trimmed.slice(1);
    }

    if (trimmed.length === 0 || trimmed.at(-1)?.role !== "user") {
      return new Response(
        JSON.stringify({
          error: "Send a user message to start chatting",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...baseHeaders,
          },
        }
      );
    }

    const historyForModel: ChatMessage[] = trimmed.map((message) => {
      if (message.role !== "assistant") return message;
      return {
        role: message.role,
        content: compactAssistantMessageForHistory(message.content),
      };
    });

    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const contextMessage = await buildDataModelContextMessage(supabaseAdmin, projectId);

    const aiMessages: ChatMessage[] = contextMessage
      ? [SYSTEM_PROMPT, contextMessage, ...historyForModel]
      : [SYSTEM_PROMPT, ...historyForModel];

    const stream = await createChatCompletionStream({
      messages: aiMessages,
      temperature: 0.4,
      max_tokens: 4096,
    });

    const [clientStream, persistStream] = stream.tee();

    const ctx = getRequestContext().ctx;
    ctx.waitUntil(
      consumeAndPersist({
        stream: persistStream,
        supabaseAdmin,
        projectId,
        userMessageToPersist: alreadyPersisted ? null : latestUserMessage,
      })
    );

    return new Response(clientStream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        ...baseHeaders,
      },
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    console.error("Chat route error:", errorMessage);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...baseHeaders,
        },
      }
    );
  }
}