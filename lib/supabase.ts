import { createClient } from "@supabase/supabase-js";

// Strip any hidden non-ASCII characters (zero-width spaces, BOMs, invisible
// Unicode formatting chars) that can arrive via copy-paste from dashboards.
// Chrome's Fetch API rejects header values with code points > 127.
function asciiOnly(s: string | undefined): string {
  return (s ?? "").replace(/[^\x20-\x7E]/g, "").trim();
}

const url = asciiOnly(process.env.NEXT_PUBLIC_SUPABASE_URL);
const key = asciiOnly(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

// Browser singleton — safe to import in client components
export const supabase = createClient(url, key, {
  auth: { persistSession: true, storageKey: "advisorai_auth" },
});
