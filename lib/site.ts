/**
 * Canonical origin of the site, used by metadata, robots.txt and the sitemap.
 *
 * Vercel sets NEXT_PUBLIC_SITE_URL for nothing automatically, so the production
 * domain is the default and a preview deployment can override it.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://advisorai.help"
).replace(/\/$/, "");

/** Every page that should be in the sitemap, newest-first in importance. */
export const sitemapPaths = [
  "/",
  "/service-agent",
  "/service-advisor",
  "/director-assistant",
  "/terms",
  "/privacy",
  "/refund",
] as const;
