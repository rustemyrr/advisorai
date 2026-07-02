-- Run this once in the Supabase dashboard → SQL Editor.
--
-- The original schema.sql constrained profiles.plan to ('free', 'pro'), but
-- every API route (app/api/plan, app/api/usage/supabase, app/api/pricelist)
-- has always used ('starter', 'standard', 'professional'). Any profile insert
-- with plan='starter' has been silently failing the old CHECK constraint.
-- This migration brings the DB in line with the app and adds the columns
-- needed to link a Paddle subscription back to a Supabase user.

alter table public.profiles
  drop constraint if exists profiles_plan_check;

-- Reclassify any pre-existing rows before tightening the constraint.
update public.profiles set plan = 'starter' where plan = 'free';
update public.profiles set plan = 'professional' where plan = 'pro';

alter table public.profiles
  alter column plan set default 'starter';

alter table public.profiles
  add constraint profiles_plan_check check (plan in ('starter', 'standard', 'professional'));

alter table public.profiles
  add column if not exists paddle_subscription_id text;

alter table public.profiles
  add column if not exists paddle_customer_id text;

create index if not exists profiles_paddle_subscription_id_idx
  on public.profiles (paddle_subscription_id);
