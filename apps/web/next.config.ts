import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  // Static app shell + Suspense-close-to-data. Also what makes an offline
  // soft navigation render something instead of hanging on a blank route.
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Failed navigations / RSC fetches / Server Actions park and retry on
    // reconnect instead of throwing. Powers useOffline().
    useOffline: true,
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
