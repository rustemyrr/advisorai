import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Browser singleton — safe to import in client components
export const supabase = createClient(url, key, {
  auth: { persistSession: true, storageKey: "advisorai_auth" },
});
