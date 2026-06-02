import { NextResponse } from "next/server";
import {
  checkUsage,
  incrementUsageForIp,
  saveEmailForIp,
} from "@/lib/leads-store";
import { getClientIp } from "@/lib/get-client-ip";

export const dynamic = "force-dynamic";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const { email, increment } = body as {
      email?: string;
      increment?: boolean;
    };

    if (email !== undefined) {
      if (typeof email !== "string" || !isValidEmail(email.trim())) {
        return NextResponse.json(
          { error: "A valid email is required" },
          { status: 400 }
        );
      }

      const record = await saveEmailForIp(ip, email);
      return NextResponse.json(checkUsage(record));
    }

    if (increment) {
      const record = await incrementUsageForIp(ip);
      return NextResponse.json(checkUsage(record));
    }

    return NextResponse.json(
      { error: "Provide email or increment: true" },
      { status: 400 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to track usage" }, { status: 500 });
  }
}
