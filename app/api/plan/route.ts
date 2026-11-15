import { NextResponse } from "next/server";
import { getUserFromToken, createAdminClient } from "@/lib/supabase-server";
import { paddleConfig } from "@/lib/paddle-config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ plan: "free", hasBilling: false });

  const db = createAdminClient();
  const { data, error } = await db
    .from("profiles")
    .select("plan, paddle_customer_id")
    .eq("id", user.id)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("[/api/plan]", error.message);
    }
    return NextResponse.json({ plan: "free", hasBilling: false });
  }

  const profile = data as { plan: string; paddle_customer_id: string | null } | null;
  // Tells the client whether to offer the "manage subscription" link at all,
  // so it never shows a button that would answer 404 -- or one that cannot
  // work because no Paddle API key is configured for this deployment.
  return NextResponse.json({
    plan: profile?.plan ?? "free",
    hasBilling: Boolean(profile?.paddle_customer_id) && Boolean(paddleConfig.apiKey),
  });
}
