-- Run this once in the Supabase dashboard → SQL Editor

-- Daily usage tracking
create table if not exists public.usage (
  id         uuid    default gen_random_uuid() primary key,
  user_id    uuid    references auth.users(id) on delete cascade not null,
  date       date    not null default current_date,
  count      integer not null default 0,
  constraint usage_user_date_unique unique (user_id, date)
);

-- Per-user plan. Row is created on first sign-up.
create table if not exists public.profiles (
  id                     uuid    references auth.users(id) on delete cascade primary key,
  plan                   text    not null default 'starter' check (plan in ('starter', 'standard', 'professional')),
  paddle_subscription_id text,
  paddle_customer_id     text,
  created_at             timestamptz default now()
);

-- RLS: users may read their own rows. Every write in this app goes through
-- an API route using the service-role key, which bypasses RLS, so there are
-- deliberately no insert/update policies — see migration 0002.
alter table public.usage    enable row level security;
alter table public.profiles enable row level security;

create policy "own usage select"  on public.usage    for select using (auth.uid() = user_id);

create policy "own profile select" on public.profiles for select using (auth.uid() = id);

-- Generation history
create table if not exists public.generation_history (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users(id) on delete cascade not null,
  input       text        not null,
  estimate    text        not null,
  explanation text        not null,
  upsell      text        not null,
  currency    text        not null default 'USD',
  created_at  timestamptz default now()
);

alter table public.generation_history enable row level security;

create policy "own history select" on public.generation_history for select using (auth.uid() = user_id);

-- Pricelist (one per user, upserted on save)
create table if not exists public.pricelist (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users(id) on delete cascade not null unique,
  filename    text        not null default '',
  labor_rate  numeric     not null default 0,
  items       jsonb       not null default '[]',
  updated_at  timestamptz default now()
);

alter table public.pricelist enable row level security;

create policy "own pricelist select" on public.pricelist for select using (auth.uid() = user_id);

-- Daily free-generation counter for visitors who are not signed in. Kept in
-- Postgres because serverless instances do not share memory: an in-process
-- counter is no cap at all. No policies — service role only.
create table if not exists public.anon_usage (
  ip    text    not null,
  date  date    not null,
  count integer not null default 0,
  constraint anon_usage_pkey primary key (ip, date)
);

alter table public.anon_usage enable row level security;

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

revoke execute on function public.increment_anon_usage(text, date) from public;
revoke execute on function public.increment_anon_usage(text, date) from anon;
revoke execute on function public.increment_anon_usage(text, date) from authenticated;
