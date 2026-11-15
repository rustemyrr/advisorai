-- Customer-facing service agent: the agent that talks to customers on the
-- phone, books and confirms appointments, and calls about a due service or an
-- expiring warranty.
--
-- NOT applied to the live project yet -- run it in the Supabase SQL editor
-- (project kzienmsdjtewcjihejhd) when the agent goes live.
--
-- Every table here is written by API routes holding the service-role key,
-- exactly like public.consultation_requests: the browser holds the publishable
-- key and must never be able to write a booking or a customer phone number.
-- Read access is granted to the owner of the shop only.
--
-- Note on provider mode: with SERVICE_AGENT_PROVIDER=crm or =odata-1c the
-- customer, vehicle and appointment tables stay empty -- that data lives in the
-- CRM or in 1C. service_reminders and service_calls are used in every mode,
-- because the record of "we already called this customer about this" and the
-- call log belong to the agent, not to the CRM.

-- One shop per AdvisorAI account. Holds the dialling hours, the slot grid and
-- the service intervals the agent reasons about.
create table if not exists public.service_shops (
  id                          uuid        primary key default gen_random_uuid(),
  user_id                     uuid        references auth.users(id) on delete cascade not null unique,
  name                        text        not null,
  phone                       text,
  address                     text,
  timezone                    text        not null default 'Asia/Almaty',
  locale                      text        not null default 'ru',
  -- Opening hours per weekday, 0 = Sunday: {"1": ["09:00","19:00"], ...}.
  -- A weekday missing from the object is a day off.
  working_hours               jsonb       not null default '{"1":["09:00","19:00"],"2":["09:00","19:00"],"3":["09:00","19:00"],"4":["09:00","19:00"],"5":["09:00","19:00"],"6":["10:00","16:00"]}',
  -- Length of one booking slot and how many cars can be in at once.
  slot_minutes                integer     not null default 60 check (slot_minutes between 15 and 480),
  bays                        integer     not null default 2 check (bays between 1 and 50),
  -- Defaults used when a vehicle carries no interval of its own.
  maintenance_interval_km     integer     not null default 10000,
  maintenance_interval_months integer     not null default 12,
  -- How far ahead the agent calls about a due service or an ending warranty.
  maintenance_lead_days       integer     not null default 14,
  warranty_lead_days          integer     not null default 30,
  created_at                  timestamptz not null default now()
);

create table if not exists public.service_customers (
  id            uuid        primary key default gen_random_uuid(),
  shop_id       uuid        references public.service_shops(id) on delete cascade not null,
  -- Id of the same customer in the CRM or in 1C, when the row was synced.
  crm_id        text,
  name          text        not null default '',
  -- E.164, the only form the agent dials or looks up by.
  phone         text        not null,
  -- Whether the shop may call this customer about reminders. A person who says
  -- "do not call me again" is kept, not deleted, so the agent stays silent.
  calls_allowed boolean     not null default true,
  notes         text,
  created_at    timestamptz not null default now(),
  constraint service_customers_shop_phone_unique unique (shop_id, phone)
);

create table if not exists public.service_vehicles (
  id                  uuid        primary key default gen_random_uuid(),
  shop_id             uuid        references public.service_shops(id) on delete cascade not null,
  customer_id         uuid        references public.service_customers(id) on delete cascade not null,
  crm_id              text,
  make                text        not null default '',
  model               text        not null default '',
  year                integer,
  plate               text,
  vin                 text,
  mileage             integer,
  mileage_updated_at  timestamptz,
  -- Set after every visit. Either one may be null: a car that is driven little
  -- comes due by date, a taxi comes due by odometer.
  last_service_at     timestamptz,
  next_service_due_at date,
  next_service_due_km integer,
  -- Warranty as the shop sold it: a date, a mileage cap, or both.
  warranty_until      date,
  warranty_km         integer,
  created_at          timestamptz not null default now()
);

create index if not exists service_vehicles_customer_idx on public.service_vehicles (customer_id);
create index if not exists service_vehicles_due_idx      on public.service_vehicles (shop_id, next_service_due_at);
create index if not exists service_vehicles_warranty_idx on public.service_vehicles (shop_id, warranty_until);

-- Work already done. The agent reads it to answer "what did you do last time"
-- and to date the next service from the last one.
create table if not exists public.service_visits (
  id           uuid        primary key default gen_random_uuid(),
  shop_id      uuid        references public.service_shops(id) on delete cascade not null,
  vehicle_id   uuid        references public.service_vehicles(id) on delete cascade not null,
  crm_id       text,
  performed_at timestamptz not null,
  mileage      integer,
  works        text        not null default '',
  total        numeric,
  currency     text        not null default 'KZT',
  created_at   timestamptz not null default now()
);

create index if not exists service_visits_vehicle_idx on public.service_visits (vehicle_id, performed_at desc);

create table if not exists public.service_appointments (
  id           uuid        primary key default gen_random_uuid(),
  shop_id      uuid        references public.service_shops(id) on delete cascade not null,
  customer_id  uuid        references public.service_customers(id) on delete cascade not null,
  vehicle_id   uuid        references public.service_vehicles(id) on delete set null,
  crm_id       text,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  service_type text        not null default 'maintenance',
  -- booked: the agent wrote it down. confirmed: the customer said yes to the
  -- reminder call. The other three are how it ends.
  status       text        not null default 'booked'
               check (status in ('booked', 'confirmed', 'cancelled', 'completed', 'no_show')),
  source       text        not null default 'inbound_call'
               check (source in ('inbound_call', 'outbound_call', 'chat', 'admin')),
  notes        text,
  confirmed_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists service_appointments_slot_idx     on public.service_appointments (shop_id, starts_at);
create index if not exists service_appointments_customer_idx on public.service_appointments (customer_id, starts_at desc);

-- One row per thing the agent means to tell a customer. The unique dedupe_key
-- is what stops a cron that runs every morning from calling the same person
-- about the same service every single morning.
create table if not exists public.service_reminders (
  id             uuid        primary key default gen_random_uuid(),
  shop_id        uuid        references public.service_shops(id) on delete cascade not null,
  customer_id    uuid        references public.service_customers(id) on delete set null,
  vehicle_id     uuid        references public.service_vehicles(id) on delete set null,
  appointment_id uuid        references public.service_appointments(id) on delete set null,
  kind           text        not null check (kind in ('maintenance', 'warranty', 'confirmation')),
  -- Stable per (kind, subject, period), e.g. maintenance:<vehicle>:2026-12.
  dedupe_key     text        not null,
  due_on         date        not null,
  status         text        not null default 'pending'
                 check (status in ('pending', 'sent', 'failed', 'skipped')),
  channel        text        not null default 'call',
  -- Phone and name are copied in, so a reminder stays readable when the
  -- customer row is gone or lives in a CRM we no longer reach.
  payload        jsonb       not null default '{}',
  attempts       integer     not null default 0,
  last_error     text,
  sent_at        timestamptz,
  created_at     timestamptz not null default now(),
  constraint service_reminders_dedupe_unique unique (shop_id, dedupe_key)
);

create index if not exists service_reminders_pending_idx on public.service_reminders (shop_id, status, due_on);

-- Call log. One row per conversation, inbound or outbound, with the transcript
-- the telephony provider reports and what the agent made of it.
create table if not exists public.service_calls (
  id             uuid        primary key default gen_random_uuid(),
  shop_id        uuid        references public.service_shops(id) on delete cascade not null,
  customer_id    uuid        references public.service_customers(id) on delete set null,
  appointment_id uuid        references public.service_appointments(id) on delete set null,
  reminder_id    uuid        references public.service_reminders(id) on delete set null,
  -- Call id at the telephony provider, so a webhook can find its own call.
  external_id    text,
  direction      text        not null check (direction in ('inbound', 'outbound')),
  phone          text        not null default '',
  purpose        text        not null default 'inbound'
                 check (purpose in ('inbound', 'maintenance', 'warranty', 'confirmation')),
  status         text        not null default 'started'
                 check (status in ('queued', 'started', 'completed', 'failed', 'no_answer')),
  outcome        text,
  summary        text,
  transcript     jsonb       not null default '[]',
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  constraint service_calls_external_unique unique (shop_id, external_id)
);

create index if not exists service_calls_started_idx on public.service_calls (shop_id, started_at desc);

-- RLS: on everywhere, select for the owner of the shop, and no insert, update
-- or delete policies at all -- every write goes through an API route with the
-- service-role key, which bypasses RLS.
alter table public.service_shops        enable row level security;
alter table public.service_customers    enable row level security;
alter table public.service_vehicles     enable row level security;
alter table public.service_visits       enable row level security;
alter table public.service_appointments enable row level security;
alter table public.service_reminders    enable row level security;
alter table public.service_calls        enable row level security;

create policy "own shop select" on public.service_shops
  for select using (auth.uid() = user_id);

create policy "own customers select" on public.service_customers
  for select using (exists (
    select 1 from public.service_shops s
    where s.id = service_customers.shop_id and s.user_id = auth.uid()
  ));

create policy "own vehicles select" on public.service_vehicles
  for select using (exists (
    select 1 from public.service_shops s
    where s.id = service_vehicles.shop_id and s.user_id = auth.uid()
  ));

create policy "own visits select" on public.service_visits
  for select using (exists (
    select 1 from public.service_shops s
    where s.id = service_visits.shop_id and s.user_id = auth.uid()
  ));

create policy "own appointments select" on public.service_appointments
  for select using (exists (
    select 1 from public.service_shops s
    where s.id = service_appointments.shop_id and s.user_id = auth.uid()
  ));

create policy "own reminders select" on public.service_reminders
  for select using (exists (
    select 1 from public.service_shops s
    where s.id = service_reminders.shop_id and s.user_id = auth.uid()
  ));

create policy "own calls select" on public.service_calls
  for select using (exists (
    select 1 from public.service_shops s
    where s.id = service_calls.shop_id and s.user_id = auth.uid()
  ));
