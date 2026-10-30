import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The marketing page is a static HTML file in /public.
  async rewrites() {
    return [{ source: "/", destination: "/landing.html" }];
  },
  poweredByHeader: false,
};

export default nextConfig;
