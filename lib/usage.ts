import { createAdminClient, isMissingFunction } from "@/lib/supabase-server";

// Monthly generation limits per plan.
//
// "free" is what a new account gets. It has to stay well under Starter, or
// there is no reason to buy Starter at all -- which is exactly what happened
// until 2026-11-15, when every signup was created with plan "starter" and so
// received the whole paid tier for nothing.
export const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  starter: 15,
  standard: 100,
  professional: Infinity,
};

export function limitForPlan(plan: string): number {
  // An unknown plan gets the smallest allowance, never a paid one.
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

// How far back a plan can read its own history. `null` means no time limit.
// The pricing page sells exactly this, so the two have to stay in step:
// Starter says "last 7 days", Standard and Professional say "no time limit".
export const PLAN_HISTORY_DAYS: Record<string, number | null> = {
  free: 7,
  starter: 7,
  standard: null,
  professional: null,
};

export function historyDaysForPlan(plan: string): number | null {
  // An unknown plan gets the smallest window, not the largest.
  return plan in PLAN_HISTORY_DAYS ? PLAN_HISTORY_DAYS[plan] : 7;
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
  // New accounts start on "free". Until migration 0004 is applied to the live
  // project the plan CHECK constraint rejects that value; the insert then fails
  // and we still answer "free", so the account gets free limits rather than a
  // paid tier. Nothing here may ever fall back to a paying plan.
  const { data: inserted, error } = await db
    .from("profiles")
    .insert({ id: userId, plan: "free" })
    .select("plan")
    .single();
  if (error) console.error("[getOrCreateProfile] insert failed:", error.message);
  return (inserted as { plan: string } | null) ?? { plan: "free" };
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

export type UsageReservation = { counted: boolean; count: number };

/**
 * Spends one generation of this month's allowance, and says whether there was
 * one to spend. Call it before the model, not after: the point of the
 * reservation is that the limit is decided while nothing has been billed yet.
 *
 * `increment_usage` (migration 0007) does the check and the write in one
 * statement, so two requests that arrive together cannot both read the same
 * count. Until that migration is applied to the live project this falls back
 * to the read-modify-write it replaces, which holds the limit for one request
 * at a time -- the behaviour the whole site had until then.
 */
export async function reserveGeneration(
  userId: string,
  month: string,
  limit: number
): Promise<UsageReservation> {
  const db = createAdminClient();
  const { data, error } = await db.rpc("increment_usage", {
    p_user_id: userId,
    p_date: month,
    p_limit: limit,
  });

  if (!error) {
    const row = (Array.isArray(data) ? data[0] : data) as
      | { counted?: unknown; new_count?: unknown }
      | null;
    if (row && typeof row.counted === "boolean") {
      return { counted: row.counted, count: Number(row.new_count) || 0 };
    }
    throw new Error("increment_usage returned an unexpected shape");
  }

  if (!isMissingFunction(error)) {
    // Fail closed. An allowance we cannot write is an allowance we cannot
    // enforce, and the caller is one line away from spending the API key.
    throw new Error(`increment_usage failed: ${error.message}`);
  }

  const usage = await getOrCreateUsage(userId, month);
  if (usage.count >= limit) return { counted: false, count: usage.count };
  await incrementUsage(userId, month, usage.count + 1);
  return { counted: true, count: usage.count + 1 };
}

/**
 * Gives one generation back. Only for the failure that cost nothing and cannot
 * be provoked from the request: the call to the model did not return at all.
 * Best effort by design -- a refund that fails must not fail the response, and
 * before migration 0007 there is no function to call, so the generation simply
 * stays counted.
 */
export async function releaseGeneration(userId: string, month: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.rpc("release_usage", {
    p_user_id: userId,
    p_date: month,
  });
  if (error && !isMissingFunction(error)) {
    console.error("[releaseGeneration] release_usage failed:", error.message);
  }
}
