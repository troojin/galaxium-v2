import { NextRequest } from "next/server";
import { createChatCompletionStream, ChatMessage } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPT } from "@/lib/ai/rules";

export const runtime = "edge";

const MAX_HISTORY_MESSAGES = 30;

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
  try {
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
          },
        }
      );
    }

    const stream = await createChatCompletionStream({
      messages: [SYSTEM_PROMPT, ...trimmed],
      temperature: 0.7,
      max_tokens: 16384,
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
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
        },
      }
    );
  }
}