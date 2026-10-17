import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  // Keep the app build isolated from stale Next.js artifacts left by older dev servers.
  distDir: process.env.NEXT_DIST_DIR ?? ".next-foco",
  ...(isGitHubPages ? {
    output: "export" as const,
    basePath: "/meu-espaco-demo",
    assetPrefix: "/meu-espaco-demo",
    trailingSlash: true,
    images: { unoptimized: true },
    typescript: { tsconfigPath: "tsconfig.pages.json" },
  } : {}),
};

export default nextConfig;
