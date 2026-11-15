/**
 * The provider a shop gets when the agent keeps the data itself.
 *
 * Writes go through the service-role client, because the tables in migration
 * 0006 have RLS on with select-only policies -- the same arrangement the rest
 * of this app uses for anything the browser must not be able to write.
 */

import { createAdminClient } from "@/lib/supabase-server";
import { shopFromEnv } from "../config";
import type {
  BookedInterval,
  ConfirmationRow,
  DueRow,
  NewAppointment,
  NewCustomer,
  NewVehicle,
  ServiceDataProvider,
} from "../provider";
import type {
  Appointment,
  AppointmentStatus,
  Customer,
  CustomerWithVehicles,
  ServiceShop,
  Vehicle,
  Visit,
} from "../types";

type ShopRow = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  timezone: string;
  locale: string;
  working_hours: Record<string, [string, string]>;
  slot_minutes: number;
  bays: number;
  maintenance_interval_km: number;
  maintenance_interval_months: number;
  maintenance_lead_days: number;
  warranty_lead_days: number;
};

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  calls_allowed: boolean;
  notes: string | null;
};

type VehicleRow = {
  id: string;
  customer_id: string;
  make: string;
  model: string;
  year: number | null;
  plate: string | null;
  vin: string | null;
  mileage: number | null;
  last_service_at: string | null;
  next_service_due_at: string | null;
  next_service_due_km: number | null;
  warranty_until: string | null;
  warranty_km: number | null;
};

type AppointmentRow = {
  id: string;
  customer_id: string;
  vehicle_id: string | null;
  starts_at: string;
  ends_at: string;
  service_type: string;
  status: AppointmentStatus;
  source: Appointment["source"];
  notes: string | null;
};

type VisitRow = {
  id: string;
  vehicle_id: string;
  performed_at: string;
  mileage: number | null;
  works: string;
  total: number | null;
  currency: string;
};

const CUSTOMER_COLUMNS = "id, name, phone, calls_allowed, notes";
const VEHICLE_COLUMNS =
  "id, customer_id, make, model, year, plate, vin, mileage, last_service_at, next_service_due_at, next_service_due_km, warranty_until, warranty_km";
const APPOINTMENT_COLUMNS =
  "id, customer_id, vehicle_id, starts_at, ends_at, service_type, status, source, notes";

function toShop(row: ShopRow): ServiceShop {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    timezone: row.timezone,
    locale: row.locale,
    workingHours: row.working_hours ?? {},
    slotMinutes: row.slot_minutes,
    bays: row.bays,
    maintenanceIntervalKm: row.maintenance_interval_km,
    maintenanceIntervalMonths: row.maintenance_interval_months,
    maintenanceLeadDays: row.maintenance_lead_days,
    warrantyLeadDays: row.warranty_lead_days,
  };
}

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    callsAllowed: row.calls_allowed,
    notes: row.notes,
  };
}

function toVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    customerId: row.customer_id,
    make: row.make,
    model: row.model,
    year: row.year,
    plate: row.plate,
    vin: row.vin,
    mileage: row.mileage,
    lastServiceAt: row.last_service_at,
    nextServiceDueAt: row.next_service_due_at,
    nextServiceDueKm: row.next_service_due_km,
    warrantyUntil: row.warranty_until,
    warrantyKm: row.warranty_km,
  };
}

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    customerId: row.customer_id,
    vehicleId: row.vehicle_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    serviceType: row.service_type,
    status: row.status,
    source: row.source,
    notes: row.notes,
  };
}

function toVisit(row: VisitRow): Visit {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    performedAt: row.performed_at,
    mileage: row.mileage,
    works: row.works,
    total: row.total,
    currency: row.currency,
  };
}

function fail(operation: string, message: string): never {
  throw new Error(`[service-agent/supabase] ${operation}: ${message}`);
}

export class SupabaseServiceProvider implements ServiceDataProvider {
  readonly mode = "supabase" as const;

  /**
   * `ref` is a shop id or the owner user id. With neither a ref nor a row in
   * the table, the env-configured shop is returned so a fresh deployment can
   * still hold a conversation -- it just has nowhere to look customers up.
   */
  async getShop(ref?: string | null): Promise<ServiceShop> {
    const db = createAdminClient();
    const query = db
      .from("service_shops")
      .select(
        "id, name, phone, address, timezone, locale, working_hours, slot_minutes, bays, maintenance_interval_km, maintenance_interval_months, maintenance_lead_days, warranty_lead_days"
      )
      .limit(1);

    const { data, error } = ref
      ? await query.or(`id.eq.${ref},user_id.eq.${ref}`)
      : await query.order("created_at", { ascending: true });

    if (error) {
      console.error("[service-agent/supabase] getShop:", error.message);
      return shopFromEnv();
    }
    const row = (data as ShopRow[] | null)?.[0];
    return row ? toShop(row) : shopFromEnv();
  }

  async findCustomerByPhone(
    shop: ServiceShop,
    phone: string
  ): Promise<CustomerWithVehicles | null> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("service_customers")
      .select(CUSTOMER_COLUMNS)
      .eq("shop_id", shop.id)
      .eq("phone", phone)
      .maybeSingle();

    if (error) fail("findCustomerByPhone", error.message);
    if (!data) return null;

    const customer = toCustomer(data as CustomerRow);
    const { data: vehicles, error: vehicleError } = await db
      .from("service_vehicles")
      .select(VEHICLE_COLUMNS)
      .eq("shop_id", shop.id)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: true });

    if (vehicleError) fail("findCustomerByPhone/vehicles", vehicleError.message);

    return {
      ...customer,
      vehicles: ((vehicles ?? []) as VehicleRow[]).map(toVehicle),
    };
  }

  async createCustomer(
    shop: ServiceShop,
    input: NewCustomer
  ): Promise<Customer> {
    const db = createAdminClient();
    // Upsert, not insert: a caller who rings twice while the first row is being
    // written must not hit a unique-constraint error mid-conversation.
    const { data, error } = await db
      .from("service_customers")
      .upsert(
        { shop_id: shop.id, phone: input.phone, name: input.name },
        { onConflict: "shop_id,phone" }
      )
      .select(CUSTOMER_COLUMNS)
      .single();

    if (error) fail("createCustomer", error.message);
    return toCustomer(data as CustomerRow);
  }

  async addVehicle(shop: ServiceShop, input: NewVehicle): Promise<Vehicle> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("service_vehicles")
      .insert({
        shop_id: shop.id,
        customer_id: input.customerId,
        make: input.make,
        model: input.model,
        plate: input.plate ?? null,
        year: input.year ?? null,
        mileage: input.mileage ?? null,
        mileage_updated_at: input.mileage ? new Date().toISOString() : null,
      })
      .select(VEHICLE_COLUMNS)
      .single();

    if (error) fail("addVehicle", error.message);
    return toVehicle(data as VehicleRow);
  }

  async listVisits(
    shop: ServiceShop,
    vehicleId: string,
    limit = 5
  ): Promise<Visit[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("service_visits")
      .select("id, vehicle_id, performed_at, mileage, works, total, currency")
      .eq("shop_id", shop.id)
      .eq("vehicle_id", vehicleId)
      .order("performed_at", { ascending: false })
      .limit(limit);

    if (error) fail("listVisits", error.message);
    return ((data ?? []) as VisitRow[]).map(toVisit);
  }

  async listAppointments(
    shop: ServiceShop,
    customerId: string
  ): Promise<Appointment[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("service_appointments")
      .select(APPOINTMENT_COLUMNS)
      .eq("shop_id", shop.id)
      .eq("customer_id", customerId)
      .order("starts_at", { ascending: false })
      .limit(10);

    if (error) fail("listAppointments", error.message);
    return ((data ?? []) as AppointmentRow[]).map(toAppointment);
  }

  async listBookedIntervals(
    shop: ServiceShop,
    fromIso: string,
    toIso: string
  ): Promise<BookedInterval[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("service_appointments")
      .select("starts_at, ends_at")
      .eq("shop_id", shop.id)
      .in("status", ["booked", "confirmed"])
      .gte("starts_at", fromIso)
      .lte("starts_at", toIso);

    if (error) fail("listBookedIntervals", error.message);
    return ((data ?? []) as { starts_at: string; ends_at: string }[]).map(
      (row) => ({ startsAt: row.starts_at, endsAt: row.ends_at })
    );
  }

  async createAppointment(
    shop: ServiceShop,
    input: NewAppointment
  ): Promise<Appointment> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("service_appointments")
      .insert({
        shop_id: shop.id,
        customer_id: input.customerId,
        vehicle_id: input.vehicleId,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        service_type: input.serviceType,
        source: input.source,
        notes: input.notes ?? null,
      })
      .select(APPOINTMENT_COLUMNS)
      .single();

    if (error) fail("createAppointment", error.message);
    return toAppointment(data as AppointmentRow);
  }

  async setAppointmentStatus(
    shop: ServiceShop,
    appointmentId: string,
    status: AppointmentStatus
  ): Promise<Appointment> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("service_appointments")
      .update({
        status,
        confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
      })
      .eq("shop_id", shop.id)
      .eq("id", appointmentId)
      .select(APPOINTMENT_COLUMNS)
      .single();

    if (error) fail("setAppointmentStatus", error.message);
    return toAppointment(data as AppointmentRow);
  }

  async rescheduleAppointment(
    shop: ServiceShop,
    appointmentId: string,
    startsAt: string,
    endsAt: string
  ): Promise<Appointment> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("service_appointments")
      .update({ starts_at: startsAt, ends_at: endsAt, status: "booked", confirmed_at: null })
      .eq("shop_id", shop.id)
      .eq("id", appointmentId)
      .select(APPOINTMENT_COLUMNS)
      .single();

    if (error) fail("rescheduleAppointment", error.message);
    return toAppointment(data as AppointmentRow);
  }

  async listMaintenanceDue(
    shop: ServiceShop,
    throughIso: string
  ): Promise<DueRow[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("service_vehicles")
      .select(`${VEHICLE_COLUMNS}, service_customers!inner(${CUSTOMER_COLUMNS})`)
      .eq("shop_id", shop.id)
      .not("next_service_due_at", "is", null)
      .lte("next_service_due_at", throughIso)
      .eq("service_customers.calls_allowed", true)
      .limit(200);

    if (error) fail("listMaintenanceDue", error.message);
    return joinDueRows(data);
  }

  async listWarrantyExpiring(
    shop: ServiceShop,
    throughIso: string
  ): Promise<DueRow[]> {
    const db = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await db
      .from("service_vehicles")
      .select(`${VEHICLE_COLUMNS}, service_customers!inner(${CUSTOMER_COLUMNS})`)
      .eq("shop_id", shop.id)
      .not("warranty_until", "is", null)
      // Only a warranty that is still running: telling someone their warranty
      // ended last year is not a reason to call.
      .gte("warranty_until", today)
      .lte("warranty_until", throughIso)
      .eq("service_customers.calls_allowed", true)
      .limit(200);

    if (error) fail("listWarrantyExpiring", error.message);
    return joinDueRows(data);
  }

  async listAppointmentsToConfirm(
    shop: ServiceShop,
    fromIso: string,
    toIso: string
  ): Promise<ConfirmationRow[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("service_appointments")
      .select(
        `${APPOINTMENT_COLUMNS}, service_customers!inner(${CUSTOMER_COLUMNS}), service_vehicles(${VEHICLE_COLUMNS})`
      )
      .eq("shop_id", shop.id)
      .eq("status", "booked")
      .gte("starts_at", fromIso)
      .lte("starts_at", toIso)
      .eq("service_customers.calls_allowed", true)
      .limit(200);

    if (error) fail("listAppointmentsToConfirm", error.message);

    type JoinedAppointment = AppointmentRow & {
      service_customers: CustomerRow | CustomerRow[] | null;
      service_vehicles: VehicleRow | VehicleRow[] | null;
    };

    return ((data ?? []) as JoinedAppointment[]).flatMap((row) => {
      const customerRow = first(row.service_customers);
      if (!customerRow) return [];
      const vehicleRow = first(row.service_vehicles);
      return [
        {
          appointment: toAppointment(row),
          customer: toCustomer(customerRow),
          vehicle: vehicleRow ? toVehicle(vehicleRow) : null,
        },
      ];
    });
  }
}

/** Supabase returns an embedded row as an object or a one-element array. */
function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function joinDueRows(data: unknown): DueRow[] {
  type JoinedVehicle = VehicleRow & {
    service_customers: CustomerRow | CustomerRow[] | null;
  };
  return ((data ?? []) as JoinedVehicle[]).flatMap((row) => {
    const customerRow = first(row.service_customers);
    if (!customerRow) return [];
    return [{ customer: toCustomer(customerRow), vehicle: toVehicle(row) }];
  });
}
