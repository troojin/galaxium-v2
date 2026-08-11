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

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: rpcError } = await supabase.rpc("delete_expired_plugin_auth_sessions");
    if (rpcError) {
      // dont fail the whole request over cleanup just log
      console.error("plugin auth start cleanup rpc error:", rpcError);
    }

    const sessionId = generateSessionId();

    const { error } = await supabase.from("plugin_auth_sessions").insert({
      code: sessionId,
      status: "pending",
    });

    if (error) {
      console.error("plugin auth start insert error:", error);
      return NextResponse.json(
        { error: "Failed to start sign-in" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId,
      url: `https://galaxium.lol/connect/${sessionId}`,
    });
  } catch (err) {
    console.error("plugin auth start crashed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}