-- Run this once in the Supabase dashboard → SQL Editor

-- Daily usage tracking
create table if not exists public.usage (
  id         uuid    default gen_random_uuid() primary key,
  user_id    uuid    references auth.users(id) on delete cascade not null,
  date       date    not null default current_date,
  count      integer not null default 0,
  constraint usage_user_date_unique unique (user_id, date)
);

-- Per-user plan (free | pro). Row is created on first sign-up.
create table if not exists public.profiles (
  user_id    uuid    references auth.users(id) on delete cascade primary key,
  plan       text    not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz default now()
);

-- RLS: users can only read/write their own rows
alter table public.usage    enable row level security;
alter table public.profiles enable row level security;

create policy "own usage select"  on public.usage    for select using (auth.uid() = user_id);
create policy "own usage insert"  on public.usage    for insert with check (auth.uid() = user_id);
create policy "own usage update"  on public.usage    for update using (auth.uid() = user_id);

create policy "own profile select" on public.profiles for select using (auth.uid() = user_id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "own profile update" on public.profiles for update using (auth.uid() = user_id);

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
create policy "own history insert" on public.generation_history for insert with check (auth.uid() = user_id);
