import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { runAgentTurn } from "@/lib/service-agent/agent";
import { agentModel, webhookSecret } from "@/lib/service-agent/config";
import { openSession } from "@/lib/service-agent/session";
import type { CallPurpose } from "@/lib/service-agent/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/service-agent/voice — the brain of the phone line.
 *
 * Shaped as an OpenAI-compatible /chat/completions endpoint, because that is
 * the one interface every voice platform (Vapi, Retell, LiveKit, Twilio
 * ConversationRelay and the rest) can be pointed at as a "custom LLM". The
 * platform owns the hard real-time parts -- SIP, speech to text, text to
 * speech, barge-in -- and asks this endpoint what to say next. Claude, the
 * tools and the booking rules stay here, so switching platform is a URL
 * change, and the shop can keep whatever IP telephony it already pays for as
 * long as the platform can take its SIP trunk.
 *
 * It streams a single chunk rather than per-token deltas: the tool loop has to
 * finish before there is a sentence worth speaking, so the saved milliseconds
 * are imaginary and the code that is not there cannot break mid-call.
 */

type IncomingMessage = { role?: unknown; content?: unknown };

type VoiceRequest = {
  messages?: IncomingMessage[];
  stream?: boolean;
  model?: string;
  call?: {
    id?: string;
    customer?: { number?: string };
    metadata?: Record<string, unknown>;
    assistantOverrides?: { metadata?: Record<string, unknown> };
  };
  customer?: { number?: string };
  metadata?: Record<string, unknown>;
  phone?: string;
};

const MAX_HISTORY_TURNS = 24;
const MAX_TEXT_LENGTH = 2000;

function authorized(request: Request): boolean {
  const secret = webhookSecret();
  // With no secret configured the endpoint stays closed rather than open: it
  // spends the Anthropic key and can write bookings.
  if (!secret) return false;
  const header = request.headers.get("x-service-agent-secret");
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  return header === secret || bearer === secret;
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  // OpenAI-style content arrays: [{type:"text", text:"..."}]
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string"
          ? (part as { text: string }).text
          : ""
      )
      .join(" ")
      .trim();
  }
  return "";
}

function metadataOf(body: VoiceRequest): Record<string, unknown> {
  return (
    body.call?.assistantOverrides?.metadata ??
    body.call?.metadata ??
    body.metadata ??
    {}
  );
}

function str(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function sseChunk(id: string, model: string, delta: object, finish: string | null) {
  return `data: ${JSON.stringify({
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta, finish_reason: finish }],
  })}\n\n`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as VoiceRequest | null;
  if (!body || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  // The platform sends its own system prompt and the whole transcript. Ours is
  // the system prompt that counts, so theirs is dropped.
  const turns = body.messages
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      text: textOf(message.content).slice(0, MAX_TEXT_LENGTH),
    }))
    .filter((turn, index) => {
      const original = body.messages?.[index];
      return original?.role !== "system" && turn.text.length > 0;
    });

  const last = turns.pop();
  const history: Anthropic.MessageParam[] = turns
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({
      role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: turn.text,
    }));

  const metadata = metadataOf(body);
  const phone =
    body.call?.customer?.number ??
    body.customer?.number ??
    body.phone ??
    str(metadata, "phone");

  const purposeRaw = str(metadata, "purpose");
  const purpose: CallPurpose =
    purposeRaw === "maintenance" ||
    purposeRaw === "warranty" ||
    purposeRaw === "confirmation"
      ? purposeRaw
      : "inbound";

  const model = body.model ?? agentModel();
  const responseId = `chatcmpl-${body.call?.id ?? crypto.randomUUID()}`;

  let reply: string;
  try {
    const { session } = await openSession({
      shopRef: str(metadata, "shopId"),
      channel: "voice",
      purpose,
      phone,
      appointmentId: str(metadata, "appointmentId"),
    });

    const turn = await runAgentTurn(session, history, last?.text ?? "");
    reply = turn.reply;
  } catch (error) {
    console.error("[service-agent/voice]", error);
    // Never 500 at a telephony platform: a non-200 is dead air on the line.
    // Say something a person can act on instead.
    reply =
      "Извините, у меня техническая заминка. Администратор перезвонит вам в ближайшее время.";
  }

  if (body.stream === false) {
    return NextResponse.json({
      id: responseId,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: reply },
          finish_reason: "stop",
        },
      ],
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(sseChunk(responseId, model, { role: "assistant", content: reply }, null))
      );
      controller.enqueue(encoder.encode(sseChunk(responseId, model, {}, "stop")));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
