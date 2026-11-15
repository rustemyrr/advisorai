/**
 * Phone and time helpers for the service agent.
 *
 * A shop in Astana thinks in Asia/Almaty, the database stores UTC, and the
 * agent has to say "в четверг в 10:00" out loud. Everything that converts
 * between those three lives here, with no date library: Intl can already report
 * what a UTC instant looks like in a named zone, which is all this needs.
 */

const DIGITS = /[^\d+]/g;

/**
 * Normalises a Kazakh or Russian number to E.164, which is the only form the
 * agent looks up or dials by. Returns null when it cannot tell what the number
 * is, so a caller can ask instead of guessing.
 *
 *   8 701 123 45 67   -> +77011234567
 *   701 123 45 67     -> +77011234567
 *   +7 (701) 123-4567 -> +77011234567
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(DIGITS, "");
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 10) return null;

  if (cleaned.startsWith("+")) return `+${digits}`;
  // 8XXXXXXXXXX is how the whole country writes it; 7XXXXXXXXXX is the same
  // number with the trunk prefix already dropped.
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return `+${digits}`;
}

/** Last four digits, for reading a number back without saying all of it. */
export function phoneTail(phone: string): string {
  return phone.replace(/\D/g, "").slice(-4);
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday, to match the working_hours keys. */
  weekday: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** What a UTC instant looks like on the wall clock of `timeZone`. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    // Intl reports midnight as hour 24 in some runtimes.
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
  };
}

/** Offset of `timeZone` from UTC, in milliseconds, at the given instant. */
function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0, 0);
  // Seconds and milliseconds are not in the parts above, so compare on minutes.
  const flooredDate = Math.floor(date.getTime() / 60000) * 60000;
  return asUtc - flooredDate;
}

/**
 * Local wall-clock time in `timeZone` to the UTC instant it denotes.
 * Runs twice so a time that sits near a DST change resolves with the offset
 * that actually applies to it (Asia/Almaty has no DST, but tenants elsewhere
 * will).
 */
export function zonedToUtc(
  isoDate: string,
  hhmm: string,
  timeZone: string
): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const naive = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  let result = new Date(naive - offsetMs(new Date(naive), timeZone));
  result = new Date(naive - offsetMs(result, timeZone));
  return result;
}

/** ISO date (YYYY-MM-DD) of the given instant in `timeZone`. */
export function zonedDateString(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const base = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const base = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  base.setUTCMonth(base.getUTCMonth() + months);
  return base.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

/**
 * How the agent says a slot out loud: "четверг, 20 ноября, 10:00".
 * The agent is told to speak this and never an ISO timestamp.
 */
export function formatSlot(
  iso: string,
  timeZone: string,
  locale = "ru"
): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  const time = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${day}, ${time}`;
}

export function formatDate(
  isoDate: string,
  timeZone: string,
  locale = "ru"
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}
