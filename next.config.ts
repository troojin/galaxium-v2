import type { NextConfig } from "next";

const cdnOrigin = (
  process.env.CDN_URL ??
  process.env.NEXT_PUBLIC_CDN_URL ??
  "https://galaxium-cdn.troojin.com"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["26.216.5.113"],
  images: {
    loader: "custom",
    loaderFile: "./lib/cdn.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "galaxium-cdn.troojin.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;