/**
 * The tools the agent is allowed to use, and what they do.
 *
 * Shape of the contract, and why: the model never sees a database and never
 * invents a time. It asks find_slots for real openings, books one of them by
 * the exact ISO string it was handed, and every answer comes back as short
 * plain text it can read out loud. Anything the shop system cannot do surfaces
 * as a readable sentence ("нужен администратор") rather than an exception, so a
 * missing capability ends in a handoff instead of a dropped call.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase-server";
import { sendTelegramMessage } from "@/lib/notify";
import { ProviderUnsupported, type ServiceDataProvider } from "./provider";
import { freeSlots, isSlotFree, isWithinWorkingHours, slotEnd } from "./slots";
import { formatDate, formatSlot, normalizePhone, phoneTail, zonedDateString } from "./time";
import type { AgentContext } from "./prompt";
import type {
  Appointment,
  CustomerWithVehicles,
  ServiceShop,
  Vehicle,
} from "./types";

/** Mutable state of one conversation, shared by the tools and the loop. */
export type AgentSession = {
  shop: ServiceShop;
  provider: ServiceDataProvider;
  context: AgentContext;
  customer: CustomerWithVehicles | null;
  /** Slots already offered, so a booking can only land on one of them. */
  offered: Map<string, { startsAt: string; endsAt: string }>;
  outcome: {
    bookedAppointmentId?: string;
    confirmedAppointmentId?: string;
    cancelledAppointmentId?: string;
    rescheduledAppointmentId?: string;
    handoffReason?: string;
    stopCalling?: boolean;
  };
};

export function newSession(
  shop: ServiceShop,
  provider: ServiceDataProvider,
  context: AgentContext
): AgentSession {
  return {
    shop,
    provider,
    context,
    customer: context.customer ?? null,
    offered: new Map(),
    outcome: {},
  };
}

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "lookup_customer",
    description:
      "Найти клиента и его автомобили по номеру телефона. Вызывай, если номер звонящего неизвестен или клиент назвал другой номер.",
    input_schema: {
      type: "object",
      properties: {
        phone: { type: "string", description: "Номер телефона в любом формате" },
      },
      required: ["phone"],
    },
  },
  {
    name: "register_customer",
    description:
      "Записать нового клиента и его автомобиль. Вызывай только после того, как клиент назвал имя, марку и модель.",
    input_schema: {
      type: "object",
      properties: {
        phone: { type: "string" },
        name: { type: "string" },
        make: { type: "string", description: "Марка, например Toyota" },
        model: { type: "string", description: "Модель, например Camry" },
        plate: { type: "string", description: "Госномер, если клиент назвал" },
        year: { type: "integer" },
        mileage: { type: "integer", description: "Пробег в км, если клиент назвал" },
      },
      required: ["phone", "name", "make", "model"],
    },
  },
  {
    name: "find_slots",
    description:
      "Свободное время для записи. Единственный источник времени — отсюда. Возвращает список слотов; записывать можно только слот из этого списка.",
    input_schema: {
      type: "object",
      properties: {
        from_date: {
          type: "string",
          description: "С какой даты искать, YYYY-MM-DD. По умолчанию с сегодня.",
        },
        part_of_day: {
          type: "string",
          enum: ["morning", "afternoon", "evening", "any"],
          description: "Пожелание клиента по времени дня",
        },
        days: { type: "integer", description: "На сколько дней вперёд смотреть, по умолчанию 14" },
      },
      required: [],
    },
  },
  {
    name: "book_appointment",
    description:
      "Записать клиента на конкретный слот из find_slots. starts_at передавай точно той строкой, которую вернул find_slots.",
    input_schema: {
      type: "object",
      properties: {
        starts_at: { type: "string", description: "Начало слота, как вернул find_slots" },
        service_type: {
          type: "string",
          description:
            "Что делаем: maintenance (плановое ТО), diagnostics (диагностика), warranty (гарантийная проверка), repair (ремонт), other",
        },
        vehicle_id: { type: "string", description: "Если у клиента несколько машин" },
        notes: { type: "string", description: "Что сказал клиент своими словами" },
      },
      required: ["starts_at", "service_type"],
    },
  },
  {
    name: "list_my_appointments",
    description: "Текущие записи клиента, чтобы уточнить, перенести или отменить.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "confirm_appointment",
    description: "Клиент подтвердил, что приедет.",
    input_schema: {
      type: "object",
      properties: { appointment_id: { type: "string" } },
      required: ["appointment_id"],
    },
  },
  {
    name: "reschedule_appointment",
    description: "Перенести запись на другой слот из find_slots.",
    input_schema: {
      type: "object",
      properties: {
        appointment_id: { type: "string" },
        starts_at: { type: "string", description: "Новое начало, как вернул find_slots" },
      },
      required: ["appointment_id", "starts_at"],
    },
  },
  {
    name: "cancel_appointment",
    description: "Отменить запись по просьбе клиента.",
    input_schema: {
      type: "object",
      properties: {
        appointment_id: { type: "string" },
        reason: { type: "string" },
      },
      required: ["appointment_id"],
    },
  },
  {
    name: "service_history",
    description: "Что уже делали с этим автомобилем и когда.",
    input_schema: {
      type: "object",
      properties: { vehicle_id: { type: "string" } },
      required: ["vehicle_id"],
    },
  },
  {
    name: "warranty_status",
    description: "До какого срока и пробега действует гарантия на автомобиль.",
    input_schema: {
      type: "object",
      properties: { vehicle_id: { type: "string" } },
      required: ["vehicle_id"],
    },
  },
  {
    name: "handoff_to_human",
    description:
      "Передать разговор администратору: клиент просит человека, спорит о деньгах, жалуется, ДТП или аварийная ситуация, либо вопрос вне твоей компетенции.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Почему нужен человек" },
        summary: { type: "string", description: "Коротко, о чём разговор" },
      },
      required: ["reason"],
    },
  },
  {
    name: "stop_calling",
    description: "Клиент просит больше ему не звонить. Вызывай сразу, без уговоров.",
    input_schema: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: [],
    },
  },
];

const PART_OF_DAY: Record<string, { earliest?: string; latest?: string }> = {
  morning: { latest: "12:00" },
  afternoon: { earliest: "12:00", latest: "17:00" },
  evening: { earliest: "17:00" },
  any: {},
};

const SERVICE_LABELS: Record<string, string> = {
  maintenance: "плановое ТО",
  diagnostics: "диагностика",
  warranty: "гарантийная проверка",
  repair: "ремонт",
  other: "обращение",
};

function describeVehicle(vehicle: Vehicle): string {
  const name = [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "автомобиль";
  return vehicle.plate ? `${name} (${vehicle.plate})` : name;
}

function describeAppointment(appointment: Appointment, shop: ServiceShop): string {
  return `${formatSlot(appointment.startsAt, shop.timezone, shop.locale)}, ${
    SERVICE_LABELS[appointment.serviceType] ?? appointment.serviceType
  }, id=${appointment.id}, статус=${appointment.status}`;
}

/** The single vehicle a tool call means, when the model did not name one. */
function resolveVehicle(
  session: AgentSession,
  vehicleId?: unknown
): Vehicle | null {
  const vehicles = session.customer?.vehicles ?? [];
  if (typeof vehicleId === "string" && vehicleId) {
    return vehicles.find((v) => v.id === vehicleId) ?? session.context.vehicle ?? null;
  }
  if (session.context.vehicle) return session.context.vehicle;
  return vehicles.length === 1 ? vehicles[0] : null;
}

export async function executeTool(
  session: AgentSession,
  name: string,
  rawInput: unknown
): Promise<string> {
  const input = (rawInput ?? {}) as Record<string, unknown>;
  const { shop, provider } = session;

  try {
    switch (name) {
      case "lookup_customer": {
        const phone = normalizePhone(String(input.phone ?? ""));
        if (!phone) return "Номер не распознан, попроси продиктовать ещё раз.";
        const found = await provider.findCustomerByPhone(shop, phone);
        if (!found) {
          session.context.phone = phone;
          return `Клиента с номером ...${phoneTail(phone)} в базе нет. Узнай имя, марку и модель и вызови register_customer.`;
        }
        session.customer = found;
        const cars = found.vehicles.map((v) => `${describeVehicle(v)}, id=${v.id}`);
        return [
          `Клиент: ${found.name || "имя не указано"}, телефон ...${phoneTail(found.phone)}.`,
          cars.length > 0 ? `Автомобили: ${cars.join("; ")}.` : "Автомобилей в базе нет.",
          found.callsAllowed ? "" : "Клиент просил не звонить.",
        ]
          .filter(Boolean)
          .join(" ");
      }

      case "register_customer": {
        const phone = normalizePhone(String(input.phone ?? session.context.phone ?? ""));
        if (!phone) return "Без номера телефона записать нельзя, попроси номер.";
        const customer = await provider.createCustomer(shop, {
          phone,
          name: String(input.name ?? "").trim(),
        });
        const vehicle = await provider.addVehicle(shop, {
          customerId: customer.id,
          make: String(input.make ?? "").trim(),
          model: String(input.model ?? "").trim(),
          plate: input.plate ? String(input.plate) : null,
          year: typeof input.year === "number" ? input.year : null,
          mileage: typeof input.mileage === "number" ? input.mileage : null,
        });
        session.customer = { ...customer, vehicles: [vehicle] };
        session.context.vehicle = vehicle;
        return `Клиент и автомобиль записаны: ${describeVehicle(vehicle)}, vehicle_id=${vehicle.id}.`;
      }

      case "find_slots": {
        const part = PART_OF_DAY[String(input.part_of_day ?? "any")] ?? {};
        const fromDate =
          typeof input.from_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.from_date)
            ? input.from_date
            : zonedDateString(new Date(), shop.timezone);
        const days = typeof input.days === "number" ? Math.min(60, Math.max(1, input.days)) : 14;

        const searchEnd = new Date(
          Date.parse(`${fromDate}T00:00:00Z`) + (days + 1) * 86400000
        ).toISOString();
        const booked = await provider.listBookedIntervals(
          shop,
          `${fromDate}T00:00:00.000Z`,
          searchEnd
        );

        const slots = freeSlots(shop, booked, {
          fromDate,
          days,
          limit: 6,
          earliestTime: part.earliest ?? null,
          latestTime: part.latest ?? null,
        });

        if (slots.length === 0) {
          return "Свободных окон в этом периоде нет. Предложи другой день или вызови handoff_to_human.";
        }

        session.offered.clear();
        for (const slot of slots) session.offered.set(slot.startsAt, slot);

        return [
          "Свободные слоты (starts_at передавай в book_appointment ровно как здесь):",
          ...slots.map(
            (slot) =>
              `- ${formatSlot(slot.startsAt, shop.timezone, shop.locale)} | starts_at=${slot.startsAt}`
          ),
          "Назови клиенту не больше двух вариантов за раз.",
        ].join("\n");
      }

      case "book_appointment": {
        if (!session.customer) {
          return "Клиент ещё не определён: вызови lookup_customer или register_customer.";
        }
        const startsAt = String(input.starts_at ?? "");
        const offered = session.offered.get(startsAt);
        if (!offered) {
          return "Это время не из find_slots. Вызови find_slots и предложи клиенту слот оттуда.";
        }
        if (!isWithinWorkingHours(shop, offered.startsAt, offered.endsAt)) {
          return "В это время сервис закрыт. Возьми другой слот из find_slots.";
        }

        // Checked again here: the offer and the yes are two different moments,
        // and another caller may have taken the slot in between.
        const booked = await provider.listBookedIntervals(
          shop,
          offered.startsAt,
          offered.endsAt
        );
        if (!isSlotFree(shop, booked, offered.startsAt, offered.endsAt)) {
          return "Слот только что заняли. Вызови find_slots и предложи другое время.";
        }

        const vehicle = resolveVehicle(session, input.vehicle_id);
        const appointment = await provider.createAppointment(shop, {
          customerId: session.customer.id,
          vehicleId: vehicle?.id ?? null,
          startsAt: offered.startsAt,
          endsAt: offered.endsAt,
          serviceType: String(input.service_type ?? "maintenance"),
          source: session.context.channel === "chat" ? "chat" : "inbound_call",
          notes: input.notes ? String(input.notes) : null,
        });

        session.outcome.bookedAppointmentId = appointment.id;
        return `Записано: ${formatSlot(appointment.startsAt, shop.timezone, shop.locale)}, ${
          SERVICE_LABELS[appointment.serviceType] ?? appointment.serviceType
        }${vehicle ? `, ${describeVehicle(vehicle)}` : ""}. Проговори это клиенту и дождись подтверждения.`;
      }

      case "list_my_appointments": {
        if (!session.customer) return "Клиент не определён: вызови lookup_customer.";
        const appointments = await provider.listAppointments(shop, session.customer.id);
        const active = appointments.filter(
          (a) => a.status === "booked" || a.status === "confirmed"
        );
        if (active.length === 0) return "Активных записей нет.";
        return active.map((a) => `- ${describeAppointment(a, shop)}`).join("\n");
      }

      case "confirm_appointment": {
        const appointment = await provider.setAppointmentStatus(
          shop,
          String(input.appointment_id ?? ""),
          "confirmed"
        );
        session.outcome.confirmedAppointmentId = appointment.id;
        return "Запись подтверждена.";
      }

      case "cancel_appointment": {
        const appointment = await provider.setAppointmentStatus(
          shop,
          String(input.appointment_id ?? ""),
          "cancelled"
        );
        session.outcome.cancelledAppointmentId = appointment.id;
        return "Запись отменена. Спроси, записать ли на другое время.";
      }

      case "reschedule_appointment": {
        const startsAt = String(input.starts_at ?? "");
        const offered = session.offered.get(startsAt);
        if (!offered) {
          return "Новое время должно быть слотом из find_slots. Вызови find_slots.";
        }
        const appointment = await provider.rescheduleAppointment(
          shop,
          String(input.appointment_id ?? ""),
          offered.startsAt,
          offered.endsAt ?? slotEnd(offered.startsAt, shop.slotMinutes)
        );
        session.outcome.rescheduledAppointmentId = appointment.id;
        return `Перенесено на ${formatSlot(appointment.startsAt, shop.timezone, shop.locale)}. Проговори это клиенту.`;
      }

      case "service_history": {
        const vehicle = resolveVehicle(session, input.vehicle_id);
        if (!vehicle) return "Непонятно, о каком автомобиле речь — уточни у клиента.";
        const visits = await provider.listVisits(shop, vehicle.id, 5);
        if (visits.length === 0) return "В базе нет прошлых работ по этому автомобилю.";
        return visits
          .map((visit) => {
            const date = visit.performedAt
              ? formatDate(visit.performedAt.slice(0, 10), shop.timezone, shop.locale)
              : "дата неизвестна";
            const mileage = visit.mileage ? `, пробег ${visit.mileage} км` : "";
            return `- ${date}${mileage}: ${visit.works || "работы не описаны"}`;
          })
          .join("\n");
      }

      case "warranty_status": {
        const vehicle = resolveVehicle(session, input.vehicle_id);
        if (!vehicle) return "Непонятно, о каком автомобиле речь — уточни у клиента.";
        if (!vehicle.warrantyUntil && !vehicle.warrantyKm) {
          return "Данных о гарантии по этому автомобилю нет. Скажи, что уточнит мастер, и предложи записаться.";
        }
        const parts: string[] = [];
        if (vehicle.warrantyUntil) {
          parts.push(
            `до ${formatDate(vehicle.warrantyUntil, shop.timezone, shop.locale)}`
          );
        }
        if (vehicle.warrantyKm) parts.push(`до ${vehicle.warrantyKm} км пробега`);
        const mileage = vehicle.mileage ? ` Текущий пробег ${vehicle.mileage} км.` : "";
        return `Гарантия действует ${parts.join(" и ")}.${mileage}`;
      }

      case "handoff_to_human": {
        const reason = String(input.reason ?? "клиент просит человека");
        session.outcome.handoffReason = reason;
        await notifyHandoff(session, reason, input.summary ? String(input.summary) : null);
        return "Администратор получил уведомление. Скажи клиенту, что перезвонят, и уточни удобное время.";
      }

      case "stop_calling": {
        session.outcome.stopCalling = true;
        await stopCalling(session, input.reason ? String(input.reason) : null);
        return "Отмечено: больше не звоним. Извинись и попрощайся.";
      }

      default:
        return `Инструмента ${name} нет.`;
    }
  } catch (error) {
    if (error instanceof ProviderUnsupported) {
      console.warn(`[service-agent] ${name} unsupported:`, error.message);
      return "Эту операцию сервис не может выполнить автоматически. Запиши пожелание клиента и вызови handoff_to_human.";
    }
    console.error(`[service-agent] tool ${name} failed:`, error);
    return "Техническая ошибка на стороне сервиса. Извинись, запиши контакт и вызови handoff_to_human.";
  }
}

async function notifyHandoff(
  session: AgentSession,
  reason: string,
  summary: string | null
): Promise<void> {
  const phone =
    session.customer?.phone ?? session.context.phone ?? "номер неизвестен";
  await sendTelegramMessage([
    "<b>Агент передаёт клиента администратору</b>",
    `Сервис: ${session.shop.name}`,
    `Клиент: ${session.customer?.name || "неизвестен"} (${phone})`,
    `Причина: ${reason}`,
    summary ? `Суть: ${summary}` : "",
  ]);
}

/**
 * A person who says "do not call me again" must stop being called even if the
 * customer list lives in a CRM we only read: in that case the administrator is
 * told, because that is the only place the flag can be set.
 */
async function stopCalling(
  session: AgentSession,
  reason: string | null
): Promise<void> {
  const customer = session.customer;

  if (customer && session.provider.mode === "supabase") {
    const db = createAdminClient();
    const { error } = await db
      .from("service_customers")
      .update({ calls_allowed: false })
      .eq("shop_id", session.shop.id)
      .eq("id", customer.id);
    if (error) console.error("[service-agent] stopCalling:", error.message);
  }

  await sendTelegramMessage([
    "<b>Клиент просит не звонить</b>",
    `Сервис: ${session.shop.name}`,
    `Клиент: ${customer?.name || "неизвестен"} (${customer?.phone ?? session.context.phone ?? "номер неизвестен"})`,
    reason ? `Причина: ${reason}` : "",
    session.provider.mode === "supabase"
      ? "Отметка calls_allowed=false поставлена."
      : "Поставьте отметку в CRM вручную — база клиентов не в AdvisorAI.",
  ]);
}
