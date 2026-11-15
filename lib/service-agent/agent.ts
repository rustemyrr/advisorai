/**
 * One turn of the conversation: the customer said something, the agent decides
 * what to say back, using tools as needed.
 *
 * A manual tool loop rather than the SDK tool runner, because the runner is a
 * beta helper on newer SDK releases than the one this project pins
 * (@anthropic-ai/sdk 0.39) -- and because a phone call wants a hard cap on how
 * many tool round trips one turn may take before the agent has to say
 * something.
 */

import Anthropic from "@anthropic-ai/sdk";
import { agentModel } from "./config";
import { buildSystemPrompt } from "./prompt";
import { AGENT_TOOLS, executeTool, type AgentSession } from "./tools";

/**
 * Enough for lookup -> find_slots -> book, with room for one correction. A
 * caller is not going to sit through more than that, and a loop that cannot
 * finish in six steps is a handoff, not a longer loop.
 */
const MAX_TOOL_ROUNDS = 6;

/**
 * Short on purpose: one spoken reply is a sentence or two, and a shorter cap is
 * also a shorter wait on the line. The chat channel gets more room because it
 * can afford a fuller answer.
 */
const MAX_TOKENS_VOICE = 600;
const MAX_TOKENS_CHAT = 2000;

const FALLBACK_REPLY =
  "Секунду, мне нужно уточнить это у администратора — он перезвонит вам.";

let client: Anthropic | null = null;

function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export type AgentTurn = {
  /** What to say to the customer. */
  reply: string;
  /** The conversation to carry into the next turn, tool calls included. */
  messages: Anthropic.MessageParam[];
  /** Tool calls made this turn, for the call log. */
  toolsUsed: string[];
};

function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

/**
 * Runs the agent until it has something to say.
 *
 * `history` is the conversation so far (without the new message); the returned
 * `messages` is the history to keep. The whole assistant `content` is appended
 * on every round, not just its text, because a tool result has to follow the
 * exact block that asked for it.
 */
export async function runAgentTurn(
  session: AgentSession,
  history: Anthropic.MessageParam[],
  userMessage: string
): Promise<AgentTurn> {
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: userMessage },
  ];
  const toolsUsed: string[] = [];
  const maxTokens =
    session.context.channel === "voice" ? MAX_TOKENS_VOICE : MAX_TOKENS_CHAT;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let response: Anthropic.Message;
    try {
      response = await anthropic().messages.create({
        model: agentModel(),
        max_tokens: maxTokens,
        system: buildSystemPrompt(session.context),
        tools: AGENT_TOOLS,
        messages,
      });
    } catch (error) {
      console.error("[service-agent] model call failed:", error);
      return { reply: FALLBACK_REPLY, messages, toolsUsed };
    }

    // A safety decline is not a tool failure: say the fallback and let a human
    // take it, rather than retrying the same turn.
    // Cast: a safety decline is a stop reason the pinned SDK (0.39) does not
    // know about yet, while the models this runs on can send it.
    if ((response.stop_reason as string) === "refusal") {
      console.warn("[service-agent] model refused the turn");
      return { reply: FALLBACK_REPLY, messages, toolsUsed };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (toolUses.length === 0) {
      const reply = textOf(response.content);
      return { reply: reply || FALLBACK_REPLY, messages, toolsUsed };
    }

    // All results from one assistant turn go back in a single user message --
    // splitting them teaches the model to stop calling tools in parallel.
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      toolsUsed.push(toolUse.name);
      const result = await executeTool(session, toolUse.name, toolUse.input);
      results.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }
    messages.push({ role: "user", content: results });
  }

  console.warn("[service-agent] tool round limit reached");
  return { reply: FALLBACK_REPLY, messages, toolsUsed };
}

/**
 * A short summary of the call for the log. Kept deterministic -- it is written
 * from what the tools did, not from a second model call, so the log never costs
 * a request and never disagrees with the database.
 */
export function summarizeOutcome(session: AgentSession): {
  outcome: string;
  summary: string;
} {
  const o = session.outcome;
  if (o.bookedAppointmentId) {
    return { outcome: "booked", summary: "Клиент записан на сервис." };
  }
  if (o.rescheduledAppointmentId) {
    return { outcome: "rescheduled", summary: "Запись перенесена." };
  }
  if (o.confirmedAppointmentId) {
    return { outcome: "confirmed", summary: "Клиент подтвердил запись." };
  }
  if (o.cancelledAppointmentId) {
    return { outcome: "cancelled", summary: "Запись отменена." };
  }
  if (o.stopCalling) {
    return { outcome: "do_not_call", summary: "Клиент просил больше не звонить." };
  }
  if (o.handoffReason) {
    return { outcome: "handoff", summary: `Передано администратору: ${o.handoffReason}` };
  }
  return { outcome: "talked", summary: "Разговор без изменений в записях." };
}
