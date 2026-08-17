// app/api/roblox/avatar/route.ts
import { NextResponse } from "next/server";

export const runtime = "edge";

const FALLBACK_AVATAR = "https://tr.rbxcdn.com/38a6f0904f43dbd0b3a5c876d4de5c72/150/150/AvatarHeadshot/Png";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.redirect(FALLBACK_AVATAR);
  }

  try {
    const userLookup = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true }),
    });

    const userData = await userLookup.json();
    const userId = userData?.data?.[0]?.id;

    if (!userId) {
      return NextResponse.redirect(FALLBACK_AVATAR);
    }

    const thumbLookup = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
    );
    const thumbData = await thumbLookup.json();
    const imageUrl = thumbData?.data?.[0]?.imageUrl;

    if (!imageUrl) {
      return NextResponse.redirect(FALLBACK_AVATAR);
    }

    return NextResponse.redirect(imageUrl, {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    console.error("roblox avatar lookup failed:", err);
    return NextResponse.redirect(FALLBACK_AVATAR);
  }
}