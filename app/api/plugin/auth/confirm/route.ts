import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = 'edge';

function randomHex(bytes: number) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);

  return Array.from(values, (value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
}

function generateApiKey() {
  return "gal_" + randomHex(24);
}

export async function POST(req: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const sessionId = body?.sessionId;

  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const { data: session, error: fetchError } = await supabaseAdmin
    .from("plugin_auth_sessions")
    .select("status, expires_at")
    .eq("code", sessionId)
    .maybeSingle();

  if (fetchError) {
    console.error("plugin auth confirm lookup error:", fetchError);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  if (!session || new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: "This sign-in link expired" }, { status: 410 });
  }

  if (session.status === "confirmed") {
    return NextResponse.json({ success: true });
  }

  const apiKey = generateApiKey();

  const { error: updateError } = await supabaseAdmin
    .from("plugin_auth_sessions")
    .update({
      status: "confirmed",
      user_id: user.id,
      api_key: apiKey,
    })
    .eq("code", sessionId);

  if (updateError) {
    console.error("plugin auth confirm update error:", updateError);
    return NextResponse.json({ error: "Failed to confirm" }, { status: 500 });
  }

  await supabaseAdmin.from("plugin_api_keys").insert({
    user_id: user.id,
    api_key: apiKey,
  });

  return NextResponse.json({ success: true });
}