/**
 * Placing an outbound call.
 *
 * The agent itself is channel-agnostic: it takes text in and gives text back.
 * What is provider-specific is dialling a number and getting audio on the line,
 * and that is all this file does.
 *
 * Two modes:
 *
 *   SERVICE_AGENT_TELEPHONY=vapi     a voice platform dials over the shop SIP
 *                                    trunk and calls our /api/service-agent/voice
 *                                    endpoint for every turn, so Claude speaks
 *   SERVICE_AGENT_TELEPHONY=manual   nothing is dialled; the administrator gets
 *                                    the call to make in Telegram
 *
 * Manual is the default, and it is a real mode, not a stub: a shop that has not
 * bought a voice platform yet still gets its reminders -- as a list of people to
 * ring, with the reason and the number -- instead of nothing.
 */

import { sendTelegramMessage } from "@/lib/notify";
import { telephonyMode, vapiConfig } from "./config";
import { formatSlot } from "./time";
import type { CallPurpose, Customer, ServiceShop, Vehicle } from "./types";

const VAPI_TIMEOUT_MS = 8000;

export type PlaceCallInput = {
  shop: ServiceShop;
  customer: Customer;
  vehicle: Vehicle | null;
  purpose: CallPurpose;
  /** First sentence the agent says, generated in prompt.ts. */
  openingLine: string;
  /** Human-readable reason, used in the Telegram fallback. */
  reason: string;
  /** Passed through to the provider so its webhook can find our rows again. */
  metadata: Record<string, string>;
  appointmentStartsAt?: string | null;
};

export type PlaceCallResult = {
  placed: boolean;
  /** Provider call id, when the provider gave us one. */
  externalId: string | null;
  channel: "call" | "telegram" | "none";
  error?: string;
};

export function describeTelephony(): string {
  return telephonyMode() === "vapi"
    ? "voice platform (vapi)"
    : "manual (администратор звонит сам)";
}

export async function placeCall(
  input: PlaceCallInput
): Promise<PlaceCallResult> {
  if (telephonyMode() === "vapi") {
    const result = await placeVapiCall(input);
    if (result.placed) return result;
    // A failed dial still has to reach a person, or the reminder is silently
    // lost -- which is worse than a call nobody automated.
    const told = await notifyAdminToCall(input, result.error ?? null);
    return {
      placed: told,
      externalId: null,
      channel: told ? "telegram" : "none",
      error: result.error,
    };
  }

  const told = await notifyAdminToCall(input, null);
  return { placed: told, externalId: null, channel: told ? "telegram" : "none" };
}

async function placeVapiCall(input: PlaceCallInput): Promise<PlaceCallResult> {
  const config = vapiConfig();
  if (!config.apiKey || !config.phoneNumberId) {
    return {
      placed: false,
      externalId: null,
      channel: "none",
      error: "VAPI_API_KEY or VAPI_PHONE_NUMBER_ID is not set",
    };
  }

  try {
    const response = await fetch(`${config.baseUrl}/call`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumberId: config.phoneNumberId,
        ...(config.assistantId ? { assistantId: config.assistantId } : {}),
        customer: { number: input.customer.phone },
        // The assistant itself (voice, transcriber, and the custom-LLM URL that
        // points back at /api/service-agent/voice) is configured once in the
        // provider dashboard. Only what differs per call is sent here.
        assistantOverrides: {
          firstMessage: input.openingLine,
          metadata: input.metadata,
        },
      }),
      signal: AbortSignal.timeout(VAPI_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        placed: false,
        externalId: null,
        channel: "none",
        error: `vapi ${response.status}: ${body.slice(0, 200)}`,
      };
    }

    const payload = (await response.json()) as { id?: string };
    return {
      placed: true,
      externalId: typeof payload.id === "string" ? payload.id : null,
      channel: "call",
    };
  } catch (error) {
    return {
      placed: false,
      externalId: null,
      channel: "none",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const PURPOSE_TITLES: Record<CallPurpose, string> = {
  inbound: "Входящий",
  maintenance: "Напомнить о ТО",
  warranty: "Гарантия заканчивается",
  confirmation: "Подтвердить запись",
};

async function notifyAdminToCall(
  input: PlaceCallInput,
  error: string | null
): Promise<boolean> {
  const car = input.vehicle
    ? [input.vehicle.make, input.vehicle.model, input.vehicle.plate]
        .filter(Boolean)
        .join(" ")
    : "автомобиль не указан";

  return sendTelegramMessage([
    `<b>${PURPOSE_TITLES[input.purpose]}: позвонить клиенту</b>`,
    `Сервис: ${input.shop.name}`,
    `Клиент: ${input.customer.name || "имя не указано"} — ${input.customer.phone}`,
    `Автомобиль: ${car}`,
    `Повод: ${input.reason}`,
    input.appointmentStartsAt
      ? `Запись: ${formatSlot(input.appointmentStartsAt, input.shop.timezone, input.shop.locale)}`
      : "",
    error ? `Автодозвон не сработал: ${error}` : "",
  ]);
}
