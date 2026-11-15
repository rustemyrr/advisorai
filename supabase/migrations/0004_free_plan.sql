-- NOT applied to the live project yet. Rustem's call: it changes existing rows.
--
-- Until 2026-11-15 every new account was created with plan = 'starter', which
-- is the $4 tier (15 generations a month). So registration handed out the whole
-- paid plan for free and there was no reason to buy Starter. The code now
-- creates accounts on a separate 'free' plan (5 generations a month, see
-- PLAN_LIMITS in lib/usage.ts), and this migration makes the database accept
-- that value and stop handing out 'starter' by default.

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  alter column plan set default 'free';

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'starter', 'standard', 'professional'));

-- Accounts sitting on 'starter' without a Paddle subscription never paid for
-- it: they were given the tier by the old default. Move them to 'free'.
-- Anyone who did pay has paddle_subscription_id set and is left alone.
update public.profiles
   set plan = 'free'
 where plan = 'starter'
   and paddle_subscription_id is null;
