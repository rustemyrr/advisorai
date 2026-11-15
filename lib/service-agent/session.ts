/**
 * Starting a conversation: who is on the line, which shop they reached, and
 * what the agent already knows about them before it says hello.
 *
 * The conversation itself is stateless -- every turn rebuilds this from the
 * phone number, because a serverless instance does not keep the last call in
 * memory and a telephony provider only ever sends back the words, not our tool
 * results. Looking the customer up here (rather than making the model do it)
 * saves one tool round trip, which on a phone call is an audible pause.
 */

import { getProvider } from "./providers";
import type { AgentContext } from "./prompt";
import { newSession, type AgentSession } from "./tools";
import { normalizePhone } from "./time";
import type { Appointment, CallPurpose, CustomerWithVehicles } from "./types";

export type OpenSessionInput = {
  /** Shop id, or the owner user id in Supabase mode. */
  shopRef?: string | null;
  purpose?: CallPurpose;
  channel?: "voice" | "chat";
  phone?: string | null;
  /** For a confirmation call: which booking it is about. */
  appointmentId?: string | null;
  now?: Date;
};

export type OpenedSession = {
  session: AgentSession;
  context: AgentContext;
  customer: CustomerWithVehicles | null;
};

export async function openSession(
  input: OpenSessionInput
): Promise<OpenedSession> {
  const provider = getProvider();
  const shop = await provider.getShop(input.shopRef ?? null);
  const phone = normalizePhone(input.phone ?? null);

  let customer: CustomerWithVehicles | null = null;
  if (phone) {
    try {
      customer = await provider.findCustomerByPhone(shop, phone);
    } catch (error) {
      // An unreachable CRM must not stop the call: the agent simply starts as
      // if the caller were new and asks for the details it needs.
      console.error("[service-agent/session] customer lookup failed:", error);
    }
  }

  let appointment: Appointment | null = null;
  if (input.appointmentId && customer) {
    try {
      const appointments = await provider.listAppointments(shop, customer.id);
      appointment =
        appointments.find((item) => item.id === input.appointmentId) ?? null;
    } catch (error) {
      console.error("[service-agent/session] appointment lookup failed:", error);
    }
  }

  const context: AgentContext = {
    shop,
    purpose: input.purpose ?? "inbound",
    channel: input.channel ?? "voice",
    phone,
    customer,
    vehicle:
      customer && customer.vehicles.length === 1 ? customer.vehicles[0] : null,
    appointment,
    now: input.now,
  };

  return { session: newSession(shop, provider, context), context, customer };
}
