/**
 * The three reasons the agent calls a customer without being called first:
 *
 *   maintenance   the next service is due within the shop lead time
 *   warranty      the warranty runs out within the shop lead time
 *   confirmation  the customer is booked for tomorrow and has not confirmed
 *
 * Run from a schedule (app/api/service-agent/reminders/route.ts, once a
 * morning). Everything here is written to be safe to run again: each reminder
 * is claimed under a unique key first, so a second run on the same day places
 * no second call, and a crash halfway through leaves the already-made calls
 * recorded rather than repeated.
 */

import { ProviderUnsupported } from "./provider";
import { getProvider } from "./providers";
import { openingLine } from "./prompt";
import { claimReminder, markReminder, startCall, attachExternalId, isPersistentShop } from "./store";
import { placeCall } from "./telephony";
import { addDays, formatDate, zonedDateString, zonedToUtc } from "./time";
import type { Customer, ReminderKind, ServiceShop, Vehicle } from "./types";

export type ReminderCounts = {
  due: number;
  called: number;
  skipped: number;
  failed: number;
};

export type ReminderRunResult = {
  shop: string;
  timezone: string;
  today: string;
  persistent: boolean;
  maintenance: ReminderCounts;
  warranty: ReminderCounts;
  confirmation: ReminderCounts;
  notes: string[];
};

function emptyCounts(): ReminderCounts {
  return { due: 0, called: 0, skipped: 0, failed: 0 };
}

function carName(vehicle: Vehicle | null): string {
  if (!vehicle) return "автомобиль";
  return [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "автомобиль";
}

/**
 * Keys are per period, not per day: a service due in December is one reminder
 * whether the cron runs once or thirty times before then.
 */
function maintenanceKey(vehicle: Vehicle, today: string): string {
  const period = (vehicle.nextServiceDueAt ?? today).slice(0, 7);
  return `maintenance:${vehicle.id}:${period}`;
}

function warrantyKey(vehicle: Vehicle): string {
  return `warranty:${vehicle.id}:${vehicle.warrantyUntil ?? "unknown"}`;
}

function confirmationKey(appointmentId: string): string {
  return `confirmation:${appointmentId}`;
}

type CallOnce = {
  shop: ServiceShop;
  kind: ReminderKind;
  dedupeKey: string;
  dueOn: string;
  customer: Customer;
  vehicle: Vehicle | null;
  reason: string;
  appointmentId?: string | null;
  appointmentStartsAt?: string | null;
};

/**
 * Claim, dial, record. Returns which bucket the attempt lands in so the caller
 * can count it.
 */
async function callOnce(input: CallOnce): Promise<"called" | "skipped" | "failed"> {
  if (!input.customer.callsAllowed) return "skipped";
  if (!input.customer.phone) return "skipped";

  const claim = await claimReminder({
    shop: input.shop,
    kind: input.kind,
    dedupeKey: input.dedupeKey,
    dueOn: input.dueOn,
    customerId: input.customer.id,
    vehicleId: input.vehicle?.id ?? null,
    appointmentId: input.appointmentId ?? null,
    payload: {
      name: input.customer.name,
      phone: input.customer.phone,
      car: carName(input.vehicle),
      reason: input.reason,
    },
  });

  if (claim.alreadyClaimed) return "skipped";

  const opening = openingLine({
    shop: input.shop,
    purpose: input.kind,
    channel: "voice",
    customer: { ...input.customer, vehicles: input.vehicle ? [input.vehicle] : [] },
    vehicle: input.vehicle,
    appointment: input.appointmentStartsAt
      ? {
          id: input.appointmentId ?? "",
          customerId: input.customer.id,
          vehicleId: input.vehicle?.id ?? null,
          startsAt: input.appointmentStartsAt,
          endsAt: input.appointmentStartsAt,
          serviceType: "maintenance",
          status: "booked",
          source: "outbound_call",
          notes: null,
        }
      : null,
    reason: input.reason,
  });

  // The call row is opened before dialling, so a webhook that arrives while
  // the dial request is still in flight has something to attach itself to.
  const callId = await startCall({
    shop: input.shop,
    direction: "outbound",
    purpose: input.kind,
    phone: input.customer.phone,
    customerId: input.customer.id,
    appointmentId: input.appointmentId ?? null,
    reminderId: claim.id,
    status: "queued",
  });

  const result = await placeCall({
    shop: input.shop,
    customer: input.customer,
    vehicle: input.vehicle,
    purpose: input.kind,
    openingLine: opening,
    reason: input.reason,
    appointmentStartsAt: input.appointmentStartsAt ?? null,
    metadata: {
      shopId: input.shop.id,
      purpose: input.kind,
      customerId: input.customer.id,
      ...(claim.id ? { reminderId: claim.id } : {}),
      ...(callId ? { callId } : {}),
      ...(input.appointmentId ? { appointmentId: input.appointmentId } : {}),
    },
  });

  if (callId && result.externalId) await attachExternalId(callId, result.externalId);

  if (result.placed) {
    await markReminder(claim.id, "sent", { channel: result.channel });
    return "called";
  }

  await markReminder(claim.id, "failed", {
    error: result.error ?? "could not place the call",
    channel: result.channel,
  });
  return "failed";
}

export type RunRemindersOptions = {
  /** Shop id, or the owner user id in Supabase mode. */
  shopRef?: string | null;
  now?: Date;
  /** Which of the three to run; all three by default. */
  kinds?: ReminderKind[];
};

export async function runReminders(
  options: RunRemindersOptions = {}
): Promise<ReminderRunResult> {
  const provider = getProvider();
  const now = options.now ?? new Date();
  const shop = await provider.getShop(options.shopRef ?? null);
  const today = zonedDateString(now, shop.timezone);
  const kinds = options.kinds ?? ["maintenance", "warranty", "confirmation"];

  const result: ReminderRunResult = {
    shop: shop.name,
    timezone: shop.timezone,
    today,
    persistent: isPersistentShop(shop),
    maintenance: emptyCounts(),
    warranty: emptyCounts(),
    confirmation: emptyCounts(),
    notes: [],
  };

  if (!result.persistent) {
    result.notes.push(
      "Нет строки в service_shops (SERVICE_AGENT_SHOP_ID не задан): напоминания не дедуплицируются, повторный запуск позвонит снова."
    );
  }

  if (kinds.includes("maintenance")) {
    try {
      const through = addDays(today, shop.maintenanceLeadDays);
      const rows = await provider.listMaintenanceDue(shop, through);
      result.maintenance.due = rows.length;

      for (const row of rows) {
        const dueOn = row.vehicle.nextServiceDueAt ?? today;
        const reason = row.vehicle.nextServiceDueAt
          ? `Плановое ТО до ${formatDate(row.vehicle.nextServiceDueAt, shop.timezone, shop.locale)}.`
          : `С последнего обслуживания прошло около ${shop.maintenanceIntervalMonths} месяцев.`;
        const outcome = await callOnce({
          shop,
          kind: "maintenance",
          dedupeKey: maintenanceKey(row.vehicle, today),
          dueOn,
          customer: row.customer,
          vehicle: row.vehicle,
          reason,
        });
        result.maintenance[outcome] += 1;
      }
    } catch (error) {
      result.notes.push(describeError("ТО", error));
    }
  }

  if (kinds.includes("warranty")) {
    try {
      const through = addDays(today, shop.warrantyLeadDays);
      const rows = await provider.listWarrantyExpiring(shop, through);
      result.warranty.due = rows.length;

      for (const row of rows) {
        const dueOn = row.vehicle.warrantyUntil ?? today;
        const reason = row.vehicle.warrantyUntil
          ? `Гарантия заканчивается ${formatDate(row.vehicle.warrantyUntil, shop.timezone, shop.locale)}.`
          : "Гарантия скоро заканчивается.";
        const outcome = await callOnce({
          shop,
          kind: "warranty",
          dedupeKey: warrantyKey(row.vehicle),
          dueOn,
          customer: row.customer,
          vehicle: row.vehicle,
          reason,
        });
        result.warranty[outcome] += 1;
      }
    } catch (error) {
      result.notes.push(describeError("гарантии", error));
    }
  }

  if (kinds.includes("confirmation")) {
    try {
      // Tomorrow, in shop local time: a confirmation call the evening before is
      // early enough to refill the slot if the customer cannot come.
      const tomorrow = addDays(today, 1);
      const from = zonedToUtc(tomorrow, "00:00", shop.timezone).toISOString();
      const to = zonedToUtc(tomorrow, "23:59", shop.timezone).toISOString();
      const rows = await provider.listAppointmentsToConfirm(shop, from, to);
      result.confirmation.due = rows.length;

      for (const row of rows) {
        const outcome = await callOnce({
          shop,
          kind: "confirmation",
          dedupeKey: confirmationKey(row.appointment.id),
          dueOn: tomorrow,
          customer: row.customer,
          vehicle: row.vehicle,
          reason: "Подтверждение записи на завтра.",
          appointmentId: row.appointment.id,
          appointmentStartsAt: row.appointment.startsAt,
        });
        result.confirmation[outcome] += 1;
      }
    } catch (error) {
      result.notes.push(describeError("подтверждений", error));
    }
  }

  return result;
}

function describeError(what: string, error: unknown): string {
  if (error instanceof ProviderUnsupported) {
    return `Напоминания про ${what} пропущены: источник данных не умеет этот запрос (${error.message}).`;
  }
  console.error(`[service-agent/reminders] ${what}:`, error);
  return `Напоминания про ${what} не отработали: ${
    error instanceof Error ? error.message : String(error)
  }`;
}
