import { NextResponse } from "next/server";
import { getUserFromToken, createAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export type PricelistItem = { service: string; price: number; hours: number };

export type PricelistRow = {
  filename: string;
  labor_rate: number;
  currency: string;
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
    .select("filename, labor_rate, currency, items, updated_at")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = "no rows found" — expected when user has no pricelist yet
    console.error("[pricelist GET]", error.message);
  }
  return NextResponse.json({ pricelist: data ?? null });
}

// POST /api/pricelist — upsert pricelist
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { filename, labor_rate, currency, items } = body as {
    filename?: string;
    labor_rate?: number;
    currency?: string;
    items?: PricelistItem[];
  };

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items must be an array" }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from("pricelist").upsert(
    {
      user_id: user.id,
      filename: filename ?? "",
      labor_rate: labor_rate ?? 0,
      currency: currency ?? "USD",
      items,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
