import { FREE_GENERATION_LIMIT } from "./demo-constants";

export { FREE_GENERATION_LIMIT };

export type LeadRecord = {
  ip: string;
  count: number;
  date: string;
};

export type UsageCheckResult = {
  allowed: boolean;
  count: number;
  remaining: number;
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
  return { ip, count: 0, date: today };
}

function checkUsage(record: LeadRecord): UsageCheckResult {
  const count = record.count;
  return {
    allowed: count < FREE_GENERATION_LIMIT,
    count,
    remaining: Math.max(0, FREE_GENERATION_LIMIT - count),
  };
}

export async function checkUsageForIp(ip: string): Promise<UsageCheckResult> {
  const record = await getLeadForIp(ip);
  return checkUsage(record);
}

export async function incrementUsageForIp(ip: string): Promise<UsageCheckResult> {
  const current = await getLeadForIp(ip);
  const updated: LeadRecord = { ...current, count: current.count + 1 };
  store.set(`${updated.ip}:${updated.date}`, updated);
  return checkUsage(updated);
}
