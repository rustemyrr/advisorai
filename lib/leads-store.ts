import { createAdminClient } from "@/lib/supabase-server";
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

export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function checkUsage(record: LeadRecord): UsageCheckResult {
  const count = record.count;
  return {
    allowed: count < FREE_GENERATION_LIMIT,
    count,
    remaining: Math.max(0, FREE_GENERATION_LIMIT - count),
  };
}

/**
 * Daily free-generation counter for visitors who are not signed in.
 *
 * This lives in Postgres rather than in process memory on purpose: every
 * serverless instance has its own memory and loses it between invocations,
 * so an in-memory counter means no cap at all in production — unlimited
 * generations billed to our Anthropic key. The table is written with the
 * service-role key and has no RLS policies, so it is server-only.
 */
export async function getLeadForIp(ip: string): Promise<LeadRecord> {
  const date = getTodayDateString();
  const db = createAdminClient();
  const { data, error } = await db
    .from("anon_usage")
    .select("ip, date, count")
    .eq("ip", ip)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    console.error("[getLeadForIp] select failed:", error.message);
    // Fail closed: a readable counter is what keeps the demo from being free
    // compute for anyone with curl, so an unreadable one must not open it up.
    return { ip, count: FREE_GENERATION_LIMIT, date };
  }

  return (data as LeadRecord | null) ?? { ip, count: 0, date };
}

export async function checkUsageForIp(ip: string): Promise<UsageCheckResult> {
  const record = await getLeadForIp(ip);
  return checkUsage(record);
}

export async function incrementUsageForIp(ip: string): Promise<UsageCheckResult> {
  const date = getTodayDateString();
  const db = createAdminClient();

  const { data, error } = await db.rpc("increment_anon_usage", {
    p_ip: ip,
    p_date: date,
  });

  if (error) {
    console.error("[incrementUsageForIp] increment failed:", error.message);
    // Treat an uncountable generation as the last one allowed.
    return checkUsage({ ip, count: FREE_GENERATION_LIMIT, date });
  }

  const count = typeof data === "number" ? data : FREE_GENERATION_LIMIT;
  return checkUsage({ ip, count, date });
}
