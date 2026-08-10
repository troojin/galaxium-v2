import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

// Service-role client for the actual write.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateApiKey() {
  return "gal_" + randomBytes(24).toString("hex");
}

export async function POST(req: Request) {
  // Identify the logged-in user from their browser session cookies.
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // no-op: this route doesn't need to refresh cookies
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
  const code = body?.code?.toUpperCase?.();

  if (typeof code !== "string" || code.length === 0) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const { data: session, error: fetchError } = await supabaseAdmin
    .from("plugin_auth_sessions")
    .select("status, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (fetchError) {
    console.error("plugin auth confirm lookup error:", fetchError);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  if (!session || new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: "Code expired" }, { status: 410 });
  }

  if (session.status === "confirmed") {
    return NextResponse.json({ error: "Code already used" }, { status: 409 });
  }

  const apiKey = generateApiKey();

  const { error: updateError } = await supabaseAdmin
    .from("plugin_auth_sessions")
    .update({
      status: "confirmed",
      user_id: user.id,
      api_key: apiKey,
    })
    .eq("code", code);

  if (updateError) {
    console.error("plugin auth confirm update error:", updateError);
    return NextResponse.json({ error: "Failed to confirm" }, { status: 500 });
  }

  // Also persist the key against the user's account so you can list/revoke
  // plugin connections later from account settings.
  await supabaseAdmin.from("plugin_api_keys").insert({
    user_id: user.id,
    api_key: apiKey,
  });

  return NextResponse.json({ success: true });
}