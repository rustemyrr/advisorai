export type PlanName = "starter" | "standard" | "professional";

const PLAN_PRICE_ENV_KEYS: Record<PlanName, string> = {
  starter: "NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER",
  standard: "NEXT_PUBLIC_PADDLE_PRICE_ID",
  professional: "NEXT_PUBLIC_PADDLE_PRICE_ID_PROFESSIONAL",
};

/** Maps a Paddle price ID (from a webhook payload) back to our plan name. */
export function planForPriceId(priceId: string | undefined): PlanName | null {
  if (!priceId) return null;
  for (const [plan, envKey] of Object.entries(PLAN_PRICE_ENV_KEYS) as Array<
    [PlanName, string]
  >) {
    if (process.env[envKey] && process.env[envKey] === priceId) return plan;
  }
  return null;
}
