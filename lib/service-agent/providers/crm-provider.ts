/**
 * Adapter for a shop whose own CRM is the source of truth, reached over HTTP.
 *
 * No two CRMs agree on paths or field names, so both are configurable
 * (SERVICE_AGENT_CRM_PATHS) and the field readers below accept the handful of
 * spellings the same field usually has. The contract a CRM has to meet is
 * written out in docs/service-agent.md -- when a CRM cannot meet part of it,
 * that one method throws ProviderUnsupported and the agent says it will pass
 * the request to an administrator instead of failing the call.
 */

import { crmConfig } from "../config";
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
import { shopFromEnv } from "../config";
import { normalizePhone } from "../time";
import type {
  Appointment,
  AppointmentStatus,
  Customer,
  CustomerWithVehicles,
  ServiceShop,
  Vehicle,
  Visit,
} from "../types";

/** A CRM must answer inside this, or the caller is left listening to silence. */
const CRM_TIMEOUT_MS = 6000;

type Json = Record<string, unknown>;

function str(source: Json, ...names: string[]): string | null {
  for (const name of names) {
    const value = source[name];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function int(source: Json, ...names: string[]): number | null {
  for (const name of names) {
    const value = source[name];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function bool(source: Json, fallback: boolean, ...names: string[]): boolean {
  for (const name of names) {
    const value = source[name];
    if (typeof value === "boolean") return value;
  }
  return fallback;
}

function list(payload: unknown): Json[] {
  if (Array.isArray(payload)) return payload as Json[];
  if (payload && typeof payload === "object") {
    const container = payload as Json;
    for (const key of ["data", "items", "results", "value"]) {
      const inner = container[key];
      if (Array.isArray(inner)) return inner as Json[];
    }
    // A single object is a one-row answer.
    if (Object.keys(container).length > 0) return [container];
  }
  return [];
}

function toCustomer(row: Json): Customer {
  return {
    id: str(row, "id", "customerId", "crm_id", "uuid") ?? "",
    name: str(row, "name", "fullName", "customerName", "title") ?? "",
    phone: normalizePhone(str(row, "phone", "phoneNumber", "mobile", "tel")) ?? "",
    callsAllowed: bool(row, true, "callsAllowed", "calls_allowed", "marketingConsent"),
    notes: str(row, "notes", "comment"),
  };
}

function toVehicle(row: Json, customerId: string): Vehicle {
  return {
    id: str(row, "id", "vehicleId", "crm_id", "uuid") ?? "",
    customerId: str(row, "customerId", "customer_id", "ownerId") ?? customerId,
    make: str(row, "make", "brand", "manufacturer") ?? "",
    model: str(row, "model") ?? "",
    year: int(row, "year", "modelYear"),
    plate: str(row, "plate", "licensePlate", "regNumber"),
    vin: str(row, "vin"),
    mileage: int(row, "mileage", "odometer", "km"),
    lastServiceAt: str(row, "lastServiceAt", "last_service_at", "lastVisitAt"),
    nextServiceDueAt: str(row, "nextServiceDueAt", "next_service_due_at", "nextServiceDate"),
    nextServiceDueKm: int(row, "nextServiceDueKm", "next_service_due_km"),
    warrantyUntil: str(row, "warrantyUntil", "warranty_until", "warrantyEndDate"),
    warrantyKm: int(row, "warrantyKm", "warranty_km"),
  };
}

function toAppointment(row: Json): Appointment {
  return {
    id: str(row, "id", "appointmentId") ?? "",
    customerId: str(row, "customerId", "customer_id") ?? "",
    vehicleId: str(row, "vehicleId", "vehicle_id"),
    startsAt: str(row, "startsAt", "starts_at", "start", "scheduledAt") ?? "",
    endsAt: str(row, "endsAt", "ends_at", "end") ?? "",
    serviceType: str(row, "serviceType", "service_type", "type") ?? "maintenance",
    status: (str(row, "status") as AppointmentStatus) ?? "booked",
    source: "inbound_call",
    notes: str(row, "notes", "comment"),
  };
}

function toVisit(row: Json, vehicleId: string): Visit {
  return {
    id: str(row, "id", "visitId", "orderId") ?? "",
    vehicleId: str(row, "vehicleId", "vehicle_id") ?? vehicleId,
    performedAt: str(row, "performedAt", "performed_at", "closedAt", "date") ?? "",
    mileage: int(row, "mileage", "odometer"),
    works: str(row, "works", "description", "summary", "jobs") ?? "",
    total: int(row, "total", "amount", "sum"),
    currency: str(row, "currency") ?? "KZT",
  };
}

export class CrmServiceProvider implements ServiceDataProvider {
  readonly mode = "crm" as const;

  private async request<T>(
    path: string,
    init: { method?: string; query?: Record<string, string>; body?: unknown } = {}
  ): Promise<T> {
    const config = crmConfig();
    if (!config.baseUrl) {
      throw new ProviderUnsupported(path, "crm (SERVICE_AGENT_CRM_BASE_URL unset)");
    }

    const url = new URL(config.baseUrl.replace(/\/$/, "") + path);
    for (const [key, value] of Object.entries(init.query ?? {})) {
      url.searchParams.set(key, value);
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    if (config.token) {
      headers[config.authHeader] = config.authScheme
        ? `${config.authScheme} ${config.token}`
        : config.token;
    }
    if (init.body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(url, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(CRM_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `[service-agent/crm] ${init.method ?? "GET"} ${path} -> ${response.status}`
      );
    }
    return (await response.json()) as T;
  }

  /** Shop settings are not CRM data; they come from env in this mode. */
  async getShop(): Promise<ServiceShop> {
    return shopFromEnv();
  }

  async findCustomerByPhone(
    shop: ServiceShop,
    phone: string
  ): Promise<CustomerWithVehicles | null> {
    const paths = crmConfig().paths;
    const payload = await this.request<unknown>(paths.customerByPhone, {
      query: { phone },
    });
    const row = list(payload)[0];
    if (!row) return null;

    const customer = toCustomer(row);

    // A CRM that returns the cars inline saves a second round trip, which on a
    // phone call is the difference between a pause and no pause.
    const inline = row["vehicles"] ?? row["cars"];
    const vehicleRows = inline
      ? list(inline)
      : list(
          await this.request<unknown>(
            paths.vehicles.replace("{customerId}", encodeURIComponent(customer.id))
          )
        );

    return {
      ...customer,
      vehicles: vehicleRows.map((v) => toVehicle(v, customer.id)),
    };
  }

  async createCustomer(
    _shop: ServiceShop,
    input: NewCustomer
  ): Promise<Customer> {
    const payload = await this.request<unknown>(crmConfig().paths.customerByPhone, {
      method: "POST",
      body: { phone: input.phone, name: input.name },
    });
    const row = list(payload)[0];
    if (!row) throw new Error("[service-agent/crm] createCustomer returned no row");
    return toCustomer(row);
  }

  async addVehicle(_shop: ServiceShop, input: NewVehicle): Promise<Vehicle> {
    const path = crmConfig().paths.vehicles.replace(
      "{customerId}",
      encodeURIComponent(input.customerId)
    );
    const payload = await this.request<unknown>(path, {
      method: "POST",
      body: {
        make: input.make,
        model: input.model,
        plate: input.plate ?? null,
        year: input.year ?? null,
        mileage: input.mileage ?? null,
      },
    });
    const row = list(payload)[0];
    if (!row) throw new Error("[service-agent/crm] addVehicle returned no row");
    return toVehicle(row, input.customerId);
  }

  async listVisits(
    _shop: ServiceShop,
    vehicleId: string,
    limit = 5
  ): Promise<Visit[]> {
    const path = crmConfig().paths.visits.replace(
      "{vehicleId}",
      encodeURIComponent(vehicleId)
    );
    const payload = await this.request<unknown>(path, {
      query: { limit: String(limit) },
    });
    return list(payload)
      .slice(0, limit)
      .map((row) => toVisit(row, vehicleId));
  }

  async listAppointments(
    _shop: ServiceShop,
    customerId: string
  ): Promise<Appointment[]> {
    const payload = await this.request<unknown>(crmConfig().paths.appointments, {
      query: { customerId },
    });
    return list(payload).map(toAppointment);
  }

  async listBookedIntervals(
    _shop: ServiceShop,
    fromIso: string,
    toIso: string
  ): Promise<BookedInterval[]> {
    const payload = await this.request<unknown>(crmConfig().paths.appointments, {
      query: { from: fromIso, to: toIso },
    });
    return list(payload)
      .map(toAppointment)
      .filter((a) => a.startsAt && a.endsAt && a.status !== "cancelled")
      .map((a) => ({ startsAt: a.startsAt, endsAt: a.endsAt }));
  }

  async createAppointment(
    _shop: ServiceShop,
    input: NewAppointment
  ): Promise<Appointment> {
    const payload = await this.request<unknown>(crmConfig().paths.appointments, {
      method: "POST",
      body: {
        customerId: input.customerId,
        vehicleId: input.vehicleId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        serviceType: input.serviceType,
        source: input.source,
        notes: input.notes ?? null,
      },
    });
    const row = list(payload)[0];
    if (!row) throw new Error("[service-agent/crm] createAppointment returned no row");
    return toAppointment(row);
  }

  async setAppointmentStatus(
    _shop: ServiceShop,
    appointmentId: string,
    status: AppointmentStatus
  ): Promise<Appointment> {
    const payload = await this.request<unknown>(
      `${crmConfig().paths.appointments}/${encodeURIComponent(appointmentId)}`,
      { method: "PATCH", body: { status } }
    );
    const row = list(payload)[0];
    return row
      ? toAppointment(row)
      : {
          id: appointmentId,
          customerId: "",
          vehicleId: null,
          startsAt: "",
          endsAt: "",
          serviceType: "maintenance",
          status,
          source: "inbound_call",
          notes: null,
        };
  }

  async rescheduleAppointment(
    _shop: ServiceShop,
    appointmentId: string,
    startsAt: string,
    endsAt: string
  ): Promise<Appointment> {
    const payload = await this.request<unknown>(
      `${crmConfig().paths.appointments}/${encodeURIComponent(appointmentId)}`,
      { method: "PATCH", body: { startsAt, endsAt, status: "booked" } }
    );
    const row = list(payload)[0];
    if (!row) throw new Error("[service-agent/crm] rescheduleAppointment returned no row");
    return toAppointment(row);
  }

  async listMaintenanceDue(
    _shop: ServiceShop,
    throughIso: string
  ): Promise<DueRow[]> {
    const payload = await this.request<unknown>(crmConfig().paths.maintenanceDue, {
      query: { through: throughIso },
    });
    return this.toDueRows(payload);
  }

  async listWarrantyExpiring(
    _shop: ServiceShop,
    throughIso: string
  ): Promise<DueRow[]> {
    const payload = await this.request<unknown>(crmConfig().paths.warrantyExpiring, {
      query: { through: throughIso },
    });
    return this.toDueRows(payload);
  }

  async listAppointmentsToConfirm(
    _shop: ServiceShop,
    fromIso: string,
    toIso: string
  ): Promise<ConfirmationRow[]> {
    const payload = await this.request<unknown>(crmConfig().paths.appointments, {
      query: { from: fromIso, to: toIso, status: "booked" },
    });
    return list(payload).flatMap((row) => {
      const appointment = toAppointment(row);
      const customerRow = row["customer"];
      if (!customerRow || typeof customerRow !== "object") return [];
      const customer = toCustomer(customerRow as Json);
      if (!customer.phone) return [];
      const vehicleRow = row["vehicle"];
      return [
        {
          appointment,
          customer,
          vehicle:
            vehicleRow && typeof vehicleRow === "object"
              ? toVehicle(vehicleRow as Json, customer.id)
              : null,
        },
      ];
    });
  }

  /**
   * Both due endpoints return vehicle rows with their owner attached; a row
   * without a dialable phone is dropped rather than queued for a call nobody
   * can place.
   */
  private toDueRows(payload: unknown): DueRow[] {
    return list(payload).flatMap((row) => {
      const customerRow = row["customer"] ?? row["owner"];
      if (!customerRow || typeof customerRow !== "object") return [];
      const customer = toCustomer(customerRow as Json);
      if (!customer.phone || !customer.callsAllowed) return [];
      const vehicleRow = (row["vehicle"] ?? row) as Json;
      return [{ customer, vehicle: toVehicle(vehicleRow, customer.id) }];
    });
  }
}
