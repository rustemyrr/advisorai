-- Applied to the live project (kzienmsdjtewcjihejhd) on 2026-11-10.
--
-- Two problems, one migration.
--
-- 1. Policies that let a signed-in user write their own rows.
--    The browser client only ever calls supabase.auth.*; every table read and
--    write in this app goes through an API route using the service-role key,
--    which bypasses RLS entirely. The per-user policies were therefore dead
--    weight for us -- but fully reachable by anyone holding the publishable
--    key and their own session token, i.e. every signed-up user.
--
--    The live database had them as `for all` ("Users can manage own ..."),
--    which covers UPDATE and INSERT as well as SELECT. With them in place a
--    user could reset usage.count to 0 and keep generating for free, or write
--    themselves a pricelist on a plan that does not include one -- which
--    /api/generate then feeds into the prompt. Replaced with select-only
--    policies of the same shape; reading one's own rows is harmless.
--
--    public.history is a legacy table no code touches any more; it is locked
--    down here for the same reason rather than left writable.
--
-- 2. The anonymous daily counter had no storage at all.
--    It lived in a Map in process memory, so every serverless instance had its
--    own and lost it between invocations -- in production that is not a cap,
--    it is unlimited generation billed to our Anthropic key.

drop policy if exists "Users can manage own usage" on public.usage;
create policy "Users can read own usage"
  on public.usage for select using (auth.uid() = user_id);

drop policy if exists "Users can manage own pricelist" on public.pricelist;
create policy "Users can read own pricelist"
  on public.pricelist for select using (auth.uid() = user_id);

drop policy if exists "Users can manage own generation_history" on public.generation_history;
create policy "Users can read own generation_history"
  on public.generation_history for select using (auth.uid() = user_id);

drop policy if exists "Users can manage own history" on public.history;
create policy "Users can read own history"
  on public.history for select using (auth.uid() = user_id);

-- public.profiles was already select-only ("Users can read own profile").

-- Daily free-generation counter for visitors who are not signed in.
create table if not exists public.anon_usage (
  ip    text    not null,
  date  date    not null,
  count integer not null default 0,
  constraint anon_usage_pkey primary key (ip, date)
);

-- RLS on with no policies at all: reachable by the service role only.
alter table public.anon_usage enable row level security;

-- Atomic increment, so two concurrent requests from one IP cannot both read
-- the same count and write back the same value.
create or replace function public.increment_anon_usage(p_ip text, p_date date)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.anon_usage as au (ip, date, count)
  values (p_ip, p_date, 1)
  on conflict (ip, date) do update set count = au.count + 1
  returning au.count;
$$;

-- security definer runs as the owner, so it must not be callable by the
-- publishable key; only the service-role client may increment.
revoke execute on function public.increment_anon_usage(text, date) from public;
revoke execute on function public.increment_anon_usage(text, date) from anon;
revoke execute on function public.increment_anon_usage(text, date) from authenticated;
