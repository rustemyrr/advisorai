import { createClient } from "@supabase/supabase-js";

function asciiOnly(s: string | undefined): string {
  return (s ?? "").replace(/[^\x20-\x7E]/g, "").trim();
}

const url = asciiOnly(process.env.NEXT_PUBLIC_SUPABASE_URL);
const secretKey = asciiOnly(process.env.SUPABASE_SERVICE_ROLE_KEY);

// Admin client for API routes — uses secret key, bypasses RLS.
// Always scope queries manually to the verified user_id.
export function createAdminClient() {
  return createClient(url, secretKey, {
    auth: { persistSession: false },
  });
}

// Verifies a user's access token and returns their user object.
// Returns null if the token is invalid or missing.
export async function getUserFromToken(token: string | null) {
  if (!token) return null;
  const client = createAdminClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/**
 * True when a `.rpc()` call failed because the function is not in the
 * database yet. A migration lands in git before it is run against the live
 * project, so every RPC added after launch has to answer this question: is
 * this "not deployed yet" (fall back) or "broken" (fail closed).
 */
export function isMissingFunction(error: {
  code?: string | null;
  message?: string | null;
}): boolean {
  // PostgREST answers PGRST202 when the function is not in its schema cache;
  // 42883 is Postgres' own "function does not exist".
  if (error.code === "PGRST202" || error.code === "42883") return true;
  return /could not find the function|function .* does not exist/i.test(
    error.message ?? ""
  );
}
