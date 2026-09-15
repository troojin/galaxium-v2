import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

function getApiKey(req: Request): string | null {
  const authHeader = req.headers.get("authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export async function GET(req: Request) {
  const apiKey = getApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: keyRow, error } = await supabase
    .from("plugin_api_keys")
    .select("user_id, roblox_user_id")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!keyRow) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  return NextResponse.json({ robloxUserId: keyRow.roblox_user_id ?? null });
}

export async function POST(req: Request) {
  const apiKey = getApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const robloxUserId = body?.robloxUserId;

  if (typeof robloxUserId !== "number" || !Number.isInteger(robloxUserId) || robloxUserId <= 0) {
    return NextResponse.json({ error: "robloxUserId must be a positive integer" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("plugin_api_keys")
    .update({ roblox_user_id: robloxUserId })
    .eq("api_key", apiKey);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}