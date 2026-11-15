import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/supabase-server";
import { cronSecret, webhookSecret } from "@/lib/service-agent/config";
import { runReminders } from "@/lib/service-agent/reminders";
import { describeTelephony } from "@/lib/service-agent/telephony";
import type { ReminderKind } from "@/lib/service-agent/types";

export const dynamic = "force-dynamic";

/**
 * Reminder run: who is due for a service, whose warranty is about to end, and
 * who has not confirmed tomorrow.
 *
 * GET  is the scheduled entry point (vercel.json, once a morning). Vercel sends
 *      `Authorization: Bearer $CRON_SECRET`, which is what authorises it.
 * POST is the manual one, for the shop owner (their Supabase token) or an
 *      integration holding the webhook secret, and it can run one kind only --
 *      useful when testing without ringing every customer at once.
 *
 * Safe to run twice: every reminder is claimed under a unique key before a call
 * is placed (lib/service-agent/reminders.ts).
 */

/** Calls are placed one after another; this keeps a run inside the function limit. */
export const maxDuration = 60;

const VALID_KINDS: ReminderKind[] = ["maintenance", "warranty", "confirmation"];

function cronAuthorized(request: Request): boolean {
  const secret = cronSecret();
  if (!secret) return false;
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  return bearer === secret;
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shopRef = new URL(request.url).searchParams.get("shop");
  const result = await runReminders({ shopRef });
  console.log("[service-agent/reminders] cron run:", JSON.stringify(result));
  return NextResponse.json({ ...result, telephony: describeTelephony() });
}

export async function POST(request: Request) {
  const secret = webhookSecret();
  const presented = request.headers.get("x-service-agent-secret");
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;

  const bySecret = Boolean(secret && presented === secret);
  const user = bySecret ? null : await getUserFromToken(token);
  if (!bySecret && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    kinds?: unknown;
    shopRef?: unknown;
  };

  const kinds = Array.isArray(body.kinds)
    ? (body.kinds.filter((kind): kind is ReminderKind =>
        VALID_KINDS.includes(kind as ReminderKind)
      ) as ReminderKind[])
    : undefined;

  const result = await runReminders({
    shopRef: user?.id ?? (typeof body.shopRef === "string" ? body.shopRef : null),
    kinds: kinds && kinds.length > 0 ? kinds : undefined,
  });

  return NextResponse.json({ ...result, telephony: describeTelephony() });
}
