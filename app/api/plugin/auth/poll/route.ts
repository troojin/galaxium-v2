import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const code = body?.code;

  if (typeof code !== "string" || code.length === 0) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const { data: session, error } = await supabase
    .from("plugin_auth_sessions")
    .select("status, api_key, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("plugin auth poll error:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ status: "expired" });
  }

  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ status: "expired" });
  }

  if (session.status === "confirmed") {
    return NextResponse.json({
      status: "confirmed",
      apiKey: session.api_key,
    });
  }

  return NextResponse.json({ status: "pending" });
}