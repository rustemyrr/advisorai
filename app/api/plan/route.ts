import { NextResponse } from "next/server";
import { getUserFromToken, createAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ plan: "starter" });

  const db = createAdminClient();
  const { data, error } = await db
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("[/api/plan]", error.message);
    }
    return NextResponse.json({ plan: "starter" });
  }

  const plan = (data as { plan: string } | null)?.plan ?? "starter";
  return NextResponse.json({ plan });
}
