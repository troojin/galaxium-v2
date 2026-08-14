import { NextRequest } from "next/server";
import { createChatCompletionStream, ChatMessage } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPT } from "@/lib/ai/rules";

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

    const stream = await createChatCompletionStream({
      messages: [SYSTEM_PROMPT, ...trimmed],
      temperature: 0.4,
      max_tokens: 4096,
    });

    return new Response(stream, {
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
