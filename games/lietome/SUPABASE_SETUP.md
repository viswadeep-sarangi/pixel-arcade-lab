# Supabase Setup For Lie To Me

Lie To Me stores each room in one row of:

```text
public.lietome_rooms
```

Run this SQL in Supabase SQL Editor:

```sql
create table if not exists public.lietome_rooms (
  room_id text primary key,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lietome_rooms enable row level security;

create policy "lietome public read" on public.lietome_rooms
for select
using (true);

create policy "lietome public insert" on public.lietome_rooms
for insert
with check (true);

create policy "lietome public update" on public.lietome_rooms
for update
using (true)
with check (true);

create policy "lietome public delete" on public.lietome_rooms
for delete
using (true);

alter publication supabase_realtime add table public.lietome_rooms;
```

Create `config.local.js` from `config.example.js` and set:

```js
const supabaseConfigLocal = {
  url: "https://your-project-ref.supabase.co",
  anonKey: "your-anon-key",
  tableName: "lietome_rooms"
};
```

These policies are intentionally open for local testing and party games. Before production use, add authenticated access and stricter write validation.
