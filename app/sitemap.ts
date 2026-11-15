import type { MetadataRoute } from "next";
import { siteUrl, sitemapPaths } from "@/lib/site";

// /sitemap.xml — was a 404 until 2026-11-15.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return sitemapPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/agents" ? 0.8 : 0.3,
  }));
}
