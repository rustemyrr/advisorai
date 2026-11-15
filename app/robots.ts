import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// /robots.txt — was a 404 until 2026-11-15.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing under /api is a page, and some of it costs money to call.
      disallow: "/api/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
