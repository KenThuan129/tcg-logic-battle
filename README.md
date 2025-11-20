## Overview

IT Colloseum is a Next.js 16 project that now supports:

- Supabase email/password authentication
- PvE skirmishes against the local AI
- A PvP lobby backed by Supabase realtime where players can host/join rooms
- Centralized storage for player profiles, matches, and card metadata

## Prerequisites

- Node 18+
- A Supabase project with the following environment variables defined in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

The service-role key is only used by Next.js API routes on the server; never expose it to the browser.

## Database setup

1. Create a new Supabase project.
2. Run the SQL in `supabase/schema.sql` inside the Supabase SQL editor.
3. Enable Realtime on the `matches` table.
4. Optionally seed the `cards` table using your card factory data.

## Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to access the Auth-gated experience. After signing in you can pick PvE or enter the PvP lobby to host/join rooms.

## Deploying

- Set the Supabase env vars wherever you deploy (Vercel, etc.)
- Ensure Realtime is enabled for `matches`
- Provision the service-role key as an encrypted server-side secret

## Testing the flows

- **PvE**: choose PvE from the mode selector and the classic AI battle board appears.
- **PvP**: head to the lobby, create a room, then open a second browser window (or user) to join and play in sync.
- **Authentication**: sign in/out using Supabase username/password. Profiles are upserted automatically so names appear in the lobby and match HUDs.
