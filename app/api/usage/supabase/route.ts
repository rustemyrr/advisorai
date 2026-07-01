import { NextResponse } from "next/server";
import { getUserFromToken, createAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Monthly generation limits per plan
const PLAN_LIMITS: Record<string, number> = {
  starter: 15,
  standard: 100,
  professional: Infinity,
};

function getMonthString(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

type UsageRow = { user_id: string; date: string; count: number };

async function getOrCreateUsage(userId: string, month: string): Promise<UsageRow> {
  const db = createAdminClient();
  const { data } = await db
    .from("usage")
    .select("user_id, date, count")
    .eq("user_id", userId)
    .eq("date", month)
    .single();
  if (data) return data as UsageRow;
  const { data: inserted } = await db
    .from("usage")
    .insert({ user_id: userId, date: month, count: 0 })
    .select("user_id, date, count")
    .single();
  return (inserted as UsageRow) ?? { user_id: userId, date: month, count: 0 };
}

async function getOrCreateProfile(userId: string): Promise<{ plan: string }> {
  const db = createAdminClient();
  const { data } = await db
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  if (data) return data as { plan: string };
  await db.from("profiles").insert({ id: userId, plan: "starter" });
  return { plan: "starter" };
}

function buildResponse(count: number, plan: string) {
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
  const isPro = limit === Infinity;
  const remaining = isPro ? 999 : Math.max(0, limit - count);
  const allowed = count < limit;
  return { count, remaining, allowed, isPro, plan };
}

// GET /api/usage/supabase — returns this month's usage for the authenticated user
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const month = getMonthString();
  const [usage, profile] = await Promise.all([
    getOrCreateUsage(user.id, month),
    getOrCreateProfile(user.id),
  ]);
  return NextResponse.json(buildResponse(usage.count, profile.plan));
}

// POST /api/usage/supabase — increments this month's count; body: { action: "increment" }
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body.action !== "increment") {
    return NextResponse.json({ error: "action must be 'increment'" }, { status: 400 });
  }

  const month = getMonthString();
  const [usage, profile] = await Promise.all([
    getOrCreateUsage(user.id, month),
    getOrCreateProfile(user.id),
  ]);
  const limit = PLAN_LIMITS[profile.plan] ?? PLAN_LIMITS.starter;

  if (usage.count >= limit) {
    return NextResponse.json(buildResponse(usage.count, profile.plan));
  }

  const db = createAdminClient();
  const newCount = usage.count + 1;
  await db
    .from("usage")
    .update({ count: newCount })
    .eq("user_id", user.id)
    .eq("date", month);

  return NextResponse.json(buildResponse(newCount, profile.plan));
}
