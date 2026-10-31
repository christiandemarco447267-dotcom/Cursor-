/* Sentia service worker: offline fallback page + app-shell caching for the website / PWA.
 *
 * - Works under any base path (GitHub Pages "/Cursor-/" or the domain root): everything is
 *   resolved against this worker's own scope.
 * - Pages (navigations): network first, then the cached copy of that page, then offline.html.
 * - Hashed build files (/_next/static/…): cache first (their URL changes whenever they change).
 * - Other static files (icons, images, manifest): served from cache, refreshed in the background
 *   (stale-while-revalidate), so an updated icon or manifest is picked up on the next visit.
 * - NEVER cached: anything on another origin (the Sentia API: quotes, AI coach, feedback,
 *   usage counts), anything under /api/, non-GET requests, and RSC/data requests with a query.
 *   Those always go straight to the network.
 * - Not registered in the native (Capacitor) app, which already ships every file on the device.
 */
const VERSION = "v2";
const SHELL_CACHE = `sentia-shell-${VERSION}`;
const ASSET_CACHE = `sentia-assets-${VERSION}`;
const SCOPE = new URL(self.registration ? self.registration.scope : "./", self.location.href);
const OFFLINE_URL = new URL("offline.html", SCOPE).href;
const SHELL_URLS = ["", "app/", "offline.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"].map(
  (p) => new URL(p, SCOPE).href,
);

/**
 * Decide how to handle a request. Pure and exported for unit tests (src/lib/service-worker.test.ts).
 * @param {{ url: string, method: string, mode?: string, destination?: string }} req
 * @param {string} scope absolute scope URL, ending in "/"
 * @returns {"page" | "asset" | "bypass"}
 */
function classifyRequest(req, scope) {
  if (req.method !== "GET") return "bypass";
  let url;
  let base;
  try {
    url = new URL(req.url);
    base = new URL(scope);
  } catch {
    return "bypass";
  }
  if (url.origin !== base.origin) return "bypass"; // Sentia API, fonts CDN, GitHub…
  if (!url.pathname.startsWith(base.pathname)) return "bypass";
  const rel = url.pathname.slice(base.pathname.length);
  if (rel === "api" || rel.startsWith("api/")) return "bypass";
  if (rel === "sw.js") return "bypass";
  if (req.mode === "navigate") return "page";
  if (rel.startsWith("_next/static/")) return "asset";
  if (url.search) return "bypass"; // RSC payloads (?_rsc=…) and anything parameterised stay live
  if (/\.(?:png|jpe?g|webp|svg|ico|gif|woff2?|css|js|webmanifest)$/i.test(rel)) return "asset";
  return "bypass";
}

if (typeof module !== "undefined") module.exports = { classifyRequest };

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => Promise.all(SHELL_URLS.map((u) => cache.add(u).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n.startsWith("sentia-") && n !== SHELL_CACHE && n !== ASSET_CACHE).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const kind = classifyRequest({ url: req.url, method: req.method, mode: req.mode, destination: req.destination }, SCOPE.href);
  if (kind === "page") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() =>
          caches
            .match(req, { ignoreSearch: true })
            .then((hit) => hit || caches.match(OFFLINE_URL))
            .then((hit) => hit || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })),
        ),
    );
  } else if (kind === "asset") {
    const hashed = new URL(req.url).pathname.includes("/_next/static/");
    const refresh = () =>
      fetch(req).then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(ASSET_CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
        }
        return res;
      });
    event.respondWith(
      caches.match(req).then((hit) => {
        if (!hit) return refresh();
        if (!hashed) event.waitUntil(refresh().catch(() => undefined)); // stale-while-revalidate
        return hit;
      }),
    );
  }
  // "bypass": let the browser handle it (no respondWith) — never cached.
});
