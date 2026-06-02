import { NextResponse } from "next/server";
import { checkUsageForIp } from "@/lib/leads-store";
import { getClientIp } from "@/lib/get-client-ip";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const status = await checkUsageForIp(ip);
  return NextResponse.json(status);
}
