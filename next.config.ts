import type { NextConfig } from "next";

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
