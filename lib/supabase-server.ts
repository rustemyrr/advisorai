import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;

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
