import { NextResponse } from "next/server";
import { getUserFromToken, createAdminClient } from "@/lib/supabase-server";
import { FREE_GENERATION_LIMIT } from "@/lib/demo-constants";

export const dynamic = "force-dynamic";

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

type UsageRow = { user_id: string; date: string; count: number };

async function getOrCreateUsage(userId: string, date: string): Promise<UsageRow> {
  const db = createAdminClient();
  const { data } = await db
    .from("usage")
    .select("user_id, date, count")
    .eq("user_id", userId)
    .eq("date", date)
    .single();
  if (data) return data as UsageRow;
  // First use today — insert row
  const { data: inserted } = await db
    .from("usage")
    .insert({ user_id: userId, date, count: 0 })
    .select("user_id, date, count")
    .single();
  return (inserted as UsageRow) ?? { user_id: userId, date, count: 0 };
}

async function getOrCreateProfile(userId: string): Promise<{ plan: string }> {
  const db = createAdminClient();
  const { data } = await db
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  if (data) return data as { plan: string };
  await db.from("profiles").insert({ id: userId, plan: "free" });
  return { plan: "free" };
}

function buildResponse(count: number, isPro: boolean) {
  const limit = isPro ? Infinity : FREE_GENERATION_LIMIT;
  const remaining = isPro ? 999 : Math.max(0, limit - count);
  return { count, remaining, allowed: isPro || count < FREE_GENERATION_LIMIT, isPro };
}

// GET /api/usage/supabase — returns today's usage for the authenticated user
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = getTodayString();
  const [usage, profile] = await Promise.all([
    getOrCreateUsage(user.id, date),
    getOrCreateProfile(user.id),
  ]);
  const isPro = profile.plan === "pro";
  return NextResponse.json(buildResponse(usage.count, isPro));
}

// POST /api/usage/supabase — increments today's count; body: { action: "increment" }
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body.action !== "increment") {
    return NextResponse.json({ error: "action must be 'increment'" }, { status: 400 });
  }

  const date = getTodayString();
  const [usage, profile] = await Promise.all([
    getOrCreateUsage(user.id, date),
    getOrCreateProfile(user.id),
  ]);
  const isPro = profile.plan === "pro";

  // Don't increment if already over the free limit (Pro users are always allowed)
  if (!isPro && usage.count >= FREE_GENERATION_LIMIT) {
    return NextResponse.json(buildResponse(usage.count, isPro));
  }

  const db = createAdminClient();
  const newCount = usage.count + 1;
  await db
    .from("usage")
    .update({ count: newCount })
    .eq("user_id", user.id)
    .eq("date", date);

  return NextResponse.json(buildResponse(newCount, isPro));
}
