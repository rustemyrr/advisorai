import { NextResponse } from "next/server";
import { getUserFromToken, createAdminClient } from "@/lib/supabase-server";

const PRICELIST_PLANS = ["standard", "professional"];

// Every item is rendered into the system prompt on each generation, so the
// list has to stay small enough to be worth sending and cheap enough to send.
const MAX_PRICELIST_ITEMS = 500;
const MAX_SERVICE_NAME_LENGTH = 200;

function normalizeItems(input: unknown): PricelistItem[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length > MAX_PRICELIST_ITEMS) return null;
  const items: PricelistItem[] = [];
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) return null;
    const { service, price, hours } = raw as Record<string, unknown>;
    if (typeof service !== "string") return null;
    const priceNum = Number(price);
    const hoursNum = Number(hours);
    if (!Number.isFinite(priceNum) || !Number.isFinite(hoursNum)) return null;
    items.push({
      service: service.slice(0, MAX_SERVICE_NAME_LENGTH),
      price: priceNum,
      hours: hoursNum,
    });
  }
  return items;
}

export const dynamic = "force-dynamic";

export type PricelistItem = { service: string; price: number; hours: number };

export type PricelistRow = {
  filename: string;
  labor_rate: number;
  items: PricelistItem[];
  updated_at: string;
};

// GET /api/pricelist — fetch current user's pricelist
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("pricelist")
    .select("filename, labor_rate, items, updated_at")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = "no rows found" — expected when user has no pricelist yet
    console.error("[pricelist GET]", error.message);
  }
  return NextResponse.json({ pricelist: data ?? null });
}

// POST /api/pricelist — upsert pricelist (Standard and Professional only)
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data: profile } = await db
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const plan = (profile as { plan: string } | null)?.plan ?? "starter";
  if (!PRICELIST_PLANS.includes(plan)) {
    return NextResponse.json(
      { error: "Pricelist upload requires Standard or Professional plan" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { filename, labor_rate, items } = body as {
    filename?: string;
    labor_rate?: number;
    items?: PricelistItem[];
  };

  const normalizedItems = normalizeItems(items);
  if (!normalizedItems) {
    return NextResponse.json(
      {
        error: `items must be an array of at most ${MAX_PRICELIST_ITEMS} rows of { service, price, hours }`,
      },
      { status: 400 }
    );
  }

  const { error } = await db.from("pricelist").upsert(
    {
      user_id: user.id,
      filename: (filename ?? "").slice(0, MAX_SERVICE_NAME_LENGTH),
      labor_rate: Number.isFinite(Number(labor_rate)) ? Number(labor_rate) : 0,
      items: normalizedItems,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
