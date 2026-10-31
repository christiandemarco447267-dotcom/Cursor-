import type { NextConfig } from "next";
import pkg from "./package.json";

// When building for GitHub Pages we produce a fully static export served from a
// repo subpath (https://<user>.github.io/<repo>/). The app is local-first, so it
// runs entirely in the browser with client-side demo market data.
const isPages = process.env.GITHUB_PAGES === "true";
const repo = process.env.PAGES_BASE_PATH ?? "";
// Firebase Hosting (and any other static host at the domain root): `npm run build:firebase`.
const isStaticRoot = process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Exposed to the client for feedback context ("which version did this happen on?").
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
  reactStrictMode: true,
  ...(isPages
    ? {
        output: "export",
        basePath: repo,
        assetPrefix: repo || undefined,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : isStaticRoot
      ? {
          output: "export",
          images: { unoptimized: true },
          trailingSlash: true,
        }
      : {}),
};

export default nextConfig;
