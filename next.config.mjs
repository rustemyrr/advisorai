// The one origin Supabase auth and the REST calls talk to. Falling back to the
// wildcard keeps the policy valid on a checkout that has no env file.
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://*.supabase.co";

// Reported, not enforced, on purpose. A wrong script-src or frame-src here
// breaks the Paddle checkout, and the checkout cannot be exercised without a
// real account and a real card. So the policy ships in report-only first:
// violations show up in the browser console during a real purchase, and once a
// checkout has been walked through with a clean console this moves to
// "Content-Security-Policy".
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  // 'unsafe-inline' is what Next's own bootstrap and hydration scripts need
  // without a nonce, which would make every page dynamic.
  "script-src 'self' 'unsafe-inline' https://cdn.paddle.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace("https://", "wss://")} https://*.paddle.com`,
  "frame-src 'self' https://*.paddle.com https://pay.google.com",
  "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict-Transport-Security is already added by Vercel on advisorai.help.
  // Note there is deliberately no Permissions-Policy entry for `payment`:
  // the default is 'self', which is what lets Paddle's checkout iframe ask for
  // Apple Pay and Google Pay. Naming it wrongly would silently kill them.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
  env: {
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN:
      process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "",
    NEXT_PUBLIC_PADDLE_PRICE_ID:
      process.env.NEXT_PUBLIC_PADDLE_PRICE_ID ?? "",
    NEXT_PUBLIC_PADDLE_SANDBOX: process.env.NEXT_PUBLIC_PADDLE_SANDBOX ?? "true",
  },
};

export default nextConfig;
