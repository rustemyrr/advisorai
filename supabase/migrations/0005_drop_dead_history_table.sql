-- NOT applied to the live project. Rustem's call: it drops a table.
--
-- public.history is left over from an earlier shape of the app. The live table
-- holds 0 rows and no code refers to it -- generations are stored in
-- public.generation_history (see app/api/history/route.ts). Checked on
-- 2026-11-15 during the site audit.

drop table if exists public.history;
