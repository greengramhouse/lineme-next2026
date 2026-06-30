import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "profile.line-scdn.net",
      },
      {
        protocol: "https",
        hostname: "obs.line-scdn.net",
      },
    ],
  },
  allowedDevOrigins: ['monorail-example-zesty.ngrok-free.dev'],
};

export default nextConfig;
