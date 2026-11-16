import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  async headers() {
    const headers = buildSecurityHeaders(process.env.NODE_ENV === "production");
    return [{
      source: "/:path*",
      headers: Object.entries(headers).map(([key, value]) => ({ key, value })),
    }];
  },
};

export default nextConfig;
