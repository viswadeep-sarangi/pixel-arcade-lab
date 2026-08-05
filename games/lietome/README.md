# Lie To Me

A multiplayer bluffing game for Pixel Arcade Lab.

Rooms and scores are stored in Supabase in table `lietome_rooms`, with game state in the `state` JSONB column.

To run it with Supabase:

1. Copy `config.example.js` to `config.local.js`.
2. Add your Supabase `url` and `anonKey`.
3. Create the game table and enable Realtime using `SUPABASE_SETUP.md`.
4. Open `index.html`, then choose Host or Player.

Schema expected by the game:

```text
public.lietome_rooms
	room_id text primary key
	state jsonb not null
	created_at timestamptz not null default now()
	updated_at timestamptz not null default now()
```

The host creates a room, shares the room ID, starts the game, reveals submitted answers, shows votes, reveals the real answer, and advances to the next question.
