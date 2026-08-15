import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKey = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const projectId = body?.projectId;

    if (typeof projectId !== "string" || projectId.length === 0) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: keyRow, error: keyError } = await supabase
      .from("plugin_api_keys")
      .select("user_id")
      .eq("api_key", apiKey)
      .maybeSingle();

    if (keyError) {
      console.error("plugin insert pending key lookup error:", keyError);
      return NextResponse.json({ error: keyError.message }, { status: 500 });
    }

    if (!keyRow) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", keyRow.user_id)
      .maybeSingle();

    if (projectError) {
      console.error("plugin insert pending project lookup error:", projectError);
      return NextResponse.json({ error: projectError.message }, { status: 500 });
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: pending, error: pendingError } = await supabase
      .from("plugin_inserts")
      .select("id, payload, created_at")
      .eq("project_id", projectId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5);

    if (pendingError) {
      console.error("plugin insert pending fetch error:", pendingError);
      return NextResponse.json({ error: pendingError.message }, { status: 500 });
    }

    return NextResponse.json({ inserts: pending ?? [] });
  } catch (err) {
    console.error("plugin insert pending crashed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}