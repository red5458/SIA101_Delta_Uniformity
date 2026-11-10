import type { NextConfig } from "next";

const API_URL = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(
  /\/+$/,
  "",
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Allow the phone on the local network to load the development app.
  allowedDevOrigins: ["192.168.1.6", "192.168.1.7"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    minimumCacheTTL: 60 * 60 * 24,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  // Local development stores uploads on the API disk. Proxy them so files
  // written after `next build` are still served, and so imported photos keep
  // working in production too.
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${API_URL}/uploads/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        // The worker must never be cached, or clients stay on an old version.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
