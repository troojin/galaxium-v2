import type { NextConfig } from "next";

const cdnOrigin = (
  process.env.CDN_URL ??
  process.env.NEXT_PUBLIC_CDN_URL ??
  "https://galaxium-cdn.troojin.com"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ['26.216.5.113'],
  // Keep local development self-contained; production scripts and static chunks
  // are served from the Cloudflare custom domain.
  assetPrefix: process.env.NODE_ENV === "production" ? cdnOrigin : undefined,
};

export default nextConfig;
