-- Atomic generation accounting for signed-in accounts.
--
-- NOT applied to the live project yet -- run it in the Supabase SQL editor
-- (project kzienmsdjtewcjihejhd). The application works either way: until this
-- is applied it falls back to the read-modify-write it used before, so nothing
-- breaks, the cap is just as loose as it was. Once applied it tightens on its
-- own, with no deploy.
--
-- public.increment_anon_usage (migration 0002) already does this for visitors
-- who are not signed in. The account path never had it: /api/generate read
-- usage.count, called the model, then wrote count + 1. Two requests that
-- arrive together both read 4 and both write 5, so a plan's monthly limit is
-- quietly exceeded -- and that limit is the thing the customer is paying for.
-- Deciding it needs one statement, not three.

-- Spends one generation of this month's allowance and says whether it was
-- spent. `counted = false` means the account is already at its limit and
-- nothing was written.
create or replace function public.increment_usage(
  p_user_id uuid,
  p_date    date,
  p_limit   integer
)
returns table (counted boolean, new_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  -- An unlimited plan never calls this, and a limit of zero must not create a
  -- row that looks like a spent generation.
  if p_limit is null or p_limit <= 0 then
    select u.count into v_count
      from public.usage u
     where u.user_id = p_user_id and u.date = p_date;
    return query select false, coalesce(v_count, 0);
    return;
  end if;

  -- The insert covers a month with no row yet. The condition on the DO UPDATE
  -- is what makes "check the limit" and "spend one" a single statement: when
  -- the row is already at the limit the WHERE fails, no row comes back, and
  -- nothing was written.
  insert into public.usage as u (user_id, date, count)
  values (p_user_id, p_date, 1)
  on conflict (user_id, date) do update
     set count = u.count + 1
   where u.count < p_limit
  returning u.count into v_count;

  if v_count is not null then
    return query select true, v_count;
    return;
  end if;

  select u.count into v_count
    from public.usage u
   where u.user_id = p_user_id and u.date = p_date;
  return query select false, coalesce(v_count, p_limit);
end;
$$;

-- Gives one generation back. Used for the single failure that costs nothing
-- and cannot be provoked from the request: the call to the model itself did
-- not return. Everything that fails after a reply has already spent the key,
-- and stays spent.
create or replace function public.release_usage(p_user_id uuid, p_date date)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.usage as u
     set count = greatest(u.count - 1, 0)
   where u.user_id = p_user_id and u.date = p_date
  returning u.count;
$$;

create or replace function public.release_anon_usage(p_ip text, p_date date)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.anon_usage as au
     set count = greatest(au.count - 1, 0)
   where au.ip = p_ip and au.date = p_date
  returning au.count;
$$;

-- security definer runs as the owner, so none of these may be callable by the
-- publishable key: only the service-role client counts generations.
revoke execute on function public.increment_usage(uuid, date, integer) from public;
revoke execute on function public.increment_usage(uuid, date, integer) from anon;
revoke execute on function public.increment_usage(uuid, date, integer) from authenticated;

revoke execute on function public.release_usage(uuid, date) from public;
revoke execute on function public.release_usage(uuid, date) from anon;
revoke execute on function public.release_usage(uuid, date) from authenticated;

revoke execute on function public.release_anon_usage(text, date) from public;
revoke execute on function public.release_anon_usage(text, date) from anon;
revoke execute on function public.release_anon_usage(text, date) from authenticated;
