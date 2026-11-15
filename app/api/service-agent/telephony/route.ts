import { NextResponse } from "next/server";
import { webhookSecret } from "@/lib/service-agent/config";
import { openSession } from "@/lib/service-agent/session";
import {
  findCallByExternalId,
  finishCall,
  startCall,
} from "@/lib/service-agent/store";
import type { CallPurpose, TranscriptTurn } from "@/lib/service-agent/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/service-agent/telephony — call lifecycle events from the voice
 * platform.
 *
 * Only the log lives here: what the agent decided during the call was already
 * written by the tools while the call was happening (/api/service-agent/voice),
 * so an event that never arrives loses the transcript, not the booking.
 *
 * The payload shape differs per platform, so every field is read defensively
 * and an unknown event is accepted and ignored -- a webhook that 500s gets
 * retried for hours and tells us nothing new.
 */

type Json = Record<string, unknown>;

function authorized(request: Request): boolean {
  const secret = webhookSecret();
  if (!secret) return false;
  const header =
    request.headers.get("x-service-agent-secret") ??
    request.headers.get("x-vapi-secret");
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  return header === secret || bearer === secret;
}

function asObject(value: unknown): Json | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : null;
}

function str(source: Json | null, ...keys: string[]): string | null {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

/** Normalises whatever the platform calls a transcript into our turns. */
function readTranscript(message: Json | null): TranscriptTurn[] {
  if (!message) return [];

  const artifact = asObject(message.artifact);
  const candidates = [message.messages, artifact?.messages, message.transcript];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const turns = candidate.flatMap((entry) => {
        const row = asObject(entry);
        if (!row) return [];
        const text = str(row, "message", "content", "text", "transcript");
        if (!text) return [];
        const role = str(row, "role") ?? "";
        if (role === "system") return [];
        return [
          {
            role: role === "assistant" || role === "bot" ? "agent" : "customer",
            text,
            ...(str(row, "time", "timestamp", "at")
              ? { at: str(row, "time", "timestamp", "at") as string }
              : {}),
          } as TranscriptTurn,
        ];
      });
      if (turns.length > 0) return turns;
    }

    // Some platforms send the whole call as one plain-text transcript.
    if (typeof candidate === "string" && candidate.trim()) {
      return [{ role: "customer", text: candidate.slice(0, 20000) }];
    }
  }

  return [];
}

const ENDED_STATUSES = new Set([
  "ended",
  "completed",
  "forwarded",
  "customer-ended-call",
  "hangup",
]);

const FAILED_STATUSES = new Set(["failed", "error", "busy", "rejected"]);
const NO_ANSWER_STATUSES = new Set(["no-answer", "no_answer", "timeout", "voicemail"]);

function mapStatus(
  raw: string | null,
  endedReason: string | null
): "completed" | "failed" | "no_answer" | null {
  const value = (raw ?? "").toLowerCase();
  const reason = (endedReason ?? "").toLowerCase();

  if (NO_ANSWER_STATUSES.has(value) || NO_ANSWER_STATUSES.has(reason)) {
    return "no_answer";
  }
  if (FAILED_STATUSES.has(value) || FAILED_STATUSES.has(reason)) return "failed";
  if (ENDED_STATUSES.has(value) || value === "end-of-call-report") return "completed";
  return null;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Json | null;
  if (!body) return NextResponse.json({ ok: true });

  const message = asObject(body.message) ?? body;
  const call = asObject(message.call) ?? asObject(body.call);
  const metadata =
    asObject(asObject(call?.assistantOverrides)?.metadata) ??
    asObject(call?.metadata) ??
    asObject(message.metadata) ??
    {};

  const externalId = str(call, "id") ?? str(message, "callId", "call_id");
  const eventType = str(message, "type", "event") ?? "";
  const status = mapStatus(
    str(message, "status") ?? eventType,
    str(message, "endedReason", "ended_reason", "reason")
  );

  // Nothing to close yet (a status-update mid-call, a transcript fragment):
  // accepted and dropped, the voice endpoint is doing the work.
  if (!status || !externalId) {
    return NextResponse.json({ ok: true, ignored: eventType || "unknown" });
  }

  try {
    const { session } = await openSession({
      shopRef: str(metadata, "shopId"),
      channel: "voice",
      phone: str(asObject(call?.customer), "number") ?? str(metadata, "phone"),
    });

    const transcript = readTranscript(message);
    const summary = str(message, "summary", "analysis");

    const existing = await findCallByExternalId(session.shop, externalId);
    const callId =
      existing?.id ??
      (await startCall({
        shop: session.shop,
        direction: "inbound",
        purpose: (str(metadata, "purpose") as CallPurpose) ?? "inbound",
        phone: str(asObject(call?.customer), "number") ?? "",
        externalId,
        customerId: session.customer?.id ?? null,
      }));

    if (!callId) {
      // No shop row to log against; the call still happened, we just cannot
      // file it. Said once, in the log, not as an error to the platform.
      console.warn("[service-agent/telephony] nowhere to log call", externalId);
      return NextResponse.json({ ok: true, logged: false });
    }

    await finishCall(callId, {
      status,
      outcome: str(message, "endedReason", "ended_reason"),
      summary,
      transcript: transcript.length > 0 ? transcript : undefined,
      customerId: session.customer?.id ?? null,
    });

    return NextResponse.json({ ok: true, logged: true });
  } catch (error) {
    console.error("[service-agent/telephony]", error);
    // Still 200: a retry storm would not fix a bug on our side.
    return NextResponse.json({ ok: true, logged: false });
  }
}
