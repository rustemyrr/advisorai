/**
 * The agent's own record: which reminders have already gone out, and what
 * happened on each call.
 *
 * This always lives in our Supabase tables, whatever provider mode the shop
 * runs in -- a CRM has no idea that we called someone about a service last
 * Tuesday, and without that record a daily cron would ring the same person
 * every morning.
 *
 * In crm / odata-1c mode the shop still needs one row in service_shops and
 * SERVICE_AGENT_SHOP_ID pointing at it. Without it there is nowhere to write
 * the record, so the functions below degrade to a warning instead of throwing:
 * the call still gets placed, it just is not deduplicated. The route that runs
 * reminders says so loudly (see app/api/service-agent/reminders/route.ts).
 */

import { createAdminClient } from "@/lib/supabase-server";
import type {
  CallPurpose,
  ReminderKind,
  ServiceShop,
  TranscriptTurn,
} from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether this shop id can be written to our tables at all. */
export function isPersistentShop(shop: ServiceShop): boolean {
  return UUID.test(shop.id);
}

export type ClaimReminderInput = {
  shop: ServiceShop;
  kind: ReminderKind;
  dedupeKey: string;
  dueOn: string;
  customerId?: string | null;
  vehicleId?: string | null;
  appointmentId?: string | null;
  payload: Record<string, unknown>;
};

export type ClaimedReminder = {
  id: string | null;
  /** True when this exact reminder was already recorded earlier. */
  alreadyClaimed: boolean;
};

/**
 * Takes ownership of one reminder. The unique (shop_id, dedupe_key) is what
 * makes this safe to call from a cron that runs every morning: the second call
 * with the same key claims nothing.
 */
export async function claimReminder(
  input: ClaimReminderInput
): Promise<ClaimedReminder> {
  if (!isPersistentShop(input.shop)) {
    console.warn(
      "[service-agent/store] no shop row (SERVICE_AGENT_SHOP_ID unset) -- reminder not deduplicated:",
      input.dedupeKey
    );
    return { id: null, alreadyClaimed: false };
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("service_reminders")
    .upsert(
      {
        shop_id: input.shop.id,
        kind: input.kind,
        dedupe_key: input.dedupeKey,
        due_on: input.dueOn,
        customer_id: input.customerId ?? null,
        vehicle_id: input.vehicleId ?? null,
        appointment_id: input.appointmentId ?? null,
        payload: input.payload,
      },
      { onConflict: "shop_id,dedupe_key", ignoreDuplicates: true }
    )
    .select("id");

  if (error) {
    console.error("[service-agent/store] claimReminder:", error.message);
    return { id: null, alreadyClaimed: true };
  }

  const row = (data as { id: string }[] | null)?.[0];
  return row ? { id: row.id, alreadyClaimed: false } : { id: null, alreadyClaimed: true };
}

export async function markReminder(
  reminderId: string | null,
  status: "sent" | "failed" | "skipped",
  detail?: { error?: string; channel?: string }
): Promise<void> {
  if (!reminderId) return;

  const db = createAdminClient();
  const { error } = await db
    .from("service_reminders")
    .update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      last_error: detail?.error ?? null,
      ...(detail?.channel ? { channel: detail.channel } : {}),
    })
    .eq("id", reminderId);

  if (error) console.error("[service-agent/store] markReminder:", error.message);
}

export type StartCallInput = {
  shop: ServiceShop;
  direction: "inbound" | "outbound";
  purpose: CallPurpose;
  phone: string;
  externalId?: string | null;
  customerId?: string | null;
  appointmentId?: string | null;
  reminderId?: string | null;
  status?: "queued" | "started";
};

/** Opens a call row and returns its id, or null when there is nowhere to log. */
export async function startCall(input: StartCallInput): Promise<string | null> {
  if (!isPersistentShop(input.shop)) return null;

  const db = createAdminClient();
  const { data, error } = await db
    .from("service_calls")
    .insert({
      shop_id: input.shop.id,
      direction: input.direction,
      purpose: input.purpose,
      phone: input.phone,
      external_id: input.externalId ?? null,
      customer_id: input.customerId ?? null,
      appointment_id: input.appointmentId ?? null,
      reminder_id: input.reminderId ?? null,
      status: input.status ?? "started",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[service-agent/store] startCall:", error.message);
    return null;
  }
  return (data as { id: string }).id;
}

export type FinishCallInput = {
  status: "completed" | "failed" | "no_answer";
  outcome?: string | null;
  summary?: string | null;
  transcript?: TranscriptTurn[];
  appointmentId?: string | null;
  customerId?: string | null;
};

export async function finishCall(
  callId: string,
  input: FinishCallInput
): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .from("service_calls")
    .update({
      status: input.status,
      outcome: input.outcome ?? null,
      summary: input.summary ?? null,
      ...(input.transcript ? { transcript: input.transcript } : {}),
      ...(input.appointmentId ? { appointment_id: input.appointmentId } : {}),
      ...(input.customerId ? { customer_id: input.customerId } : {}),
      ended_at: new Date().toISOString(),
    })
    .eq("id", callId);

  if (error) console.error("[service-agent/store] finishCall:", error.message);
}

/** Finds the call a telephony webhook is talking about. */
export async function findCallByExternalId(
  shop: ServiceShop,
  externalId: string
): Promise<{ id: string; purpose: CallPurpose; appointmentId: string | null } | null> {
  if (!isPersistentShop(shop)) return null;

  const db = createAdminClient();
  const { data, error } = await db
    .from("service_calls")
    .select("id, purpose, appointment_id")
    .eq("shop_id", shop.id)
    .eq("external_id", externalId)
    .maybeSingle();

  if (error) {
    console.error("[service-agent/store] findCallByExternalId:", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as { id: string; purpose: CallPurpose; appointment_id: string | null };
  return { id: row.id, purpose: row.purpose, appointmentId: row.appointment_id };
}

/** Attaches the provider call id to a row we opened before dialling. */
export async function attachExternalId(
  callId: string,
  externalId: string
): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .from("service_calls")
    .update({ external_id: externalId })
    .eq("id", callId);

  if (error) console.error("[service-agent/store] attachExternalId:", error.message);
}
