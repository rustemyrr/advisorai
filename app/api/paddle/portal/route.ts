import { NextResponse } from "next/server";
import { getUserFromToken, createAdminClient } from "@/lib/supabase-server";
import { createPortalSession } from "@/lib/paddle-portal";

export const dynamic = "force-dynamic";

/**
 * POST /api/paddle/portal — a signed link into this customer's Paddle portal,
 * where they can see the subscription, change the card and cancel.
 *
 * POST rather than GET because it creates a session at Paddle, and the link it
 * returns is single-use and short-lived, so it must not be cached anywhere.
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("profiles")
    .select("paddle_customer_id, paddle_subscription_id")
    .eq("id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[paddle portal] profile lookup failed:", error.message);
    return NextResponse.json({ error: "Could not open the billing portal" }, { status: 500 });
  }

  const profile = data as
    | { paddle_customer_id: string | null; paddle_subscription_id: string | null }
    | null;

  // Nobody who never bought anything has a portal to open.
  if (!profile?.paddle_customer_id) {
    return NextResponse.json({ error: "No subscription on this account" }, { status: 404 });
  }

  const links = await createPortalSession(
    profile.paddle_customer_id,
    profile.paddle_subscription_id
  );

  if (!links) {
    return NextResponse.json({ error: "Could not open the billing portal" }, { status: 502 });
  }

  // Prefer the cancellation form when there is a subscription to cancel: that
  // is what someone clicking "manage subscription" is usually after, and the
  // portal page it opens still shows everything else.
  return NextResponse.json({
    url: links.cancelSubscription ?? links.overview,
    overview: links.overview,
  });
}
