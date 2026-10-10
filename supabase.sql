-- Run once in the Supabase SQL editor.
create table if not exists public.calls (
  call_id    text primary key,
  phone      text,
  data       jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists calls_phone_idx on public.calls (phone);
-- Only the server (service key) touches this table; browsers must never reach it.
alter table public.calls enable row level security;
