import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

function generateSessionId() {
  return randomBytes(16).toString("hex");
}

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.rpc("delete_expired_plugin_auth_sessions");

  const sessionId = generateSessionId();

  const { error } = await supabase.from("plugin_auth_sessions").insert({
    code: sessionId,
    status: "pending",
  });

  if (error) {
    console.error("plugin auth start error:", error);
    return NextResponse.json(
      { error: "Failed to start sign-in" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sessionId,
    url: `https://galaxium.lol/connect/${sessionId}`,
  });
}