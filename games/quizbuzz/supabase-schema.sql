create table if not exists public.quiz_rooms (
  room_id text primary key,
  category text,
  host_id text,
  status text not null default 'waiting',
  question_phase text not null default 'waiting',
  current_question_index integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create table if not exists public.quiz_players (
  id bigserial primary key,
  player_id text not null,
  room_id text not null,
  name text,
  joined_at timestamptz,
  score integer not null default 0,
  completed_questions integer not null default 0,
  has_submitted boolean not null default false,
  current_answer integer,
  unique (player_id)
);

create table if not exists public.quiz_player_answers (
  id bigserial primary key,
  player_id text not null,
  room_id text not null,
  question_index integer not null,
  answer_option_index integer,
  score_for_question integer,
  unique (player_id, room_id, question_index)
);

alter table public.quiz_rooms enable row level security;
alter table public.quiz_players enable row level security;
alter table public.quiz_player_answers enable row level security;

create policy if not exists "Allow anon read/write access" on public.quiz_rooms
  for all
  using (true)
  with check (true);

create policy if not exists "Allow anon read/write access" on public.quiz_players
  for all
  using (true)
  with check (true);

create policy if not exists "Allow anon read/write access" on public.quiz_player_answers
  for all
  using (true)
  with check (true);
