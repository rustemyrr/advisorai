import { promises as fs } from "fs";
import path from "path";
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

const DATA_DIR = path.join(process.cwd(), "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readLeads(): Promise<LeadRecord[]> {
  try {
    const raw = await fs.readFile(LEADS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LeadRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeLeads(leads: LeadRecord[]) {
  await ensureDataDir();
  await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2), "utf8");
}

export async function getLeadForIp(ip: string): Promise<LeadRecord> {
  const today = getTodayDateString();
  const leads = await readLeads();
  const existing = leads.find((lead) => lead.ip === ip && lead.date === today);

  if (existing) {
    return existing;
  }

  return {
    ip,
    email: "",
    count: 0,
    date: today,
    createdAt: new Date().toISOString(),
  };
}

async function upsertLead(record: LeadRecord) {
  const leads = await readLeads();
  const index = leads.findIndex(
    (lead) => lead.ip === record.ip && lead.date === record.date
  );

  if (index >= 0) {
    leads[index] = record;
  } else {
    leads.push(record);
  }

  await writeLeads(leads);
}

export function checkUsage(record: LeadRecord): UsageCheckResult {
  const count = record.count;
  const hasEmail = Boolean(record.email);
  const limitReached = count >= FREE_GENERATION_LIMIT;
  const requiresEmail =
    count >= 1 && count < FREE_GENERATION_LIMIT && !hasEmail;
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

export async function saveEmailForIp(
  ip: string,
  email: string
): Promise<LeadRecord> {
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
