#!/usr/bin/env node
// Static export build for Firebase Hosting (`npm run build:firebase` → ./out).
//
// `output: "export"` can't include the server-only API routes (/api/market,
// /api/health — they read the request / are force-dynamic) or the proxy
// (security headers; firebase.json sets those instead). The app is client-first,
// so we move them aside for this build only and always restore them.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
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
    env: { ...process.env, STATIC_EXPORT: "true", NEXT_PUBLIC_STATIC_EXPORT: "true" },
    shell: process.platform === "win32",
  });
  status = result.status ?? 1;
} finally {
  restore();
}
process.exit(status);
