import { NextResponse } from "next/server";
import { verifyPaddleSignature } from "@/lib/paddle-webhook";
import { isPaddleWebhookConfigured, paddleConfig } from "@/lib/paddle-config";
import { planForPriceId } from "@/lib/paddle-plans";
import { createAdminClient } from "@/lib/supabase-server";

type PaddleSubscriptionPayload = {
  id: string;
  customer_id: string;
  status: string;
  custom_data?: { user_id?: string } | null;
  items?: Array<{
    price?: { id?: string };
  }>;
};

type PaddleWebhookEvent = {
  event_id: string;
  event_type: string;
  data: PaddleSubscriptionPayload;
};

async function setProfilePlan(
  userId: string,
  plan: string,
  paddleSubscriptionId: string,
  paddleCustomerId: string
) {
  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .upsert(
      {
        id: userId,
        plan,
        paddle_subscription_id: paddleSubscriptionId,
        paddle_customer_id: paddleCustomerId,
      },
      { onConflict: "id" }
    );
  if (error) {
    console.error("[paddle] failed to update profile plan:", error.message);
    throw error;
  }
}

/** Subscriptions created without custom_data (e.g. old checkouts) fall back to a lookup by subscription id. */
async function findUserIdBySubscription(paddleSubscriptionId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("paddle_subscription_id", paddleSubscriptionId)
    .single();
  return (data as { id: string } | null)?.id ?? null;
}

export async function POST(request: Request) {
  if (!isPaddleWebhookConfigured()) {
    return NextResponse.json(
      { error: "Paddle webhook secret not configured" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const isValid = verifyPaddleSignature(
    rawBody,
    signature,
    paddleConfig.webhookSecret
  );

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: PaddleWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaddleWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subscription = event.data;
  const priceId = subscription.items?.[0]?.price?.id;

  try {
    switch (event.event_type) {
      case "subscription.activated":
      case "subscription.updated": {
        const plan = planForPriceId(priceId);
        if (!plan) {
          console.error("[paddle] unknown price_id in webhook:", priceId);
          break;
        }
        const userId =
          subscription.custom_data?.user_id ??
          (await findUserIdBySubscription(subscription.id));
        if (!userId) {
          console.error(
            "[paddle] no user_id (custom_data or lookup) for subscription:",
            subscription.id
          );
          break;
        }
        const targetPlan = subscription.status === "canceled" ? "starter" : plan;
        await setProfilePlan(userId, targetPlan, subscription.id, subscription.customer_id);
        break;
      }

      case "subscription.canceled": {
        const userId =
          subscription.custom_data?.user_id ??
          (await findUserIdBySubscription(subscription.id));
        if (!userId) {
          console.error(
            "[paddle] no user_id (custom_data or lookup) for canceled subscription:",
            subscription.id
          );
          break;
        }
        await setProfilePlan(userId, "starter", subscription.id, subscription.customer_id);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[paddle] webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
