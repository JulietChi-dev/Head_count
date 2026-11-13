# HeadCount

HeadCount helps event hosts collect RSVPs from a single link so that they know who is coming and who has arrived.

## Features

**For hosts**

- Sign up and log in with an email and password.
- Create and edit events with a title, date and time, venue, capacity, and description.
- See every event you host on **My events**, with links to each guest list.
- Open a guest list to see guest names, party sizes, and totals (RSVPs, total guests, guests checked in, spots left).
- Check guests in with one tap per RSVP — a single check-in covers the whole party.
- Share a public invite link for each event.

**For guests**

- Open the invite link and read the event details without signing in.
- RSVP with a name, contact, and number of guests (1–10).
- Get a clear confirmation, or a specific message when the event is full, the party is too large, the contact has already RSVPed, the event has ended, or the link is invalid.

## Screens

| Route | Audience | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page |
| `/signup` | Hosts | Create a host account |
| `/login` | Hosts | Log in (and switch to sign up) |
| `/events` | Hosts (signed in) | My events list with links to each guest list |
| `/events/new` | Hosts (signed in) | Create a new event |
| `/events/[id]/edit` | Hosts (signed in) | Edit an event you own |
| `/events/[id]/guests` | Hosts (signed in) | Guest list with per-RSVP check-in |
| `/e/[id]` | Public | Event invitation and RSVP form (no sign-in) |

The public invite link is `/e/{eventId}`, where `{eventId}` is the event's UUID.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Local Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```
*(On Windows PowerShell: `Copy-Item .env.example .env.local`)*

Configure the variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase publishable/anon key (public)

> **Security Note:** Never commit `.env.local` or expose secret keys (such as service role keys) in browser-exposed `NEXT_PUBLIC_*` variables.

### 3. Database Migrations (Supabase Dashboard)

To apply database migrations to a fresh Supabase project:

1. Open your project dashboard in Supabase and go to the **SQL Editor**.
2. Copy and execute the migration files sequentially:
   - `supabase/migrations/20261113000001_create_events_table.sql`
   - `supabase/migrations/20261113000002_enable_rls_and_policies.sql`
   - `supabase/migrations/20261113000003_submit_rsvp_function.sql`
3. Click **Run** for each script to establish tables, constraints, indexes, and Row Level Security policies.

### 4. Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

### 6. Lint

Check code quality:

```bash
npm run lint
```

## Project Structure

```
app/
  (host)/                 Signed-in host area (redirects to /login when unauthenticated)
    events/               My events list, create, and edit
      [id]/guests/        Guest list and check-in
  e/[id]/                 Public event invitation and RSVP form
  login/, signup/         Host authentication
  actions/                Server actions (auth, events, rsvps)
  api/rsvp/               Public RSVP submission endpoint
lib/
  data/                   Server-side data access (events, rsvps)
  supabase/               Supabase server client and session refresh
supabase/migrations/      Database schema, RLS policies, and RSVP function
```

- `PRD.md` — product requirements.
- `AGENTS.md` — stack, provider, and contribution conventions.
- `.agent/rules/` — product, data, capacity, security, tech, and test rules.

