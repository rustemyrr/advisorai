export function getClientIp(request: Request): string {
  // Vercel overwrites this on its edge with the true connecting IP — it
  // cannot be spoofed by a client-supplied header, unlike x-forwarded-for.
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    return vercelForwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Fallback for non-Vercel environments: take the last hop, since proxies
  // append to x-forwarded-for while a client's own spoofed value would be first.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    return parts[parts.length - 1] || "unknown";
  }

  return "unknown";
}
