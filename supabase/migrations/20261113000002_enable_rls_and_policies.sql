-- Migration: Enable RLS and define access policies for events and rsvps
-- Description: Sets up rsvps table, enables RLS on events and rsvps, and adds narrowly scoped access policies.

-- 1. Create rsvps table if it does not exist yet
create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_name text not null check (char_length(trim(guest_name)) > 0),
  contact text not null check (char_length(trim(contact)) > 0),
  party_size integer not null check (party_size >= 1 and party_size <= 10),
  checked_in boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes for rsvps
create index if not exists idx_rsvps_event_id on public.rsvps(event_id);
create unique index if not exists idx_rsvps_event_contact_unique on public.rsvps(event_id, lower(trim(contact)));

-- 2. Enable Row Level Security (RLS)
alter table public.events enable row level security;
alter table public.rsvps enable row level security;

-- 3. Policies for events table

-- Allow public (anon) reading of event details needed by an invite page
create policy "Allow public to read event details"
  on public.events
  for select
  to anon
  using (true);

-- Allow authenticated hosts to read only events they own
create policy "Allow authenticated hosts to read own events"
  on public.events
  for select
  to authenticated
  using (auth.uid() = owner_id);

-- Allow authenticated hosts to create only events they own
create policy "Allow authenticated hosts to insert own events"
  on public.events
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

-- Allow authenticated hosts to update only events they own
create policy "Allow authenticated hosts to update own events"
  on public.events
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Allow authenticated hosts to delete only events they own
create policy "Allow authenticated hosts to delete own events"
  on public.events
  for delete
  to authenticated
  using (auth.uid() = owner_id);

-- 4. Policies for rsvps table

-- Allow hosts to read RSVPs only for events they own
create policy "Allow hosts to read RSVPs for own events"
  on public.rsvps
  for select
  to authenticated
  using (
    exists (
      select 1 from public.events
      where events.id = rsvps.event_id
        and events.owner_id = auth.uid()
    )
  );

-- Allow hosts to update RSVPs only for events they own
create policy "Allow hosts to update RSVPs for own events"
  on public.rsvps
  for update
  to authenticated
  using (
    exists (
      select 1 from public.events
      where events.id = rsvps.event_id
        and events.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events
      where events.id = rsvps.event_id
        and events.owner_id = auth.uid()
    )
  );

-- Allow hosts to delete RSVPs only for events they own
create policy "Allow hosts to delete RSVPs for own events"
  on public.rsvps
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.events
      where events.id = rsvps.event_id
        and events.owner_id = auth.uid()
    )
  );

-- Note: No direct INSERT policy is created for public/anon on rsvps table.
-- Public direct inserts are disallowed; RSVP submissions will be processed via server-side validation / function.

