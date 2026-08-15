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
    const snapshot = body?.snapshot;

    if (typeof projectId !== "string" || projectId.length === 0) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    if (!snapshot || typeof snapshot !== "object") {
      return NextResponse.json({ error: "Missing or invalid snapshot" }, { status: 400 });
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
      console.error("plugin context key lookup error:", keyError);
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
      console.error("plugin context project lookup error:", projectError);
      return NextResponse.json({ error: projectError.message }, { status: 500 });
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { error: upsertError } = await supabase
      .from("plugin_datamodel_snapshots")
      .upsert(
        {
          project_id: projectId,
          snapshot,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id" }
      );

    if (upsertError) {
      console.error("plugin context upsert error:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("plugin context crashed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}