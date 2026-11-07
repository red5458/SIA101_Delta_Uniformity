import type { NextConfig } from "next";

const API_URL = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(
  /\/+$/,
  "",
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Allow the phone on the local network to load the development app.
  allowedDevOrigins: ["192.168.1.6"],
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
};

export default nextConfig;
