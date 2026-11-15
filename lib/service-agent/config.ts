/**
 * Everything the service agent reads from the environment, in one place.
 *
 * The agent has to run in three quite different setups and must not need a code
 * change to move between them:
 *
 *   SERVICE_AGENT_PROVIDER=supabase   the agent keeps the customers, cars and
 *                                     bookings itself (the default, and what a
 *                                     shop without a CRM gets)
 *   SERVICE_AGENT_PROVIDER=crm        a REST CRM is the source of truth
 *   SERVICE_AGENT_PROVIDER=odata-1c   a 1C DMS published over OData is
 *
 * In the last two the shop settings (hours, intervals) come from env as well,
 * because our own tables are empty in those modes.
 */

import type { ServiceShop } from "./types";

export type ProviderMode = "supabase" | "crm" | "odata-1c";
export type TelephonyMode = "vapi" | "manual";

function env(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function num(name: string, fallback: number): number {
  const raw = env(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Parses a JSON env var, falling back rather than throwing at import time. */
function json<T>(name: string, fallback: T): T {
  const raw = env(name);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error(`[service-agent] ${name} is not valid JSON, using defaults`);
    return fallback;
  }
}

export function providerMode(): ProviderMode {
  const raw = (env("SERVICE_AGENT_PROVIDER") ?? "supabase").toLowerCase();
  if (raw === "crm" || raw === "odata-1c") return raw;
  return "supabase";
}

export function telephonyMode(): TelephonyMode {
  return (env("SERVICE_AGENT_TELEPHONY") ?? "manual") === "vapi"
    ? "vapi"
    : "manual";
}

/**
 * Claude Opus 5.5 is the default. A telephone conversation is the one place
 * where a slower reply is heard as a pause, so a shop that finds the latency
 * too high can set SERVICE_AGENT_MODEL=claude-sonnet-5-5 (or claude-haiku-5-5)
 * without touching code.
 */
export function agentModel(): string {
  return env("SERVICE_AGENT_MODEL") ?? "claude-opus-5-5";
}

/** Shared secret the telephony provider must send on every webhook. */
export function webhookSecret(): string | undefined {
  return env("SERVICE_AGENT_WEBHOOK_SECRET");
}

/** Set by Vercel on scheduled invocations as `Authorization: Bearer ...`. */
export function cronSecret(): string | undefined {
  return env("CRON_SECRET");
}

export const crmConfig = () => ({
  baseUrl: env("SERVICE_AGENT_CRM_BASE_URL"),
  token: env("SERVICE_AGENT_CRM_TOKEN"),
  /** Header the token goes in. Some CRMs want X-Api-Key, not Authorization. */
  authHeader: env("SERVICE_AGENT_CRM_AUTH_HEADER") ?? "Authorization",
  authScheme: env("SERVICE_AGENT_CRM_AUTH_SCHEME") ?? "Bearer",
  /**
   * Paths are configurable because no two CRMs agree on them. Defaults match
   * the shape documented in docs/service-agent.md.
   */
  paths: json("SERVICE_AGENT_CRM_PATHS", {
    customerByPhone: "/customers",
    vehicles: "/customers/{customerId}/vehicles",
    visits: "/vehicles/{vehicleId}/visits",
    appointments: "/appointments",
    maintenanceDue: "/vehicles/maintenance-due",
    warrantyExpiring: "/vehicles/warranty-expiring",
  }),
});

export const odata1cConfig = () => ({
  /** e.g. https://1c.example.kz/dms/odata/standard.odata */
  baseUrl: env("SERVICE_AGENT_1C_BASE_URL"),
  username: env("SERVICE_AGENT_1C_USERNAME"),
  password: env("SERVICE_AGENT_1C_PASSWORD"),
  /**
   * 1C entity and property names differ per configuration, so every name the
   * adapter touches is overridable. The defaults are the names a stock
   * "Автосервис" configuration publishes.
   */
  entities: json("SERVICE_AGENT_1C_ENTITIES", {
    customers: "Catalog_Контрагенты",
    customerPhone: "КонтактнаяИнформация",
    customerName: "Description",
    vehicles: "Catalog_Автомобили",
    vehicleOwner: "Владелец_Key",
    orders: "Document_ЗаказНаряд",
  }),
});

export const vapiConfig = () => ({
  apiKey: env("VAPI_API_KEY"),
  /** The number the shop dials out from, as registered at the provider. */
  phoneNumberId: env("VAPI_PHONE_NUMBER_ID"),
  assistantId: env("VAPI_ASSISTANT_ID"),
  baseUrl: env("VAPI_BASE_URL") ?? "https://api.vapi.ai",
});

/**
 * Shop settings for the modes where our own tables hold nothing. Also the
 * fallback when a Supabase shop row has not been created yet, so a fresh
 * checkout can be talked to without any setup at all.
 */
export function shopFromEnv(): ServiceShop {
  return {
    id: env("SERVICE_AGENT_SHOP_ID") ?? "env",
    name: env("SERVICE_AGENT_SHOP_NAME") ?? "Автосервис",
    phone: env("SERVICE_AGENT_SHOP_PHONE") ?? null,
    address: env("SERVICE_AGENT_SHOP_ADDRESS") ?? null,
    timezone: env("SERVICE_AGENT_TIMEZONE") ?? "Asia/Almaty",
    locale: env("SERVICE_AGENT_LOCALE") ?? "ru",
    workingHours: json("SERVICE_AGENT_WORKING_HOURS", {
      "1": ["09:00", "19:00"],
      "2": ["09:00", "19:00"],
      "3": ["09:00", "19:00"],
      "4": ["09:00", "19:00"],
      "5": ["09:00", "19:00"],
      "6": ["10:00", "16:00"],
    } as Record<string, [string, string]>),
    slotMinutes: num("SERVICE_AGENT_SLOT_MINUTES", 60),
    bays: num("SERVICE_AGENT_BAYS", 2),
    maintenanceIntervalKm: num("SERVICE_AGENT_INTERVAL_KM", 10000),
    maintenanceIntervalMonths: num("SERVICE_AGENT_INTERVAL_MONTHS", 12),
    maintenanceLeadDays: num("SERVICE_AGENT_MAINTENANCE_LEAD_DAYS", 14),
    warrantyLeadDays: num("SERVICE_AGENT_WARRANTY_LEAD_DAYS", 30),
  };
}
