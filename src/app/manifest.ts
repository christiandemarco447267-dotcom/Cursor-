import type { MetadataRoute } from "next";
import { assetPath } from "@/lib/asset";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: assetPath("/app"),
    scope: assetPath("/"),
    display: "standalone",
    background_color: "#070a1c",
    theme_color: "#070a1c",
    icons: [
      { src: assetPath("/icon.png"), sizes: "256x256", type: "image/png", purpose: "any" },
    ],
  };
}
