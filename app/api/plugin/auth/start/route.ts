import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'edge';

function randomHex(bytes: number) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);

  return Array.from(values, (value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
}

function generateSessionId() {
  return randomHex(16);
}

function generateShortCode() {
  // 3-digit numeric code, zero-padded (e.g. "042", "738")
  const n = Math.floor(Math.random() * 1000);
  return n.toString().padStart(3, "0");
}

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: rpcError } = await supabase.rpc("delete_expired_plugin_auth_sessions");
    if (rpcError) {
      console.error("plugin auth start cleanup rpc error:", rpcError);
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const sessionId = generateSessionId();

    const MAX_ATTEMPTS = 8;
    let shortCode: string | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidate = generateShortCode();

      const { data: existing, error: lookupError } = await supabase
        .from("plugin_auth_sessions")
        .select("short_code")
        .eq("short_code", candidate)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (lookupError) {
        console.error("plugin auth start short code lookup error:", lookupError);
        return NextResponse.json({ error: lookupError.message }, { status: 500 });
      }

      if (!existing) {
        shortCode = candidate;
        break;
      }
    }

    if (!shortCode) {
      console.error("plugin auth start: exhausted attempts finding a free short code");
      return NextResponse.json(
        { error: "Too many active sign-in attempts right now — try again in a moment" },
        { status: 503 }
      );
    }

    const { error } = await supabase.from("plugin_auth_sessions").insert({
      code: sessionId,
      short_code: shortCode,
      status: "pending",
      expires_at: expiresAt,
    });

    if (error) {
      console.error("plugin auth start insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      sessionId,
      shortCode,
      url: `https://g.end.lat/${shortCode}`,
    });
  } catch (err) {
    console.error("plugin auth start crashed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}