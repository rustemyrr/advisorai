-- Test data for the service agent, to be run AFTER migration 0006.
--
-- It creates one shop owned by you, three customers with cars, some history,
-- and a booking for tomorrow -- enough to exercise every path the agent has:
-- a known caller, an unknown caller, a service that is due, a warranty that is
-- about to end, and a booking waiting to be confirmed.
--
-- Run it in the Supabase SQL editor. Safe to run twice: everything is keyed on
-- the shop and upserted.
--
-- To remove it all later:
--   delete from public.service_shops where name = 'Тестовый автосервис';
-- (every other table cascades from there)

-- 1. The shop. Replace the e-mail with the account you sign in to AdvisorAI
--    with; the agent reads settings through the owner.
with owner as (
  select id from auth.users where email = 'yertisbayrr@gmail.com'
)
insert into public.service_shops (
  user_id, name, phone, address, timezone, locale,
  slot_minutes, bays, maintenance_interval_km, maintenance_interval_months,
  maintenance_lead_days, warranty_lead_days
)
select
  owner.id, 'Тестовый автосервис', '+7 717 000 00 00', 'Астана, Кабанбай батыра 1',
  'Asia/Almaty', 'ru', 60, 2, 10000, 12, 14, 30
from owner
on conflict (user_id) do update set
  name = excluded.name,
  phone = excluded.phone,
  address = excluded.address;

-- 2. Three customers.
--    +77011234567 -- due for a service, has history (the main test caller)
--    +77021234567 -- warranty ends in three weeks
--    +77031234567 -- booked for tomorrow, not confirmed yet
with shop as (
  select id from public.service_shops where name = 'Тестовый автосервис'
)
insert into public.service_customers (shop_id, name, phone)
select shop.id, v.name, v.phone
from shop, (values
  ('Руслан',  '+77011234567'),
  ('Айгерим', '+77021234567'),
  ('Данияр',  '+77031234567')
) as v(name, phone)
on conflict (shop_id, phone) do update set name = excluded.name;

-- 3. Their cars. Dates are relative to today, so the data stays current
--    however long after you run this you actually test.
with shop as (
  select id from public.service_shops where name = 'Тестовый автосервис'
)
insert into public.service_vehicles (
  shop_id, customer_id, make, model, year, plate, mileage, mileage_updated_at,
  last_service_at, next_service_due_at, next_service_due_km,
  warranty_until, warranty_km
)
select
  shop.id, c.id, v.make, v.model, v.year, v.plate, v.mileage, now(),
  now() - (v.last_service_days || ' days')::interval,
  (current_date + v.due_in_days)::date,
  v.due_km,
  (current_date + v.warranty_in_days)::date,
  v.warranty_km
from shop
join public.service_customers c on c.shop_id = shop.id
join (values
  -- due for a service in a week, warranty still has a year
  ('+77011234567', 'Toyota', 'Camry',   2022, '123ABC02', 58400, 350,   7, 60000, 365, 100000),
  -- warranty ends in three weeks, service not due yet
  ('+77021234567', 'Hyundai', 'Tucson', 2023, '456DEF02', 31200, 120, 200, 40000,  21, 100000),
  -- booked for tomorrow (see below)
  ('+77031234567', 'Kia',     'Sportage', 2021, '789GHI02', 71000, 400, 300, 80000, -30, 100000)
) as v(phone, make, model, year, plate, mileage, last_service_days, due_in_days, due_km, warranty_in_days, warranty_km)
  on v.phone = c.phone
where not exists (
  select 1 from public.service_vehicles existing
  where existing.shop_id = shop.id and existing.plate = v.plate
);

-- 4. Past work, so "what did you do last time" has an answer.
with shop as (
  select id from public.service_shops where name = 'Тестовый автосервис'
)
insert into public.service_visits (shop_id, vehicle_id, performed_at, mileage, works, total, currency)
select shop.id, veh.id, veh.last_service_at, veh.mileage - 9000,
       'Замена масла и фильтров, диагностика тормозной системы', 48000, 'KZT'
from shop
join public.service_vehicles veh on veh.shop_id = shop.id
where veh.last_service_at is not null
  and not exists (
    select 1 from public.service_visits existing where existing.vehicle_id = veh.id
  );

-- 5. A booking for tomorrow at 11:00 local, still unconfirmed -- this is what
--    the confirmation pass calls about.
with shop as (
  select id, timezone from public.service_shops where name = 'Тестовый автосервис'
)
insert into public.service_appointments (
  shop_id, customer_id, vehicle_id, starts_at, ends_at, service_type, status, source, notes
)
select
  shop.id, c.id, veh.id,
  ((current_date + 1)::text || ' 11:00')::timestamp at time zone shop.timezone,
  ((current_date + 1)::text || ' 12:00')::timestamp at time zone shop.timezone,
  'maintenance', 'booked', 'inbound_call', 'Тестовая запись из seed-файла'
from shop
join public.service_customers c on c.shop_id = shop.id and c.phone = '+77031234567'
join public.service_vehicles veh on veh.customer_id = c.id
where not exists (
  select 1 from public.service_appointments existing
  where existing.shop_id = shop.id and existing.notes = 'Тестовая запись из seed-файла'
);

-- What to check afterwards:
--   select id from public.service_shops where name = 'Тестовый автосервис';
-- That id is SERVICE_AGENT_SHOP_ID.
