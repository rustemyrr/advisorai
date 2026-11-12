import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { getClientIp } from "@/lib/get-client-ip";

export const dynamic = "force-dynamic";

const MAX_NAME_LENGTH = 100;
const MAX_CONTACT_LENGTH = 200;
const MAX_COMMENT_LENGTH = 2000;

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

// POST /api/consultation — a consultation request left on /agents.
//
// Public on purpose: the form is for visitors who do not have an account.
// The insert goes through the service-role client because the table has RLS
// on with no policies, so nothing holding the publishable key can write to it.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { name, contact, comment } = body as Record<string, unknown>;

  const cleanName = clean(name, MAX_NAME_LENGTH);
  const cleanContact = clean(contact, MAX_CONTACT_LENGTH);
  const cleanComment = clean(comment, MAX_COMMENT_LENGTH);

  if (!cleanName || !cleanContact) {
    return NextResponse.json(
      { error: "name and contact are required" },
      { status: 400 }
    );
  }

  const db = createAdminClient();
  const { error } = await db.from("consultation_requests").insert({
    name: cleanName,
    contact: cleanContact,
    comment: cleanComment || null,
    source: "agents",
    ip: getClientIp(request),
  });

  if (error) {
    // Do not leak the database error to the visitor — the form only needs to
    // know it failed, and a missing table here is our problem, not theirs.
    console.error("[consultation POST]", error.message);
    return NextResponse.json({ error: "Could not save request" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
