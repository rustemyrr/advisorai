import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/supabase-server";
import { runAgentTurn } from "@/lib/service-agent/agent";
import { webhookSecret } from "@/lib/service-agent/config";
import { openSession } from "@/lib/service-agent/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/service-agent/chat — one turn of the conversation, as text.
 *
 * This is the same agent the phone line talks to; the channel is the only
 * difference. It exists so the whole thing can be exercised -- booking,
 * rescheduling, warranty answers -- without a telephony account, and so a chat
 * widget on the shop site can reuse it later.
 *
 * Not public: it spends our Anthropic key, so a caller must either be a signed
 * in AdvisorAI user (the shop owner, whose own data this is) or hold the
 * webhook secret. An anonymous visitor gets 401, deliberately.
 */

const MAX_MESSAGE_LENGTH = 1500;
const MAX_HISTORY_TURNS = 20;

type IncomingTurn = { role: "customer" | "agent"; text: string };

function toMessages(history: IncomingTurn[]): Anthropic.MessageParam[] {
  return history
    .filter((turn) => typeof turn?.text === "string" && turn.text.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({
      role: turn.role === "agent" ? ("assistant" as const) : ("user" as const),
      content: turn.text.slice(0, MAX_MESSAGE_LENGTH),
    }));
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

  const body = (await request.json().catch(() => null)) as
    | {
        message?: unknown;
        history?: unknown;
        phone?: unknown;
        shopRef?: unknown;
        appointmentId?: unknown;
      }
    | null;

  if (!body || typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const history = Array.isArray(body.history)
    ? toMessages(body.history as IncomingTurn[])
    : [];

  try {
    const { session, context } = await openSession({
      // A signed-in user may only ever reach their own shop; a secret-holding
      // caller (the telephony integration, a test script) names it.
      shopRef: user?.id ?? (typeof body.shopRef === "string" ? body.shopRef : null),
      channel: "chat",
      purpose: "inbound",
      phone: typeof body.phone === "string" ? body.phone : null,
      appointmentId:
        typeof body.appointmentId === "string" ? body.appointmentId : null,
    });

    const turn = await runAgentTurn(
      session,
      history,
      body.message.slice(0, MAX_MESSAGE_LENGTH)
    );

    return NextResponse.json({
      reply: turn.reply,
      toolsUsed: turn.toolsUsed,
      outcome: session.outcome,
      shop: { name: context.shop.name, timezone: context.shop.timezone },
      customerKnown: Boolean(session.customer),
    });
  } catch (error) {
    console.error("[service-agent/chat]", error);
    return NextResponse.json({ error: "Agent failed" }, { status: 500 });
  }
}
