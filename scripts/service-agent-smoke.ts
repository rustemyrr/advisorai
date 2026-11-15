/**
 * Smoke test for the service agent, with no database and no telephony.
 *
 * It swaps in an in-memory shop -- one customer, one car, one booking -- and
 * holds three short conversations against the real model and the real tools:
 * booking, a warranty question, and a confirmation call. Then it runs the
 * reminder pass over the same fake data.
 *
 * Needs only ANTHROPIC_API_KEY. Run from the project root:
 *
 *   npx tsx --env-file=.env.local scripts/service-agent-smoke.ts
 *
 * It costs a handful of model calls, writes nothing anywhere, and prints what
 * the agent said plus which tools it used -- which is what tells you the
 * prompt and the tool contract still hold after a change.
 */

import { runAgentTurn } from "../lib/service-agent/agent";
import { shopFromEnv } from "../lib/service-agent/config";
import { ProviderUnsupported } from "../lib/service-agent/provider";
import type {
  BookedInterval,
  ConfirmationRow,
  DueRow,
  NewAppointment,
  NewCustomer,
  NewVehicle,
  ServiceDataProvider,
} from "../lib/service-agent/provider";
import { setProvider } from "../lib/service-agent/providers";
import { runReminders } from "../lib/service-agent/reminders";
import { openSession } from "../lib/service-agent/session";
import { addDays, zonedDateString, zonedToUtc } from "../lib/service-agent/time";
import type {
  Appointment,
  AppointmentStatus,
  Customer,
  CustomerWithVehicles,
  ServiceShop,
  Vehicle,
  Visit,
} from "../lib/service-agent/types";

const shop: ServiceShop = { ...shopFromEnv(), id: "smoke", name: "Автосервис на Кабанбай батыра" };
const today = zonedDateString(new Date(), shop.timezone);

const customer: Customer = {
  id: "cust-1",
  name: "Руслан",
  phone: "+77011234567",
  callsAllowed: true,
  notes: null,
};

const vehicle: Vehicle = {
  id: "veh-1",
  customerId: customer.id,
  make: "Toyota",
  model: "Camry",
  year: 2022,
  plate: "123ABC02",
  vin: null,
  mileage: 58400,
  lastServiceAt: `${addDays(today, -350)}T10:00:00.000Z`,
  nextServiceDueAt: addDays(today, 7),
  nextServiceDueKm: 60000,
  warrantyUntil: addDays(today, 20),
  warrantyKm: 100000,
};

class FakeProvider implements ServiceDataProvider {
  readonly mode = "supabase" as const;
  appointments: Appointment[] = [
    {
      id: "appt-1",
      customerId: customer.id,
      vehicleId: vehicle.id,
      startsAt: zonedToUtc(addDays(today, 1), "11:00", shop.timezone).toISOString(),
      endsAt: zonedToUtc(addDays(today, 1), "12:00", shop.timezone).toISOString(),
      serviceType: "maintenance",
      status: "booked",
      source: "inbound_call",
      notes: null,
    },
  ];

  async getShop(): Promise<ServiceShop> {
    return shop;
  }

  async findCustomerByPhone(
    _shop: ServiceShop,
    phone: string
  ): Promise<CustomerWithVehicles | null> {
    return phone === customer.phone ? { ...customer, vehicles: [vehicle] } : null;
  }

  async createCustomer(_shop: ServiceShop, input: NewCustomer): Promise<Customer> {
    return { id: "cust-new", name: input.name, phone: input.phone, callsAllowed: true, notes: null };
  }

  async addVehicle(_shop: ServiceShop, input: NewVehicle): Promise<Vehicle> {
    return { ...vehicle, id: "veh-new", customerId: input.customerId, make: input.make, model: input.model };
  }

  async listVisits(): Promise<Visit[]> {
    return [
      {
        id: "visit-1",
        vehicleId: vehicle.id,
        performedAt: vehicle.lastServiceAt ?? "",
        mileage: 48000,
        works: "Замена масла и фильтров, диагностика тормозов",
        total: 48000,
        currency: "KZT",
      },
    ];
  }

  async listAppointments(): Promise<Appointment[]> {
    return this.appointments;
  }

  async listBookedIntervals(
    _shop: ServiceShop,
    fromIso: string,
    toIso: string
  ): Promise<BookedInterval[]> {
    return this.appointments
      .filter((a) => a.startsAt >= fromIso && a.startsAt <= toIso)
      .map((a) => ({ startsAt: a.startsAt, endsAt: a.endsAt }));
  }

  async createAppointment(
    _shop: ServiceShop,
    input: NewAppointment
  ): Promise<Appointment> {
    const appointment: Appointment = {
      id: `appt-${this.appointments.length + 1}`,
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      serviceType: input.serviceType,
      status: "booked",
      source: input.source,
      notes: input.notes ?? null,
    };
    this.appointments.push(appointment);
    return appointment;
  }

  async setAppointmentStatus(
    _shop: ServiceShop,
    appointmentId: string,
    status: AppointmentStatus
  ): Promise<Appointment> {
    const found = this.appointments.find((a) => a.id === appointmentId);
    if (!found) throw new ProviderUnsupported("setAppointmentStatus", "smoke");
    found.status = status;
    return found;
  }

  async rescheduleAppointment(
    _shop: ServiceShop,
    appointmentId: string,
    startsAt: string,
    endsAt: string
  ): Promise<Appointment> {
    const found = this.appointments.find((a) => a.id === appointmentId);
    if (!found) throw new ProviderUnsupported("rescheduleAppointment", "smoke");
    found.startsAt = startsAt;
    found.endsAt = endsAt;
    return found;
  }

  async listMaintenanceDue(): Promise<DueRow[]> {
    return [{ customer, vehicle }];
  }

  async listWarrantyExpiring(): Promise<DueRow[]> {
    return [{ customer, vehicle }];
  }

  async listAppointmentsToConfirm(): Promise<ConfirmationRow[]> {
    return this.appointments
      .filter((a) => a.status === "booked")
      .map((appointment) => ({ appointment, customer, vehicle }));
  }
}

const fake = new FakeProvider();
setProvider(fake);

async function conversation(
  title: string,
  lines: string[],
  options: { purpose?: "inbound" | "confirmation" | "warranty"; appointmentId?: string } = {}
) {
  console.log(`\n=== ${title} ===`);
  const { session } = await openSession({
    channel: "voice",
    purpose: options.purpose ?? "inbound",
    phone: customer.phone,
    appointmentId: options.appointmentId ?? null,
  });

  let history: Awaited<ReturnType<typeof runAgentTurn>>["messages"] = [];
  for (const line of lines) {
    console.log(`клиент: ${line}`);
    const turn = await runAgentTurn(session, history, line);
    history = turn.messages;
    console.log(`агент:  ${turn.reply}`);
    if (turn.toolsUsed.length > 0) console.log(`        [${turn.toolsUsed.join(", ")}]`);
  }
  console.log("итог:", JSON.stringify(session.outcome));
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set");
    process.exit(1);
  }

  await conversation("Запись на ТО", [
    "Здравствуйте! Хочу записаться на плановое ТО.",
    "Давайте на ближайшее утро, какое есть.",
  ]);

  await conversation("Вопрос про гарантию", [
    "Скажите, у меня стучит что-то спереди. Это по гарантии?",
  ]);

  await conversation(
    "Подтверждение записи",
    ["Да, всё в силе, приеду."],
    { purpose: "confirmation", appointmentId: "appt-1" }
  );

  console.log("\n=== Проход напоминаний ===");
  const result = await runReminders();
  console.log(JSON.stringify(result, null, 2));

  console.log("\n=== Записи после прогона ===");
  console.log(JSON.stringify(fake.appointments, null, 2));
}

void main();
