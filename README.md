# Planner

A phone-first planner in the style of a paper yearbook: Month, Week (早 / 午 / 晚), Today, habits, Morandi colour themes and handwriting fonts. It runs as an installable web app (add it to your Home Screen from Safari), works offline, and syncs across phone, iPad and laptop through Supabase.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and anon key (optional)
npm run dev
```

Without `.env.local` the app runs on that one device, with no accounts.

## Supabase setup (once)

1. In the SQL Editor, run `supabase/schema.sql`. It creates the `records` table, row-level security and live updates.
2. Under Authentication → URL Configuration, set the Site URL to the hosted app's address and add it to Redirect URLs, so confirmation and password-reset emails open the app.

## Hosting

Hosted on Vercel at https://planner-2026-livid.vercel.app. Every push to `main` deploys automatically. `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in the Vercel project's Environment Variables.

## How sync works

- Every change is saved on the device first (IndexedDB via Dexie), in one database per account.
- Changes are mirrored to a single Supabase table, `records`, keyed by user, table and id.
- The newest edit wins, based on `updatedAt`. A database trigger enforces this too, so an older device can never overwrite newer edits.
- Deletions are soft (`deleted: true`), so they reach every device.
- Another device's changes arrive through Supabase Realtime, and also on app focus and once a minute.

## Code map

- `src/data/db.ts`: local database schema
- `src/data/seed.ts`: sample content for new accounts (all made up)
- `src/data/backup.ts`: export and import of backup files
- `src/lib/sync.ts`: the sync engine
- `src/lib/semester.ts`: teaching-week labels
- `src/lib/recurrence.ts`: weekly and yearly repeats
- `src/lib/theme.ts`: palettes, handwriting fonts, pen colours
- `src/screens/`: the pages, including sign-in (`Auth.tsx`)
