-- Migration: Create events table
-- Description: Creates the events table with required constraints, owner reference to auth.users, and index.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  event_date timestamptz not null,
  venue text not null check (char_length(trim(venue)) > 0),
  description text,
  capacity integer not null check (capacity > 0),
  created_at timestamptz not null default now()
);

-- Index on owner_id for efficient host event queries
create index if not exists idx_events_owner_id on public.events(owner_id);

