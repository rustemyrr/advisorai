-- Applied to the live project (kzienmsdjtewcjihejhd) on 2026-11-15 with
-- Rustem's go-ahead. Checked immediately before dropping it: 0 rows, no
-- foreign keys pointing at it, no views or triggers depending on it, and no
-- reference to it anywhere in the code. Afterwards PostgREST answers 404
-- PGRST205 for it, while generation_history and profiles are untouched.
--
-- public.history is left over from an earlier shape of the app. The live table
-- holds 0 rows and no code refers to it -- generations are stored in
-- public.generation_history (see app/api/history/route.ts). Checked on
-- 2026-11-15 during the site audit.

drop table if exists public.history;
