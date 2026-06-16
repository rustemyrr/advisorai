import { NextResponse } from "next/server";
import { getUserFromToken, createAdminClient } from "@/lib/supabase-server";

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

// GET /api/history — last 10 generations for the authenticated user
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("generation_history")
    .select("id, input, estimate, explanation, upsell, currency, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[history GET]", error.message);
    return NextResponse.json({ history: [] });
  }
  return NextResponse.json({ history: data ?? [] });
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
    input,
    estimate,
    explanation,
    upsell,
    currency: currency ?? "USD",
  });

  if (error) {
    console.error("[history POST]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
