"use client";

import { useEffect } from "react";
import { assetPath } from "@/lib/asset";
import { decideBackAction, isExternalHref, isNativeBuild, isNativeRuntime } from "@/lib/platform";

/**
 * Glue between the web app and its two "shells":
 * - Website / PWA: registers the offline service worker (public/sw.js) in production.
 * - Capacitor app (Android / iOS): dark status bar, keyboard behaviour, Android back button,
 *   external links (GitHub, mailto, sources) in the system browser / mail app, splash hide,
 *   and starting on the app instead of the marketing page.
 * Renders nothing. Every native call is wrapped so a missing plugin can never break the page.
 */
export function NativeBridge() {
  useEffect(() => {
    if (isNativeRuntime()) {
      document.documentElement.classList.add("is-native");
      const cleanup = setupNative();
      return () => {
        void cleanup.then((fn) => fn());
      };
    }
    if (isNativeBuild()) return; // native bundle opened in a desktop browser for testing: no SW
    registerServiceWorker();
    return undefined;
  }, []);
  return null;
}

function registerServiceWorker() {
  if (process.env.NODE_ENV !== "production") return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const register = () => {
    navigator.serviceWorker.register(assetPath("/sw.js"), { scope: assetPath("/") }).catch(() => undefined);
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

/** Open a URL outside the app: http(s) in the in-app system browser sheet, mailto/tel via the OS. */
export async function openExternal(href: string) {
  if (/^https?:/i.test(href)) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: href, presentationStyle: "popover", toolbarColor: "#070a1c" });
      return;
    } catch {
      // fall through
    }
    window.open(href, "_blank", "noopener");
    return;
  }
  // mailto:/tel:/sms: — the WebView hands these to the OS (Mail, Phone, Messages).
  window.location.href = href;
}

function overlayOpen(): boolean {
  return Boolean(document.querySelector(".modal-overlay, .drawer.open, [role='dialog'][aria-modal='true']"));
}

function closeTopOverlay() {
  // Every sheet, modal and the nav drawer already closes on Escape.
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
}

async function setupNative(): Promise<() => void> {
  const disposers: Array<() => void> = [];

  // Start on the app itself, not the marketing landing page.
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/index.html") window.location.replace(`${assetPath("/app/")}`);

  // External links → system browser / mail app (never navigate the app's WebView away).
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!isExternalHref(href, window.location.origin)) return;
    event.preventDefault();
    void openExternal(anchor.href || (href as string));
  };
  document.addEventListener("click", onClick, true);
  disposers.push(() => document.removeEventListener("click", onClick, true));

  // window.open(...) from feature code (e.g. the feedback fallback) → same treatment.
  const originalOpen = window.open.bind(window);
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    const href = url ? String(url) : "";
    if (isExternalHref(href, window.location.origin)) {
      void openExternal(new URL(href, window.location.href).href);
      return null;
    }
    return originalOpen(url, target, features);
  }) as typeof window.open;
  disposers.push(() => {
    window.open = originalOpen;
  });

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark }); // light text for the dark theme
    await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined); // content draws under it; CSS pads with safe-area insets
    await StatusBar.setBackgroundColor({ color: "#00000000" }).catch(() => undefined); // Android only
  } catch {
    // plugin missing: ignore
  }

  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    await Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => undefined); // iOS only
    const show = await Keyboard.addListener("keyboardDidShow", () => {
      document.documentElement.classList.add("keyboard-open");
      // Keep the focused field visible above the keyboard (forms in sheets don't move on their own).
      const el = document.activeElement as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) el.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    const hide = await Keyboard.addListener("keyboardWillHide", () => document.documentElement.classList.remove("keyboard-open"));
    disposers.push(() => void show.remove(), () => void hide.remove());
  } catch {
    // ignore
  }

  try {
    const { App } = await import("@capacitor/app");
    const back = await App.addListener("backButton", ({ canGoBack }) => {
      const action = decideBackAction({ overlayOpen: overlayOpen(), canGoBack, path: window.location.pathname });
      if (action === "close-overlay") closeTopOverlay();
      else if (action === "history-back") window.history.back();
      else if (action === "go-home") window.location.assign(assetPath("/app/"));
      else void App.exitApp();
    });
    disposers.push(() => void back.remove());
  } catch {
    // ignore
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {
    // ignore
  }

  return () => disposers.forEach((d) => d());
}
