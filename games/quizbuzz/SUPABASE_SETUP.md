# Quiz Buzz - Supabase Setup Guide

Quiz Buzz now uses Supabase for its real-time multiplayer room state.

## 1. Create a Supabase project

1. Go to https://supabase.com and create a new project.
2. Open the SQL Editor in Supabase.
3. Run the SQL from [supabase-schema.sql](supabase-schema.sql).

## 2. Configure local credentials

1. Copy [config.example.js](config.example.js) to [config.local.js](config.local.js).
2. Add your Supabase URL and anon key:

```js
const supabaseConfigLocal = {
  url: "https://your-project.supabase.co",
  anonKey: "your-anon-key"
};
```

3. Keep [config.local.js](config.local.js) local and private.

## 3. Deploy or run locally

Open the Quiz Buzz pages locally or deploy them to GitHub Pages / your static host.

The app will use Supabase to:
- create rooms
- track players joining
- update question phases
- submit answers
- show leaderboard results

## 4. GitHub Actions

If you deploy from GitHub Actions, add these repository secrets:
- SUPABASE_URL
- SUPABASE_ANON_KEY

The workflow will generate [config.local.js](config.local.js) for the deployment build.
