// /api/plugin/projects/recent/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKey = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Resolve API key -> user
    const { data: keyRow, error: keyError } = await supabase
      .from("plugin_api_keys")
      .select("user_id")
      .eq("api_key", apiKey)
      .maybeSingle();

    if (keyError) {
      console.error("plugin recent-project key lookup error:", keyError);
      return NextResponse.json({ error: keyError.message }, { status: 500 });
    }

    if (!keyRow) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Latest USER-sent message across all of this user's projects.
    // messages has no user_id, so we filter through the projects join.
    const { data: lastMessage, error: msgError } = await supabase
      .from("messages")
      .select("project_id, created_at, projects!inner(id, name, user_id)")
      .eq("role", "user")
      .eq("projects.user_id", keyRow.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (msgError) {
      console.error("plugin recent-project message lookup error:", msgError);
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    if (!lastMessage) {
      return NextResponse.json({ project: null });
    }

    const project = Array.isArray(lastMessage.projects)
      ? lastMessage.projects[0]
      : lastMessage.projects;

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
      },
      lastActiveAt: lastMessage.created_at,
    });
  } catch (err) {
    console.error("plugin recent-project crashed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}