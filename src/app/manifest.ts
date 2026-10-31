import type { MetadataRoute } from "next";
import { assetPath } from "@/lib/asset";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/site";

export const dynamic = "force-static";

const ANY_SIZES = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512];

/** Web app manifest. Every URL is base-path aware, so it is correct under /Cursor- (GitHub Pages) and at the root. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: assetPath("/app/"),
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "en-US",
    dir: "ltr",
    start_url: assetPath("/app/"),
    scope: assetPath("/"),
    display: "standalone",
    orientation: "portrait",
    background_color: "#070a1c",
    theme_color: "#070a1c",
    categories: ["finance", "education"],
    icons: [
      ...ANY_SIZES.map((s) => ({ src: assetPath(`/icons/icon-${s}.png`), sizes: `${s}x${s}`, type: "image/png", purpose: "any" as const })),
      { src: assetPath("/icons/maskable-192.png"), sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: assetPath("/icons/maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Trade", url: assetPath("/app/trade/"), icons: [{ src: assetPath("/icons/icon-96.png"), sizes: "96x96" }] },
      { name: "Portfolio", url: assetPath("/app/portfolio/"), icons: [{ src: assetPath("/icons/icon-96.png"), sizes: "96x96" }] },
    ],
  };
}
