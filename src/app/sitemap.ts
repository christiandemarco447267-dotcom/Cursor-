import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

// The Pages build uses `trailingSlash: true`, so canonical URLs end in "/" there.
const TRAILING = process.env.GITHUB_PAGES === "true";

const ROUTES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "monthly" },
  { path: "/app", priority: 0.9, changeFrequency: "weekly" },
  { path: "/app/portfolio", priority: 0.7, changeFrequency: "weekly" },
  { path: "/app/trade", priority: 0.7, changeFrequency: "weekly" },
  { path: "/app/markets", priority: 0.7, changeFrequency: "weekly" },
  { path: "/app/watchlist", priority: 0.6, changeFrequency: "weekly" },
  { path: "/app/allocate", priority: 0.6, changeFrequency: "weekly" },
  { path: "/app/thesis", priority: 0.6, changeFrequency: "weekly" },
  { path: "/app/insights", priority: 0.6, changeFrequency: "weekly" },
  { path: "/app/time-machine", priority: 0.6, changeFrequency: "monthly" },
  { path: "/app/coach", priority: 0.5, changeFrequency: "weekly" },
  { path: "/app/legends", priority: 0.5, changeFrequency: "monthly" },
  { path: "/app/leagues", priority: 0.4, changeFrequency: "weekly" },
  { path: "/app/settings", priority: 0.4, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date().toISOString();
  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: siteUrl(path === "/" || !TRAILING ? path : `${path}/`),
    lastModified,
    changeFrequency,
    priority,
  }));
}
