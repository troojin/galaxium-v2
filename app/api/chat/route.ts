import { NextRequest } from "next/server";
import { createChatCompletionStream, ChatMessage } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

const SYSTEM_PROMPT: ChatMessage = {
  role: "system",
  content:
    "You are Galaxium AI, a helpful conversational assistant. Answer naturally, keep context from the chat history, and ask brief follow-up questions when useful.",
};

function cleanMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter((message) =>
      ["user", "assistant", "system"].includes(message.role) &&
      typeof message.content === "string" &&
      message.content.trim().length > 0
    )
    .slice(-30)
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
        JSON.stringify({ error: "Missing messages or projectId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify Project Ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found or access denied" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const chatMessages = cleanMessages(messages);

    if (chatMessages.length === 0 || chatMessages.at(-1)?.role !== "user") {
      return new Response(
        JSON.stringify({ error: "Send a user message to start chatting" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const groqRes = await createChatCompletionStream({
      messages: [SYSTEM_PROMPT, ...chatMessages],
      temperature: 0.7,
      max_tokens: 1024,
    });

    return new Response(groqRes, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Chat route error:", errorMessage);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: errorMessage,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
