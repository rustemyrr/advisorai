/**
 * Adapter for a 1C DMS published over the standard OData interface
 * (`/<infobase>/odata/standard.odata`), Basic auth.
 *
 * Two things make 1C different from a purpose-built CRM, and both shape this
 * file:
 *
 * 1. Entity and property names are configuration-specific. Every name used
 *    here comes from SERVICE_AGENT_1C_ENTITIES, so a shop on a non-standard
 *    configuration maps its own names instead of patching code.
 * 2. A 1C base usually knows what was done (заказ-наряды) but not when the car
 *    is due next. So "due for service" is derived here from the last closed
 *    order plus the shop interval, instead of read from a field that in most
 *    bases does not exist. A base that does carry the date can name the field
 *    in the entity map and it is used directly.
 *
 * Writes: a published OData interface accepts POST, but many installations
 * publish read-only, and booking into the wrong 1C document is worse than not
 * booking at all. So an appointment is only written to 1C when the entity map
 * names the document for it; otherwise createAppointment throws
 * ProviderUnsupported and the agent takes the booking down for an
 * administrator rather than dropping it.
 */

import { odata1cConfig, shopFromEnv } from "../config";
import {
  ProviderUnsupported,
  type BookedInterval,
  type ConfirmationRow,
  type DueRow,
  type NewAppointment,
  type NewCustomer,
  type NewVehicle,
  type ServiceDataProvider,
} from "../provider";
import { addMonths, normalizePhone } from "../time";
import type {
  Appointment,
  AppointmentStatus,
  Customer,
  CustomerWithVehicles,
  ServiceShop,
  Vehicle,
  Visit,
} from "../types";

const ODATA_TIMEOUT_MS = 8000;

type Json = Record<string, unknown>;

type EntityMap = {
  customers: string;
  customerPhone: string;
  customerName: string;
  vehicles: string;
  vehicleOwner: string;
  orders: string;
  /** Optional names a non-standard base can supply. */
  vehicleMake?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  vehicleVin?: string;
  vehicleMileage?: string;
  vehicleNextService?: string;
  vehicleWarrantyUntil?: string;
  orderVehicle?: string;
  orderDate?: string;
  orderMileage?: string;
  orderWorks?: string;
  orderTotal?: string;
  appointments?: string;
  appointmentVehicle?: string;
  appointmentStart?: string;
};

function entities(): EntityMap {
  return odata1cConfig().entities as EntityMap;
}

function pick(row: Json, name: string | undefined, fallback = ""): string {
  if (!name) return fallback;
  const value = row[name];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function pickInt(row: Json, name: string | undefined): number | null {
  if (!name) return null;
  const value = row[name];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

/** 1C writes dates as 0001-01-01T00:00:00 when the field is simply empty. */
function pickDate(row: Json, name: string | undefined): string | null {
  const raw = pick(row, name);
  if (!raw || raw.startsWith("0001-01-01")) return null;
  return raw;
}

function escapeOData(value: string): string {
  return value.replace(/'/g, "''");
}

export class Odata1cServiceProvider implements ServiceDataProvider {
  readonly mode = "odata-1c" as const;

  private async request<T>(
    path: string,
    query: Record<string, string> = {},
    init: { method?: string; body?: unknown } = {}
  ): Promise<T> {
    const config = odata1cConfig();
    if (!config.baseUrl) {
      throw new ProviderUnsupported(path, "odata-1c (SERVICE_AGENT_1C_BASE_URL unset)");
    }

    const url = new URL(`${config.baseUrl.replace(/\/$/, "")}/${path}`);
    url.searchParams.set("$format", "json");
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    if (config.username) {
      const basic = Buffer.from(
        `${config.username}:${config.password ?? ""}`
      ).toString("base64");
      headers.Authorization = `Basic ${basic}`;
    }
    if (init.body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(url, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(ODATA_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `[service-agent/1c] ${init.method ?? "GET"} ${path} -> ${response.status}`
      );
    }
    return (await response.json()) as T;
  }

  private async collection(
    path: string,
    query: Record<string, string> = {}
  ): Promise<Json[]> {
    const payload = await this.request<{ value?: Json[] }>(path, query);
    return Array.isArray(payload.value) ? payload.value : [];
  }

  async getShop(): Promise<ServiceShop> {
    return shopFromEnv();
  }

  async findCustomerByPhone(
    shop: ServiceShop,
    phone: string
  ): Promise<CustomerWithVehicles | null> {
    const map = entities();
    // The national number without the +7 is what a 1C contact field usually
    // holds, in any of a dozen spacings -- so match on the digits that remain.
    const local = phone.replace(/\D/g, "").slice(-10);
    const rows = await this.collection(map.customers, {
      $filter: `substringof('${escapeOData(local)}', ${map.customerPhone})`,
      $top: "5",
    });

    const row = rows[0];
    if (!row) return null;

    const id = pick(row, "Ref_Key");
    const customer: Customer = {
      id,
      name: pick(row, map.customerName),
      phone,
      callsAllowed: true,
      notes: null,
    };

    const vehicles = await this.vehiclesOf(id);
    return { ...customer, vehicles };
  }

  private async vehiclesOf(customerId: string): Promise<Vehicle[]> {
    const map = entities();
    const rows = await this.collection(map.vehicles, {
      $filter: `${map.vehicleOwner} eq guid'${escapeOData(customerId)}'`,
      $top: "20",
    });

    return rows.map((row) => ({
      id: pick(row, "Ref_Key"),
      customerId,
      make: pick(row, map.vehicleMake ?? "МаркаАвтомобиля"),
      model: pick(row, map.vehicleModel ?? "МодельАвтомобиля"),
      year: pickInt(row, map.vehicleMake ? undefined : "ГодВыпуска"),
      plate: pick(row, map.vehiclePlate ?? "ГосударственныйНомер") || null,
      vin: pick(row, map.vehicleVin ?? "VIN") || null,
      mileage: pickInt(row, map.vehicleMileage ?? "Пробег"),
      lastServiceAt: null,
      nextServiceDueAt: pickDate(row, map.vehicleNextService),
      nextServiceDueKm: null,
      warrantyUntil: pickDate(row, map.vehicleWarrantyUntil),
      warrantyKm: null,
    }));
  }

  async createCustomer(
    _shop: ServiceShop,
    _input: NewCustomer
  ): Promise<Customer> {
    // Writing a new контрагент into a live 1C base from a phone call is the
    // kind of write that needs a person. The caller is served by the agent
    // taking the booking for an administrator instead.
    throw new ProviderUnsupported("createCustomer", this.mode);
  }

  async addVehicle(_shop: ServiceShop, _input: NewVehicle): Promise<Vehicle> {
    throw new ProviderUnsupported("addVehicle", this.mode);
  }

  async listVisits(
    _shop: ServiceShop,
    vehicleId: string,
    limit = 5
  ): Promise<Visit[]> {
    const map = entities();
    const vehicleField = map.orderVehicle ?? "Автомобиль_Key";
    const dateField = map.orderDate ?? "Date";

    const rows = await this.collection(map.orders, {
      $filter: `${vehicleField} eq guid'${escapeOData(vehicleId)}'`,
      $orderby: `${dateField} desc`,
      $top: String(limit),
    });

    return rows.map((row) => ({
      id: pick(row, "Ref_Key"),
      vehicleId,
      performedAt: pickDate(row, dateField) ?? "",
      mileage: pickInt(row, map.orderMileage ?? "Пробег"),
      works: pick(row, map.orderWorks ?? "Комментарий"),
      total: pickInt(row, map.orderTotal ?? "СуммаДокумента"),
      currency: "KZT",
    }));
  }

  async listAppointments(
    _shop: ServiceShop,
    _customerId: string
  ): Promise<Appointment[]> {
    const map = entities();
    if (!map.appointments) return [];
    const rows = await this.collection(map.appointments, { $top: "20" });
    return rows.map((row) => this.toAppointment(row));
  }

  async listBookedIntervals(
    shop: ServiceShop,
    fromIso: string,
    toIso: string
  ): Promise<BookedInterval[]> {
    const map = entities();
    if (!map.appointments) {
      // Nothing in 1C to read bookings from: the grid is then driven by what
      // the agent itself booked, which the caller merges in.
      return [];
    }
    const startField = map.appointmentStart ?? "Date";
    const rows = await this.collection(map.appointments, {
      $filter: `${startField} ge datetime'${fromIso.slice(0, 19)}' and ${startField} le datetime'${toIso.slice(0, 19)}'`,
      $top: "500",
    });

    return rows.flatMap((row) => {
      const startsAt = pickDate(row, startField);
      if (!startsAt) return [];
      const start = new Date(startsAt);
      return [
        {
          startsAt: start.toISOString(),
          endsAt: new Date(start.getTime() + shop.slotMinutes * 60000).toISOString(),
        },
      ];
    });
  }

  async createAppointment(
    _shop: ServiceShop,
    input: NewAppointment
  ): Promise<Appointment> {
    const map = entities();
    if (!map.appointments) {
      throw new ProviderUnsupported("createAppointment", this.mode);
    }
    const payload = await this.request<Json>(map.appointments, {}, {
      method: "POST",
      body: {
        [map.appointmentStart ?? "Date"]: input.startsAt,
        [map.appointmentVehicle ?? "Автомобиль_Key"]: input.vehicleId,
        Комментарий: input.notes ?? "",
      },
    });
    return this.toAppointment(payload);
  }

  async setAppointmentStatus(
    _shop: ServiceShop,
    _appointmentId: string,
    _status: AppointmentStatus
  ): Promise<Appointment> {
    throw new ProviderUnsupported("setAppointmentStatus", this.mode);
  }

  async rescheduleAppointment(
    _shop: ServiceShop,
    _appointmentId: string,
    _startsAt: string,
    _endsAt: string
  ): Promise<Appointment> {
    throw new ProviderUnsupported("rescheduleAppointment", this.mode);
  }

  /**
   * Due for service, derived from the last closed order per car plus the shop
   * interval -- or read straight from the vehicle when the base carries the
   * date and the entity map names that field.
   */
  async listMaintenanceDue(
    shop: ServiceShop,
    throughIso: string
  ): Promise<DueRow[]> {
    const map = entities();

    if (map.vehicleNextService) {
      const rows = await this.collection(map.vehicles, {
        $filter: `${map.vehicleNextService} le datetime'${throughIso}T00:00:00'`,
        $top: "200",
      });
      return this.withOwners(rows, shop);
    }

    // No such field: look at the orders closed one interval ago, and treat the
    // cars in them as due now.
    const dateField = map.orderDate ?? "Date";
    const windowStart = addMonths(throughIso, -shop.maintenanceIntervalMonths - 1);
    const windowEnd = addMonths(throughIso, -shop.maintenanceIntervalMonths);
    const orders = await this.collection(map.orders, {
      $filter: `${dateField} ge datetime'${windowStart}T00:00:00' and ${dateField} le datetime'${windowEnd}T23:59:59'`,
      $orderby: `${dateField} desc`,
      $top: "200",
    });

    const vehicleField = map.orderVehicle ?? "Автомобиль_Key";
    const seen = new Set<string>();
    const vehicleIds = orders
      .map((row) => pick(row, vehicleField))
      .filter((id) => id && !seen.has(id) && (seen.add(id), true));

    const rows: Json[] = [];
    for (const id of vehicleIds.slice(0, 100)) {
      const found = await this.collection(map.vehicles, {
        $filter: `Ref_Key eq guid'${escapeOData(id)}'`,
        $top: "1",
      });
      if (found[0]) rows.push(found[0]);
    }
    return this.withOwners(rows, shop);
  }

  async listWarrantyExpiring(
    shop: ServiceShop,
    throughIso: string
  ): Promise<DueRow[]> {
    const map = entities();
    if (!map.vehicleWarrantyUntil) {
      // Without a warranty field there is nothing to go on; the shop maps it
      // in SERVICE_AGENT_1C_ENTITIES or runs warranty reminders on Supabase.
      throw new ProviderUnsupported("listWarrantyExpiring", this.mode);
    }
    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.collection(map.vehicles, {
      $filter: `${map.vehicleWarrantyUntil} ge datetime'${today}T00:00:00' and ${map.vehicleWarrantyUntil} le datetime'${throughIso}T23:59:59'`,
      $top: "200",
    });
    return this.withOwners(rows, shop);
  }

  async listAppointmentsToConfirm(
    _shop: ServiceShop,
    _fromIso: string,
    _toIso: string
  ): Promise<ConfirmationRow[]> {
    // Confirmations run off the bookings the agent itself made, which live in
    // our own tables even in this mode.
    return [];
  }

  private toAppointment(row: Json): Appointment {
    const map = entities();
    const startsAt = pickDate(row, map.appointmentStart ?? "Date") ?? "";
    return {
      id: pick(row, "Ref_Key"),
      customerId: pick(row, "Контрагент_Key"),
      vehicleId: pick(row, map.appointmentVehicle ?? "Автомобиль_Key") || null,
      startsAt: startsAt ? new Date(startsAt).toISOString() : "",
      endsAt: "",
      serviceType: "maintenance",
      status: "booked",
      source: "inbound_call",
      notes: pick(row, "Комментарий") || null,
    };
  }

  /** Attaches the owner to each vehicle row, dropping rows with no phone. */
  private async withOwners(rows: Json[], _shop: ServiceShop): Promise<DueRow[]> {
    const map = entities();
    const out: DueRow[] = [];

    for (const row of rows) {
      const ownerId = pick(row, map.vehicleOwner);
      if (!ownerId) continue;

      const owners = await this.collection(map.customers, {
        $filter: `Ref_Key eq guid'${escapeOData(ownerId)}'`,
        $top: "1",
      });
      const owner = owners[0];
      if (!owner) continue;

      const phone = normalizePhone(pick(owner, map.customerPhone));
      if (!phone) continue;

      out.push({
        customer: {
          id: ownerId,
          name: pick(owner, map.customerName),
          phone,
          callsAllowed: true,
          notes: null,
        },
        vehicle: {
          id: pick(row, "Ref_Key"),
          customerId: ownerId,
          make: pick(row, map.vehicleMake ?? "МаркаАвтомобиля"),
          model: pick(row, map.vehicleModel ?? "МодельАвтомобиля"),
          year: null,
          plate: pick(row, map.vehiclePlate ?? "ГосударственныйНомер") || null,
          vin: pick(row, map.vehicleVin ?? "VIN") || null,
          mileage: pickInt(row, map.vehicleMileage ?? "Пробег"),
          lastServiceAt: null,
          nextServiceDueAt: pickDate(row, map.vehicleNextService),
          nextServiceDueKm: null,
          warrantyUntil: pickDate(row, map.vehicleWarrantyUntil),
          warrantyKm: null,
        },
      });
    }

    return out;
  }
}
