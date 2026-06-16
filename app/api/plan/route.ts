import { NextResponse } from "next/server";
import { getUserFromToken, createAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ plan: "free" });

  const db = createAdminClient();
  const { data, error } = await db
    .from("profiles")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  if (error) {
    // PGRST116 = no row yet — user hasn't generated anything, treat as free
    if (error.code !== "PGRST116") {
      console.error("[/api/plan]", error.message);
    }
    return NextResponse.json({ plan: "free" });
  }

  const plan = (data as { plan: string } | null)?.plan ?? "free";
  console.log(`[/api/plan] user=${user.id} plan=${plan}`);
  return NextResponse.json({ plan });
}
