export const paddleConfig = {
  clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "",
  priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID ?? "",
  sandbox:
    process.env.NEXT_PUBLIC_PADDLE_SANDBOX !== "false" &&
    process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT !== "production",
  apiKey: process.env.PADDLE_API_KEY ?? "",
  /** Notification destination secret (Paddle dashboard > Developer tools > Notifications). */
  webhookSecret: process.env.PADDLE_WEBHOOK_SECRET ?? "",
};

export function isPaddleCheckoutConfigured() {
  return Boolean(paddleConfig.clientToken && paddleConfig.priceId);
}

export function isPaddleWebhookConfigured() {
  return Boolean(paddleConfig.webhookSecret);
}
