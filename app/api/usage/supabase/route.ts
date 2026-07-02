import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/supabase-server";
import {
  getMonthString,
  getOrCreateProfile,
  getOrCreateUsage,
  incrementUsage,
  limitForPlan,
} from "@/lib/usage";

function buildResponse(count: number, plan: string) {
  const limit = limitForPlan(plan);
  const isPro = limit === Infinity;
  const remaining = isPro ? 999 : Math.max(0, limit - count);
  const allowed = count < limit;
  return { count, remaining, allowed, isPro, plan };
}

export const dynamic = "force-dynamic";

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
  const limit = limitForPlan(profile.plan);

  if (usage.count >= limit) {
    return NextResponse.json(buildResponse(usage.count, profile.plan));
  }

  const newCount = usage.count + 1;
  await incrementUsage(user.id, month, newCount);

  return NextResponse.json(buildResponse(newCount, profile.plan));
}
