import type { NextConfig } from "next";

// When building for GitHub Pages we produce a fully static export served from a
// repo subpath (https://<user>.github.io/<repo>/). The app is local-first, so it
// runs entirely in the browser with client-side demo market data.
const isPages = process.env.GITHUB_PAGES === "true";
const repo = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  ...(isPages
    ? {
        output: "export",
        basePath: repo,
        assetPrefix: repo || undefined,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
