/**
 * Free-slot arithmetic, shared by every provider mode.
 *
 * The rule the agent offers appointments by: a slot exists while the shop is
 * open, and it is free while fewer cars are booked into it than the shop has
 * bays. Bookings come from whichever system the shop runs; the grid itself is
 * computed here so a CRM-backed shop and a Supabase-backed shop get the same
 * answer from the same opening hours.
 */

import type { BookedInterval } from "./provider";
import type { ServiceShop, Slot } from "./types";
import { addDays, zonedDateString, zonedToUtc } from "./time";

/**
 * Nothing is offered closer than this to now. A customer cannot be at the shop
 * in ten minutes, and a slot that has already started is not a slot.
 */
const MIN_LEAD_MINUTES = 120;

/** How many days ahead the agent will look when nothing closer is free. */
export const DEFAULT_SEARCH_DAYS = 14;

function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function slotEnd(startsAt: string, slotMinutes: number): string {
  return new Date(Date.parse(startsAt) + slotMinutes * 60000).toISOString();
}

export type FreeSlotOptions = {
  /** First day to consider, as an ISO date in the shop timezone. */
  fromDate?: string;
  days?: number;
  limit?: number;
  now?: Date;
  /** Only slots at or after this local HH:MM (customer asked for afternoon). */
  earliestTime?: string | null;
  latestTime?: string | null;
};

/**
 * The next free slots, in chronological order.
 *
 * `booked` must cover the whole window being searched; it is the caller that
 * knows how to ask its backend for that (see ServiceDataProvider).
 */
export function freeSlots(
  shop: ServiceShop,
  booked: BookedInterval[],
  options: FreeSlotOptions = {}
): Slot[] {
  const now = options.now ?? new Date();
  const days = options.days ?? DEFAULT_SEARCH_DAYS;
  const limit = options.limit ?? 6;
  const startDate = options.fromDate ?? zonedDateString(now, shop.timezone);
  const notBefore = now.getTime() + MIN_LEAD_MINUTES * 60000;

  const busy = booked.map((b) => ({
    start: Date.parse(b.startsAt),
    end: Date.parse(b.endsAt),
  }));

  const out: Slot[] = [];

  for (let dayOffset = 0; dayOffset < days && out.length < limit; dayOffset++) {
    const date = addDays(startDate, dayOffset);
    // Which weekday that date is in the shop timezone; a day with no hours is
    // a day off and is skipped.
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const hours = shop.workingHours[String(weekday)];
    if (!hours) continue;

    const [openAt, closeAt] = hours;
    const dayOpen = zonedToUtc(date, openAt, shop.timezone).getTime();
    const dayClose = zonedToUtc(date, closeAt, shop.timezone).getTime();
    const windowStart = options.earliestTime
      ? Math.max(dayOpen, zonedToUtc(date, options.earliestTime, shop.timezone).getTime())
      : dayOpen;
    const windowEnd = options.latestTime
      ? Math.min(dayClose, zonedToUtc(date, options.latestTime, shop.timezone).getTime())
      : dayClose;

    const step = shop.slotMinutes * 60000;
    for (let start = windowStart; start + step <= windowEnd; start += step) {
      if (out.length >= limit) break;
      if (start < notBefore) continue;

      const end = start + step;
      const taken = busy.filter((b) => overlaps(start, end, b.start, b.end)).length;
      if (taken >= shop.bays) continue;

      out.push({
        startsAt: new Date(start).toISOString(),
        endsAt: new Date(end).toISOString(),
      });
    }
  }

  return out;
}

/**
 * Whether one specific slot is still free -- checked again at booking time,
 * because the offer and the yes are two different moments and two callers can
 * be on the phone at once.
 */
export function isSlotFree(
  shop: ServiceShop,
  booked: BookedInterval[],
  startsAt: string,
  endsAt: string
): boolean {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  const taken = booked.filter((b) =>
    overlaps(start, end, Date.parse(b.startsAt), Date.parse(b.endsAt))
  ).length;
  return taken < shop.bays;
}

/** Whether the shop is open across the whole of the given interval. */
export function isWithinWorkingHours(
  shop: ServiceShop,
  startsAt: string,
  endsAt: string
): boolean {
  const date = zonedDateString(new Date(startsAt), shop.timezone);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const hours = shop.workingHours[String(weekday)];
  if (!hours) return false;
  const open = zonedToUtc(date, hours[0], shop.timezone).getTime();
  const close = zonedToUtc(date, hours[1], shop.timezone).getTime();
  return Date.parse(startsAt) >= open && Date.parse(endsAt) <= close;
}
