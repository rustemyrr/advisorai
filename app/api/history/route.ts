import { NextResponse } from "next/server";
import { getUserFromToken, createAdminClient } from "@/lib/supabase-server";
import { getOrCreateProfile, historyDaysForPlan } from "@/lib/usage";

export const dynamic = "force-dynamic";

export type HistoryRow = {
  id: string;
  input: string;
  estimate: string;
  explanation: string;
  upsell: string;
  currency: string;
  created_at: string;
};

// How many rows one response may carry, whatever the plan. The whole list is
// rendered at once, so this is about payload size, not about entitlement.
const MAX_HISTORY_ROWS = 100;

// Nothing stopped an account from posting megabytes per row. These are the
// sizes a real generation produces, with room to spare: the input is what the
// advisor typed, the three outputs are what the model returned.
const MAX_INPUT_LENGTH = 4000;
const MAX_OUTPUT_LENGTH = 8000;
const MAX_CURRENCY_LENGTH = 16;

function cap(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.slice(0, max);
}

// GET /api/history — the authenticated user's own generations, as far back as
// their plan allows (see historyDaysForPlan).
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await getOrCreateProfile(user.id);
  const days = historyDaysForPlan(plan);

  const db = createAdminClient();
  let query = db
    .from("generation_history")
    .select("id, input, estimate, explanation, upsell, currency, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY_ROWS);

  if (days !== null) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", since);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[history GET]", error.message);
    return NextResponse.json({ history: [] });
  }
  return NextResponse.json({ history: data ?? [], windowDays: days });
}

// POST /api/history — save a new generation
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { input, estimate, explanation, upsell, currency } = body as Record<string, string>;

  if (!input || !estimate || !explanation || !upsell) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from("generation_history").insert({
    user_id: user.id,
    input: cap(input, MAX_INPUT_LENGTH),
    estimate: cap(estimate, MAX_OUTPUT_LENGTH),
    explanation: cap(explanation, MAX_OUTPUT_LENGTH),
    upsell: cap(upsell, MAX_OUTPUT_LENGTH),
    currency: cap(currency ?? "USD", MAX_CURRENCY_LENGTH) || "USD",
  });

  if (error) {
    console.error("[history POST]", error.message);
    return NextResponse.json({ error: "Could not save generation" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
