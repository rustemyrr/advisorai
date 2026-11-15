-- NOT YET APPLIED to the live project. Run it before /agents goes live,
-- otherwise the consultation form's POST /api/consultation returns 500.
--
-- Stores the consultation requests left on /agents ("Агенты для профессионалов").
--
-- Written only by the API route with the service-role key, exactly like
-- public.anon_usage: the browser client holds the publishable key and must
-- never be able to insert here, or the table becomes a spam target.
create table if not exists public.consultation_requests (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text        not null,
  contact    text        not null,
  comment    text,
  -- Which page/section the request came from, so a second form later can
  -- share the table without guessing where a row came from.
  source     text        not null default 'agents',
  -- Kept for spam triage only; the privacy policy already covers IP storage.
  ip         text
);

-- Requests are read newest-first in the dashboard.
create index if not exists consultation_requests_created_at_idx
  on public.consultation_requests (created_at desc);

-- RLS on with no policies at all: reachable by the service role only.
alter table public.consultation_requests enable row level security;
