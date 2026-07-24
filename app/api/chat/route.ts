import { NextRequest } from "next/server";
import { createChatCompletionStream, ChatMessage } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

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

    const groqRes = await createChatCompletionStream({
      messages,
      temperature: 0.7,
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