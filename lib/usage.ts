import { createAdminClient } from "@/lib/supabase-server";

// Monthly generation limits per plan
export const PLAN_LIMITS: Record<string, number> = {
  starter: 15,
  standard: 100,
  professional: Infinity,
};

export function limitForPlan(plan: string): number {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
}

export function getMonthString(): string {
  // First day of the current month. `usage.date` is a Postgres `date` column,
  // which rejects a bare "YYYY-MM" (error 22007), so the month is stored as its
  // first day; the unique (user_id, date) index keeps one row per user per month.
  return new Date().toISOString().slice(0, 7) + "-01"; // YYYY-MM-01
}

export type UsageRow = { user_id: string; date: string; count: number };

export async function getOrCreateUsage(userId: string, month: string): Promise<UsageRow> {
  const db = createAdminClient();
  const { data } = await db
    .from("usage")
    .select("user_id, date, count")
    .eq("user_id", userId)
    .eq("date", month)
    .single();
  if (data) return data as UsageRow;
  const { data: inserted, error } = await db
    .from("usage")
    .insert({ user_id: userId, date: month, count: 0 })
    .select("user_id, date, count")
    .single();
  if (error) console.error("[getOrCreateUsage] insert failed:", error.message);
  return (inserted as UsageRow) ?? { user_id: userId, date: month, count: 0 };
}

export async function getOrCreateProfile(userId: string): Promise<{ plan: string }> {
  const db = createAdminClient();
  const { data } = await db
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  if (data) return data as { plan: string };
  const { data: inserted, error } = await db
    .from("profiles")
    .insert({ id: userId, plan: "starter" })
    .select("plan")
    .single();
  if (error) console.error("[getOrCreateProfile] insert failed:", error.message);
  return (inserted as { plan: string } | null) ?? { plan: "starter" };
}

export async function incrementUsage(userId: string, month: string, newCount: number): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .from("usage")
    .update({ count: newCount })
    .eq("user_id", userId)
    .eq("date", month);
  if (error) console.error("[incrementUsage] update failed:", error.message);
}
