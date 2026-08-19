import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKey = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const insertId = body?.insertId;
    const result = body?.result ?? null;
    if (typeof insertId !== "string" || insertId.length === 0) {
      return NextResponse.json({ error: "Missing insertId" }, { status: 400 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: keyRow, error: keyError } = await supabase.from("plugin_api_keys").select("user_id").eq("api_key", apiKey).maybeSingle();
    if (keyError) return NextResponse.json({ error: keyError.message }, { status: 500 });
    if (!keyRow) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

    const { data: insert, error: insertError } = await supabase
      .from("plugin_inserts")
      .select("id, project_id, projects!inner(user_id)")
      .eq("id", insertId)
      .eq("projects.user_id", keyRow.user_id)
      .maybeSingle();
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    if (!insert) return NextResponse.json({ error: "Insert not found" }, { status: 404 });

    const patch: Record<string, unknown> = { status: "applied" };
    if (result) patch.result = result;
    const { error: updateError } = await supabase.from("plugin_inserts").update(patch).eq("id", insertId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected server error" }, { status: 500 });
  }
}
