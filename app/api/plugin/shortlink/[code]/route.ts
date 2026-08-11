import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'edge';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (!code || code.length === 0) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const { data: session, error } = await supabase
    .from("plugin_auth_sessions")
    .select("code, expires_at")
    .eq("short_code", code)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error("shortlink lookup error:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ error: "This link has expired or doesn't exist" }, { status: 404 });
  }

  return NextResponse.redirect(`https://galaxium.lol/connect/${session.code}`, 302);
}