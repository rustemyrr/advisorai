/**
 * The seam between the agent and whatever system the shop already runs.
 *
 * The agent never talks to Supabase, a CRM or 1C directly -- it asks a
 * ServiceDataProvider. That is what lets the same conversation logic serve a
 * shop with nothing but our tables, a shop whose CRM owns the customer list,
 * and a shop whose 1C DMS owns everything.
 *
 * Free slots are NOT part of this interface on purpose: they are computed in
 * lib/service-agent/slots.ts from the opening hours, the number of bays and the
 * bookings a provider reports, so every backend gets the same answer.
 */

import type { ProviderMode } from "./config";
import type {
  Appointment,
  AppointmentSource,
  AppointmentStatus,
  Customer,
  CustomerWithVehicles,
  ServiceShop,
  Vehicle,
  Visit,
} from "./types";

/**
 * Thrown by an adapter for something the shop system cannot do -- a read-only
 * 1C publication that will not accept a booking, for instance. The agent turns
 * this into "I will pass this to an administrator" rather than a failure, so a
 * missing capability never ends a call badly.
 */
export class ProviderUnsupported extends Error {
  constructor(operation: string, mode: string) {
    super(`Operation ${operation} is not available in provider mode ${mode}`);
    this.name = "ProviderUnsupported";
  }
}

export type NewCustomer = {
  phone: string;
  name: string;
};

export type NewVehicle = {
  customerId: string;
  make: string;
  model: string;
  plate?: string | null;
  year?: number | null;
  mileage?: number | null;
};

export type NewAppointment = {
  customerId: string;
  vehicleId: string | null;
  startsAt: string;
  endsAt: string;
  serviceType: string;
  source: AppointmentSource;
  notes?: string | null;
};

export type BookedInterval = {
  startsAt: string;
  endsAt: string;
};

/** A reminder subject: who to call and about which car. */
export type DueRow = {
  customer: Customer;
  vehicle: Vehicle;
};

export type ConfirmationRow = {
  appointment: Appointment;
  customer: Customer;
  vehicle: Vehicle | null;
};

export interface ServiceDataProvider {
  readonly mode: ProviderMode;

  /** Shop settings. `ref` is a shop id, or a user id in Supabase mode. */
  getShop(ref?: string | null): Promise<ServiceShop>;

  findCustomerByPhone(
    shop: ServiceShop,
    phone: string
  ): Promise<CustomerWithVehicles | null>;

  createCustomer(shop: ServiceShop, input: NewCustomer): Promise<Customer>;

  addVehicle(shop: ServiceShop, input: NewVehicle): Promise<Vehicle>;

  listVisits(
    shop: ServiceShop,
    vehicleId: string,
    limit?: number
  ): Promise<Visit[]>;

  listAppointments(
    shop: ServiceShop,
    customerId: string
  ): Promise<Appointment[]>;

  /** Everything already booked in the window, used to find the free slots. */
  listBookedIntervals(
    shop: ServiceShop,
    fromIso: string,
    toIso: string
  ): Promise<BookedInterval[]>;

  createAppointment(
    shop: ServiceShop,
    input: NewAppointment
  ): Promise<Appointment>;

  setAppointmentStatus(
    shop: ServiceShop,
    appointmentId: string,
    status: AppointmentStatus
  ): Promise<Appointment>;

  rescheduleAppointment(
    shop: ServiceShop,
    appointmentId: string,
    startsAt: string,
    endsAt: string
  ): Promise<Appointment>;

  /** Cars whose next service falls on or before `throughIso` (a date). */
  listMaintenanceDue(shop: ServiceShop, throughIso: string): Promise<DueRow[]>;

  /** Cars whose warranty ends on or before `throughIso` (a date). */
  listWarrantyExpiring(
    shop: ServiceShop,
    throughIso: string
  ): Promise<DueRow[]>;

  /** Bookings in the window that nobody has confirmed yet. */
  listAppointmentsToConfirm(
    shop: ServiceShop,
    fromIso: string,
    toIso: string
  ): Promise<ConfirmationRow[]>;
}
