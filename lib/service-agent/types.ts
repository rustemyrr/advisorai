/**
 * Domain types for the customer-facing service agent.
 *
 * These describe what the agent reasons about -- a customer, their car, what
 * was done to it, when it is due again -- and deliberately not how any one
 * system stores it. A shop on Supabase, a shop on its own CRM and a shop on a
 * 1C DMS all come through the same shapes, so the prompt, the tools and the
 * reminder logic are written once (see lib/service-agent/provider.ts).
 */

export type ServiceShop = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  timezone: string;
  locale: string;
  /** Weekday (0 = Sunday) to [open, close] in HH:MM local time. */
  workingHours: Record<string, [string, string]>;
  slotMinutes: number;
  bays: number;
  maintenanceIntervalKm: number;
  maintenanceIntervalMonths: number;
  maintenanceLeadDays: number;
  warrantyLeadDays: number;
};

export type Customer = {
  id: string;
  /** E.164, e.g. +77011234567. */
  phone: string;
  name: string;
  callsAllowed: boolean;
  notes: string | null;
};

export type Vehicle = {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year: number | null;
  plate: string | null;
  vin: string | null;
  mileage: number | null;
  lastServiceAt: string | null;
  /** ISO date (YYYY-MM-DD). */
  nextServiceDueAt: string | null;
  nextServiceDueKm: number | null;
  warrantyUntil: string | null;
  warrantyKm: number | null;
};

export type CustomerWithVehicles = Customer & { vehicles: Vehicle[] };

export type Visit = {
  id: string;
  vehicleId: string;
  performedAt: string;
  mileage: number | null;
  works: string;
  total: number | null;
  currency: string;
};

export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type AppointmentSource =
  | "inbound_call"
  | "outbound_call"
  | "chat"
  | "admin";

export type Appointment = {
  id: string;
  customerId: string;
  vehicleId: string | null;
  /** ISO timestamp, UTC. */
  startsAt: string;
  endsAt: string;
  serviceType: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  notes: string | null;
};

export type Slot = {
  /** ISO timestamp, UTC. */
  startsAt: string;
  endsAt: string;
};

export type ReminderKind = "maintenance" | "warranty" | "confirmation";

/**
 * Something the agent means to tell one customer once. `dedupeKey` is what
 * keeps a daily cron from calling the same person about the same service every
 * morning until they pick up.
 */
export type ReminderTask = {
  kind: ReminderKind;
  dedupeKey: string;
  dueOn: string;
  customer: Customer;
  vehicle: Vehicle | null;
  appointment: Appointment | null;
  /** One sentence of why this call is being made, for the call prompt. */
  reason: string;
};

export type CallPurpose = "inbound" | ReminderKind;

export type TranscriptTurn = {
  role: "customer" | "agent";
  text: string;
  at?: string;
};
