import { NextResponse } from "next/server";
import { getPaddlePublicConfig } from "@/lib/paddle-public-config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getPaddlePublicConfig());
}
