import { paddleConfig } from "./paddle-config";

/**
 * Authenticated customer portal links from Paddle.
 *
 * Until this existed there was no way for a subscriber to cancel: the site has
 * no account screen, and the FAQ, the terms and the refund policy all pointed
 * at settings that were never built. Paddle hosts the portal itself; we only
 * ask it for a signed link.
 *
 * POST /customers/{customer_id}/portal-sessions
 * https://developer.paddle.com/api-reference/customer-portals/create-customer-portal-session/
 *
 * The API key needs the "customer_portal_session.write" permission, and the
 * links carry a short-lived token, so they are handed to the browser and never
 * stored or logged.
 */

const LIVE_API_BASE = "https://api.paddle.com";
const SANDBOX_API_BASE = "https://sandbox-api.paddle.com";
const PADDLE_TIMEOUT_MS = 8000;

export function paddleApiBase(): string {
  return paddleConfig.sandbox ? SANDBOX_API_BASE : LIVE_API_BASE;
}

export type PortalLinks = {
  /** The portal homepage. Always present. */
  overview: string;
  /** Opens the cancellation form. Null when no subscription was requested. */
  cancelSubscription: string | null;
  /** Opens the payment-method form. */
  updatePaymentMethod: string | null;
};

type PortalSessionResponse = {
  data?: {
    urls?: {
      general?: { overview?: string };
      subscriptions?: Array<{
        id: string;
        cancel_subscription?: string;
        update_subscription_payment_method?: string;
      }>;
    };
  };
};

export async function createPortalSession(
  customerId: string,
  subscriptionId: string | null
): Promise<PortalLinks | null> {
  if (!paddleConfig.apiKey) {
    console.error("[paddle portal] PADDLE_API_KEY is not set");
    return null;
  }

  let res: Response;
  try {
    res = await fetch(`${paddleApiBase()}/customers/${customerId}/portal-sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paddleConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        subscriptionId ? { subscription_ids: [subscriptionId] } : {}
      ),
      signal: AbortSignal.timeout(PADDLE_TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[paddle portal] request failed:", err);
    return null;
  }

  if (!res.ok) {
    // The body names the reason (a key without the portal permission, an
    // unknown customer, the wrong environment) and holds no portal token.
    console.error("[paddle portal] Paddle replied", res.status, await res.text());
    return null;
  }

  const body = (await res.json()) as PortalSessionResponse;
  const overview = body.data?.urls?.general?.overview;
  if (!overview) {
    console.error("[paddle portal] no overview link in Paddle's response");
    return null;
  }

  const forSubscription = body.data?.urls?.subscriptions?.find(
    (s) => s.id === subscriptionId
  );

  return {
    overview,
    cancelSubscription: forSubscription?.cancel_subscription ?? null,
    updatePaymentMethod: forSubscription?.update_subscription_payment_method ?? null,
  };
}
