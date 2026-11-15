/**
 * What the agent is told before it opens its mouth.
 *
 * Written for the telephone, which is what makes it different from the
 * service-advisor prompt in app/api/generate: no markdown, no lists, no ISO
 * timestamps read out loud, short turns, and a hard rule against inventing a
 * price or a diagnosis -- a wrong number said on the phone is a promise the
 * shop has to keep.
 */

import { formatDate, formatSlot } from "./time";
import type {
  Appointment,
  CallPurpose,
  CustomerWithVehicles,
  ServiceShop,
  Vehicle,
} from "./types";

export type AgentContext = {
  shop: ServiceShop;
  purpose: CallPurpose;
  /** "voice" keeps the replies short enough to be spoken. */
  channel: "voice" | "chat";
  /** Caller id, when the channel gives us one. */
  phone?: string | null;
  customer?: CustomerWithVehicles | null;
  vehicle?: Vehicle | null;
  appointment?: Appointment | null;
  /** One sentence on why we are calling, for an outbound call. */
  reason?: string | null;
  now?: Date;
};

const WEEKDAY_NAMES: Record<string, string> = {
  "0": "воскресенье",
  "1": "понедельник",
  "2": "вторник",
  "3": "среда",
  "4": "четверг",
  "5": "пятница",
  "6": "суббота",
};

function workingHoursLine(shop: ServiceShop): string {
  const days = Object.entries(shop.workingHours)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([day, [open, close]]) => `${WEEKDAY_NAMES[day] ?? day} ${open}-${close}`);
  return days.length > 0 ? days.join(", ") : "часы работы не заданы";
}

function vehicleLine(vehicle: Vehicle, shop: ServiceShop): string {
  const parts = [
    [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "автомобиль",
  ];
  if (vehicle.year) parts.push(String(vehicle.year));
  if (vehicle.plate) parts.push(`госномер ${vehicle.plate}`);
  if (vehicle.mileage) parts.push(`пробег ${vehicle.mileage} км`);
  if (vehicle.lastServiceAt) {
    parts.push(
      `последнее обслуживание ${formatDate(
        vehicle.lastServiceAt.slice(0, 10),
        shop.timezone,
        shop.locale
      )}`
    );
  }
  if (vehicle.nextServiceDueAt) {
    parts.push(
      `следующее ТО до ${formatDate(vehicle.nextServiceDueAt, shop.timezone, shop.locale)}`
    );
  }
  if (vehicle.nextServiceDueKm) parts.push(`или на ${vehicle.nextServiceDueKm} км`);
  if (vehicle.warrantyUntil) {
    parts.push(
      `гарантия до ${formatDate(vehicle.warrantyUntil, shop.timezone, shop.locale)}`
    );
  }
  if (vehicle.warrantyKm) parts.push(`гарантия до ${vehicle.warrantyKm} км`);
  return parts.join(", ");
}

function customerBlock(context: AgentContext): string {
  const { customer, shop } = context;
  if (!customer) {
    return context.phone
      ? `Клиент звонит с номера ${context.phone}, в базе его нет. Узнай имя, марку и модель автомобиля, прежде чем записывать.`
      : "Клиент неизвестен. Узнай имя, телефон, марку и модель автомобиля, прежде чем записывать.";
  }

  const lines = [
    `Клиент: ${customer.name || "имя не указано"}, телефон ${customer.phone}.`,
  ];
  if (customer.vehicles.length > 0) {
    lines.push("Автомобили клиента:");
    for (const vehicle of customer.vehicles) {
      lines.push(`- ${vehicleLine(vehicle, shop)}`);
    }
  } else {
    lines.push("Автомобилей в базе нет — спроси марку и модель.");
  }
  if (customer.notes) lines.push(`Заметка по клиенту: ${customer.notes}`);
  return lines.join("\n");
}

function purposeBlock(context: AgentContext): string {
  const { shop, appointment, vehicle, reason } = context;

  switch (context.purpose) {
    case "maintenance":
      return [
        "Это исходящий звонок о плановом ТО.",
        reason ?? "Подошёл срок очередного обслуживания.",
        "Скажи, по какому автомобилю звонишь и почему подошёл срок, спроси, удобно ли говорить,",
        "предложи два ближайших свободных времени и запиши, если клиент согласен.",
        "Если клиент говорит, что обслуживается в другом месте или просит не звонить — спокойно прими это и зафиксируй инструментом stop_calling.",
      ].join(" ");

    case "warranty":
      return [
        "Это исходящий звонок об окончании гарантии.",
        reason ?? "Гарантия на автомобиль скоро заканчивается.",
        vehicle?.warrantyUntil
          ? `Гарантия действует до ${formatDate(vehicle.warrantyUntil, shop.timezone, shop.locale)}.`
          : "",
        "Объясни коротко: пока гарантия действует, проверка и устранение дефектов по гарантии бесплатны для клиента, после — за его счёт.",
        "Предложи записать на проверку до окончания гарантии. Не обещай, что конкретный ремонт будет признан гарантийным — это решает мастер после осмотра.",
      ]
        .filter(Boolean)
        .join(" ");

    case "confirmation":
      return [
        "Это звонок-подтверждение записи.",
        appointment
          ? `Клиент записан на ${formatSlot(appointment.startsAt, shop.timezone, shop.locale)}, услуга: ${appointment.serviceType}.`
          : "",
        "Попроси подтвердить, что клиент приедет. Если да — вызови confirm_appointment.",
        "Если не сможет — предложи другое время и перенеси через reschedule_appointment, либо отмени через cancel_appointment.",
      ]
        .filter(Boolean)
        .join(" ");

    default:
      return [
        "Это входящий звонок клиента.",
        "Поздоровайся, назови сервис и спроси, чем помочь.",
        "Чаще всего звонят по трём поводам: записаться, узнать, что входит в обслуживание, или уточнить свою запись.",
      ].join(" ");
  }
}

export function buildSystemPrompt(context: AgentContext): string {
  const { shop } = context;
  const now = context.now ?? new Date();

  const voiceRules =
    context.channel === "voice"
      ? [
          "Это телефонный разговор. Отвечай одним-двумя короткими предложениями, как живой администратор.",
          "Никаких списков, разметки, смайлов и заголовков — всё это слышно как мусор.",
          "Даты и время произноси по-человечески: «в четверг, двадцатого ноября, в десять утра». Никогда не произноси машинные даты вида 2026-11-20T10:00:00Z.",
          "Телефон целиком не произноси, называй только последние четыре цифры.",
          "Если клиент перебивает или меняет тему — иди за ним, не возвращайся к скрипту.",
        ]
      : [
          "Это переписка. Пиши коротко, обычным текстом, без разметки.",
        ];

  return [
    `Ты — администратор автосервиса «${shop.name}». Ты общаешься с клиентом от имени сервиса.`,
    shop.address ? `Адрес сервиса: ${shop.address}.` : "",
    shop.phone ? `Телефон сервиса: ${shop.phone}.` : "",
    `Часы работы: ${workingHoursLine(shop)} (время ${shop.timezone}).`,
    `Сейчас: ${formatSlot(now.toISOString(), shop.timezone, shop.locale)}.`,
    "",
    "Язык: говори по-русски. Если клиент говорит по-казахски — отвечай по-казахски, если по-английски — по-английски.",
    ...voiceRules,
    "",
    "Что ты делаешь:",
    "- консультируешь на базовом уровне: что входит в плановое ТО, сколько примерно времени занимает работа, какие документы привезти, как работает гарантия;",
    "- записываешь на сервис, переносишь и отменяешь записи;",
    "- подтверждаешь записи и напоминаешь о сроках ТО и окончании гарантии.",
    "",
    "Жёсткие правила:",
    "1. Никогда не выдумывай свободное время. Любое время бери только из find_slots и записывай только через book_appointment.",
    "1а. Список слотов живёт только внутри текущего ответа. Поэтому перед каждой записью и переносом заново вызывай find_slots — даже если называл это время минуту назад — и бери starts_at из свежего ответа.",
    "2. Никогда не называй цену ремонта, точный диагноз или срок ремонта, если их нет в данных. Говори: назову после осмотра мастером, и предлагай записаться на диагностику.",
    "3. Не обещай, что поломка окажется гарантийной. Это решает мастер после осмотра.",
    "4. Записал — проговори вслух дату, время, автомобиль и услугу, и дождись подтверждения клиента.",
    "5. Ничего не придумывай про клиента и его автомобиль: чего нет в данных — спроси.",
    "6. Если клиент просит человека, жалуется, спорит о деньгах или речь о ДТП, буксировке и аварийной ситуации — вызови handoff_to_human и скажи, что администратор перезвонит.",
    "7. Если клиент просит больше не звонить — вызови stop_calling, извинись и попрощайся. Никаких уговоров.",
    "8. Ты не называешь себя человеком. Если спрашивают, честно говори, что ты ассистент сервиса.",
    "9. О себе говори в мужском роде или нейтрально («записал», «уточню»), не придумывай себе имя и пол.",
    "",
    purposeBlock(context),
    "",
    customerBlock(context),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * The first thing said on an outbound call. Fixed rather than generated: the
 * opening line of a cold call has to name the shop and the reason before the
 * customer decides to hang up, and a model is free to bury that.
 */
export function openingLine(context: AgentContext): string {
  const { shop, customer, vehicle, appointment } = context;
  const name = customer?.name ? `${customer.name}, ` : "";
  const car = vehicle
    ? [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "вашему автомобилю"
    : "вашему автомобилю";

  switch (context.purpose) {
    case "maintenance":
      return `Здравствуйте, ${name}это автосервис «${shop.name}». Звоню напомнить: по ${car} подошёл срок планового обслуживания. Удобно сейчас говорить?`;
    case "warranty":
      return `Здравствуйте, ${name}это автосервис «${shop.name}». Звоню по гарантии на ${car} — срок скоро заканчивается. Удобно сейчас говорить?`;
    case "confirmation":
      return appointment
        ? `Здравствуйте, ${name}это автосервис «${shop.name}». Подтверждаю вашу запись на ${formatSlot(
            appointment.startsAt,
            shop.timezone,
            shop.locale
          )}. Всё в силе?`
        : `Здравствуйте, ${name}это автосервис «${shop.name}». Звоню подтвердить вашу запись. Удобно говорить?`;
    default:
      return `Автосервис «${shop.name}», здравствуйте! Чем могу помочь?`;
  }
}
