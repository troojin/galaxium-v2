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
    const insertId = body?.insertId;

    if (typeof insertId !== "string" || insertId.length === 0) {
      return NextResponse.json({ error: "Missing insertId" }, { status: 400 });
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
      console.error("plugin insert ack key lookup error:", keyError);
      return NextResponse.json({ error: keyError.message }, { status: 500 });
    }

    if (!keyRow) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const { data: insertRow, error: fetchError } = await supabase
      .from("plugin_inserts")
      .select("id, projects!inner(user_id)")
      .eq("id", insertId)
      .maybeSingle();

    if (fetchError) {
      console.error("plugin insert ack lookup error:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const ownerId = (insertRow as any)?.projects?.user_id;

    if (!insertRow || ownerId !== keyRow.user_id) {
      return NextResponse.json({ error: "Insert not found" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("plugin_inserts")
      .update({ status: "applied", applied_at: new Date().toISOString() })
      .eq("id", insertId);

    if (updateError) {
      console.error("plugin insert ack update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("plugin insert ack crashed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}