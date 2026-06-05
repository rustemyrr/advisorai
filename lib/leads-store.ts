import { FREE_GENERATION_LIMIT } from "./demo-constants";

export { FREE_GENERATION_LIMIT };

export type LeadRecord = {
  ip: string;
  email: string;
  count: number;
  date: string;
  createdAt: string;
};

export type UsageCheckResult = {
  allowed: boolean;
  requiresEmail: boolean;
  count: number;
  remaining: number;
  email: string | null;
};

const store = new Map<string, LeadRecord>();

export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function getLeadForIp(ip: string): Promise<LeadRecord> {
  const today = getTodayDateString();
  const key = `${ip}:${today}`;
  const existing = store.get(key);
  if (existing) return existing;
  return { ip, email: "", count: 0, date: today, createdAt: new Date().toISOString() };
}

async function upsertLead(record: LeadRecord) {
  store.set(`${record.ip}:${record.date}`, record);
}

export function checkUsage(record: LeadRecord): UsageCheckResult {
  const count = record.count;
  const hasEmail = Boolean(record.email);
  const limitReached = count >= FREE_GENERATION_LIMIT;
  const requiresEmail = count >= 1 && count < FREE_GENERATION_LIMIT && !hasEmail;
  const allowed = !limitReached && !requiresEmail;
  return {
    allowed,
    requiresEmail,
    count,
    remaining: Math.max(0, FREE_GENERATION_LIMIT - count),
    email: hasEmail ? record.email : null,
  };
}

export async function checkUsageForIp(ip: string): Promise<UsageCheckResult> {
  const record = await getLeadForIp(ip);
  return checkUsage(record);
}

export async function saveEmailForIp(ip: string, email: string): Promise<LeadRecord> {
  const current = await getLeadForIp(ip);
  const updated: LeadRecord = {
    ...current,
    email: email.trim().toLowerCase(),
    date: getTodayDateString(),
  };
  await upsertLead(updated);
  return updated;
}

export async function incrementUsageForIp(ip: string): Promise<LeadRecord> {
  const current = await getLeadForIp(ip);
  const updated: LeadRecord = {
    ...current,
    count: current.count + 1,
    date: getTodayDateString(),
  };
  await upsertLead(updated);
  return updated;
}
