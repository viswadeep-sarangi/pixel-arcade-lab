create schema if not exists quizbuzz;

create table if not exists quizbuzz.quiz_rooms (
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

create table if not exists quizbuzz.quiz_players (
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

create table if not exists quizbuzz.quiz_player_answers (
  id bigserial primary key,
  player_id text not null,
  room_id text not null,
  question_index integer not null,
  answer_option_index integer,
  score_for_question integer,
  unique (player_id, room_id, question_index)
);

create table if not exists quizbuzz.quiz_categories (
  category_id text not null,
  topic text not null,
  author text not null,
  constraint quiz_categories_pkey primary key (category_id),
  constraint quiz_categories_topic_key unique (topic)
) TABLESPACE pg_default;

create table if not exists quizbuzz.quiz_questions (
  id bigint not null,
  category_id text not null,
  question text not null,
  option_1 text not null,
  option_2 text not null,
  option_3 text not null,
  option_4 text not null,
  correct_answer smallint not null,
  constraint quiz_questions_pkey primary key (id),
  constraint quiz_questions_category_id_fkey foreign key (category_id) references quizbuzz.quiz_categories (category_id) on delete cascade,
  constraint quiz_questions_correct_answer_check check (
    (
      (correct_answer >= 0)
      and (correct_answer <= 3)
    )
  )
) TABLESPACE pg_default;

alter table quizbuzz.quiz_rooms enable row level security;
alter table quizbuzz.quiz_players enable row level security;
alter table quizbuzz.quiz_player_answers enable row level security;
alter table quizbuzz.quiz_categories enable row level security;
alter table quizbuzz.quiz_questions enable row level security;

create policy if not exists "Allow anon read/write access" on quizbuzz.quiz_rooms
  for all
  using (true)
  with check (true);

create policy if not exists "Allow anon read/write access" on quizbuzz.quiz_players
  for all
  using (true)
  with check (true);

create policy if not exists "Allow anon read/write access" on quizbuzz.quiz_player_answers
  for all
  using (true)
  with check (true);

create policy if not exists "Allow anon read/write access" on quizbuzz.quiz_categories
  for all
  using (true)
  with check (true);

create policy if not exists "Allow anon read/write access" on quizbuzz.quiz_questions
  for all
  using (true)
  with check (true);
