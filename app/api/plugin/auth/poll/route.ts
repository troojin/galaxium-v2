import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json().catch(() => null);
    const sessionId = body?.sessionId;

    if (typeof sessionId !== "string" || sessionId.length === 0) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const { data: session, error } = await supabase
      .from("plugin_auth_sessions")
      .select("status, api_key, expires_at")
      .eq("code", sessionId)
      .maybeSingle();

    if (error) {
      console.error("plugin auth poll lookup error:", error);
      return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }

    if (!session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ status: "expired" });
    }

    if (session.status === "confirmed") {
      return NextResponse.json({
        status: "confirmed",
        apiKey: session.api_key,
      });
    }

    return NextResponse.json({ status: "pending" });
  } catch (err) {
    console.error("plugin auth poll crashed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}