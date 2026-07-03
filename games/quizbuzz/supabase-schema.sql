create table if not exists public.quiz_rooms (
  id text primary key,
  host_id text,
  category text,
  status text not null default 'waiting',
  current_question_index integer not null default 0,
  question_phase text not null default 'waiting',
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  players jsonb not null default '{}'::jsonb
);

alter table public.quiz_rooms enable row level security;

create policy if not exists "Allow anon read/write access" on public.quiz_rooms
for all
using (true)
with check (true);
