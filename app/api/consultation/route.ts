import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { getClientIp } from "@/lib/get-client-ip";
import { notifyNewConsultation } from "@/lib/notify";

export const dynamic = "force-dynamic";

const MAX_NAME_LENGTH = 100;
const MAX_CONTACT_LENGTH = 200;
const MAX_COMMENT_LENGTH = 2000;

// How many requests one address may leave in a day. A real visitor sends one;
// three leaves room for a retry and a second person behind the same office NAT.
const MAX_REQUESTS_PER_IP_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// Field the form renders off-screen. A person never sees it, so anything in it
// came from a bot filling every input on the page.
const HONEYPOT_FIELD = "website";

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
  const ip = getClientIp(request);

  // Answer a bot the same way we answer a person, so it has nothing to learn
  // from the response, and write nothing.
  if (clean((body as Record<string, unknown>)[HONEYPOT_FIELD], 200)) {
    console.warn("[consultation POST] honeypot filled, dropped:", ip);
    return NextResponse.json({ ok: true });
  }

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

  // The table itself is the counter -- every row already carries ip and
  // created_at, so this needs no second table and no migration.
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { count, error: countError } = await db
    .from("consultation_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);

  if (countError) {
    // Fail closed, like the generation counter: an unreadable counter is no
    // counter at all, and this is the only unauthenticated write path we have.
    console.error("[consultation POST] rate check failed:", countError.message);
    return NextResponse.json({ error: "Could not save request" }, { status: 500 });
  }

  if ((count ?? 0) >= MAX_REQUESTS_PER_IP_PER_DAY) {
    return NextResponse.json(
      { error: "Too many requests from this address today" },
      { status: 429 }
    );
  }

  const { error } = await db.from("consultation_requests").insert({
    name: cleanName,
    contact: cleanContact,
    comment: cleanComment || null,
    source: "agents",
    ip,
  });

  if (error) {
    // Do not leak the database error to the visitor — the form only needs to
    // know it failed, and a missing table here is our problem, not theirs.
    console.error("[consultation POST]", error.message);
    return NextResponse.json({ error: "Could not save request" }, { status: 500 });
  }

  // Saved first, told second: the row is the record, the message is a courtesy.
  await notifyNewConsultation({
    name: cleanName,
    contact: cleanContact,
    comment: cleanComment || null,
    source: "agents",
  });

  return NextResponse.json({ ok: true });
}
