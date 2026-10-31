#!/usr/bin/env node
// Static export build (→ ./out) for:
//   - Firebase Hosting / any static host at the domain root: `npm run build:firebase`
//   - the Capacitor app-store bundle: `npm run build:mobile` (passes --target=native), which
//     exports with NO base path (the app is served from capacitor://localhost/ and
//     https://localhost/), flags the bundle as native, and drops web-only files.
// The GitHub Pages build (base path /Cursor-) is separate: see .github/workflows/deploy-pages.yml.
//
// `output: "export"` can't include the server-only API routes (/api/market,
// /api/health — they read the request / are force-dynamic) or the proxy
// (security headers; firebase.json sets those instead). The app is client-first,
// so we move them aside for this build only and always restore them.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const native = process.argv.includes("--target=native");
const stash = path.join(root, ".static-build-stash");
const moves = [
  ["src/app/api", "api"],
  ["src/proxy.ts", "proxy.ts"],
];

function restore() {
  for (const [from, name] of moves) {
    const parked = path.join(stash, name);
    if (existsSync(parked) && !existsSync(path.join(root, from))) renameSync(parked, path.join(root, from));
  }
  rmSync(stash, { recursive: true, force: true });
}

restore(); // recover from an interrupted previous run
mkdirSync(stash, { recursive: true });
for (const [from, name] of moves) {
  if (existsSync(path.join(root, from))) renameSync(path.join(root, from), path.join(stash, name));
}
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    restore();
    process.exit(130);
  });
}

let status = 1;
try {
  const result = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    env: native ? nativeEnv() : { ...process.env, STATIC_EXPORT: "true", NEXT_PUBLIC_STATIC_EXPORT: "true" },
    shell: process.platform === "win32",
  });
  status = result.status ?? 1;
} finally {
  restore();
}
if (status === 0 && native) {
  // iOS "Add to Home Screen" launch images are for the website only (~2 MB); the apps use native splash screens.
  rmSync(path.join(root, "out", "splash"), { recursive: true, force: true });
  console.log("Mobile web bundle ready in ./out (base path: none). Next: npx cap sync");
}
process.exit(status);

function nativeEnv() {
  const env = { ...process.env, STATIC_EXPORT: "true", NEXT_PUBLIC_STATIC_EXPORT: "true", NEXT_PUBLIC_APP_TARGET: "native" };
  // Never inherit the GitHub Pages sub-path: the app bundle lives at the root.
  delete env.GITHUB_PAGES;
  delete env.PAGES_BASE_PATH;
  env.NEXT_PUBLIC_BASE_PATH = "";
  return env;
}
