// Where the app is running: the website (GitHub Pages / any static host / Next server)
// or the Capacitor native shell (Android / iOS). The mobile build sets
// NEXT_PUBLIC_APP_TARGET=native (see scripts/build-mobile.mjs); everything else is "web".
//
// Pure helpers here are unit-tested; the Capacitor calls live in components/native-bridge.tsx.

export type AppTarget = "web" | "native";

export const APP_TARGET: AppTarget = process.env.NEXT_PUBLIC_APP_TARGET === "native" ? "native" : "web";

/** True in the app-store build (also true when that bundle is opened in a desktop browser for testing). */
export function isNativeBuild(): boolean {
  return APP_TARGET === "native";
}

/** True only inside the real Capacitor shell (Android/iOS WebView). */
export function isNativeRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try {
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
}

/** Origins the Capacitor WebView serves the app from (kept in sync with worker/src/http.ts). */
export const NATIVE_APP_ORIGINS = ["capacitor://localhost", "https://localhost", "http://localhost"] as const;

/**
 * Should a link leave the app and open in the system browser / mail app?
 * - mailto:, tel:, sms: always open externally.
 * - http(s) links to another origin open externally (GitHub issues, Legends sources, …).
 * - Same-origin links and in-page fragments stay inside the app.
 * Anything unparseable or using another scheme (javascript:, data:, blob:) is NOT treated as external.
 */
export function isExternalHref(href: string | null | undefined, appOrigin: string): boolean {
  if (!href) return false;
  const value = href.trim();
  if (!value || value.startsWith("#")) return false;
  if (/^(mailto|tel|sms):/i.test(value)) return true;
  let url: URL;
  try {
    url = new URL(value, appOrigin);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return url.origin !== appOrigin;
}

/** What the Android hardware back button should do. */
export type BackAction = "close-overlay" | "history-back" | "go-home" | "exit";

export function decideBackAction(opts: { overlayOpen: boolean; canGoBack: boolean; path: string }): BackAction {
  if (opts.overlayOpen) return "close-overlay";
  const path = opts.path.replace(/\/+$/, "") || "/";
  // At the app's home screen there is nothing to go back to: leave the app (Android convention).
  if (path === "/app" || path === "/") return "exit";
  if (opts.canGoBack) return "history-back";
  return "go-home";
}
