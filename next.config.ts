import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the app build isolated from stale Next.js artifacts left by older dev servers.
  distDir: process.env.NEXT_DIST_DIR ?? ".next-foco",
};

export default nextConfig;
