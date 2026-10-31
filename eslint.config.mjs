import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Cloudflare Worker has its own toolchain (worker/package.json).
    "worker/node_modules/**",
    "worker/.wrangler/**",
    // Generated native projects (Capacitor) and their copied web bundle.
    "android/**",
    "ios/**",
  ]),
]);

export default eslintConfig;
