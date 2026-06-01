import { NextResponse } from "next/server";
import { verifyPaddleSignature } from "@/lib/paddle-webhook";
import { isPaddleWebhookConfigured, paddleConfig } from "@/lib/paddle-config";
import { upsertSubscription } from "@/lib/subscription-store";

type PaddleSubscriptionPayload = {
  id: string;
  customer_id: string;
  status: string;
  items?: Array<{
    price?: { id?: string };
  }>;
};

type PaddleWebhookEvent = {
  event_id: string;
  event_type: string;
  data: PaddleSubscriptionPayload;
};

export async function POST(request: Request) {
  if (!isPaddleWebhookConfigured()) {
    return NextResponse.json(
      { error: "Paddle API key not configured" },
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
        await upsertSubscription({
          paddleSubscriptionId: subscription.id,
          customerId: subscription.customer_id,
          status: "active",
          priceId,
        });
        break;

      case "subscription.canceled":
        await upsertSubscription({
          paddleSubscriptionId: subscription.id,
          customerId: subscription.customer_id,
          status: "canceled",
          priceId,
        });
        break;

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
