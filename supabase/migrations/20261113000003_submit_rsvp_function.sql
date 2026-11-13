-- Migration: Add capacity-safe public RSVP submission function
-- Description: Creates a PostgreSQL function submit_rsvp that locks the event row,
-- verifies remaining capacity, prevents duplicate contact submissions, and creates
-- the RSVP safely without exposing guest-list data or allowing check-in manipulation.

create or replace function public.submit_rsvp(
  p_event_id uuid,
  p_guest_name text,
  p_contact text,
  p_party_size integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_id uuid;
  v_capacity integer;
  v_event_date timestamptz;
  v_booked integer;
  v_spots_left integer;
  v_rsvp_id uuid;
  v_trimmed_name text;
  v_trimmed_contact text;
begin
  -- 1. Validate required inputs
  if p_event_id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_INPUT',
      'message', 'Event identifier is required.'
    );
  end if;

  v_trimmed_name := trim(coalesce(p_guest_name, ''));
  if char_length(v_trimmed_name) = 0 then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_INPUT',
      'message', 'Guest name is required.'
    );
  end if;

  v_trimmed_contact := trim(coalesce(p_contact, ''));
  if char_length(v_trimmed_contact) = 0 then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_INPUT',
      'message', 'Contact details are required.'
    );
  end if;

  if p_party_size is null or p_party_size < 1 or p_party_size > 10 then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_INPUT',
      'message', 'Party size must be between 1 and 10.'
    );
  end if;

  -- 2. Lock the event row for update to ensure concurrency-safe capacity calculations
  select id, capacity, event_date
  into v_event_id, v_capacity, v_event_date
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'code', 'LINK_NOT_FOUND',
      'message', 'This link was not found.'
    );
  end if;

  -- 3. Check if event has ended
  if now() >= v_event_date then
    return jsonb_build_object(
      'success', false,
      'code', 'EVENT_ENDED',
      'message', 'This event has ended.'
    );
  end if;

  -- 4. Check for duplicate contact for this event
  if exists (
    select 1 from public.rsvps
    where event_id = p_event_id
      and lower(trim(contact)) = lower(v_trimmed_contact)
  ) then
    return jsonb_build_object(
      'success', false,
      'code', 'DUPLICATE_CONTACT',
      'message', 'You have already RSVPed with this contact. Ask the host to change it.'
    );
  end if;

  -- 5. Calculate remaining spots from existing RSVPs
  select coalesce(sum(party_size), 0)
  into v_booked
  from public.rsvps
  where event_id = p_event_id;

  v_spots_left := v_capacity - v_booked;

  -- 6. Enforce capacity limits
  if v_spots_left <= 0 then
    return jsonb_build_object(
      'success', false,
      'code', 'EVENT_FULL',
      'message', 'The event is full.',
      'spots_left', 0
    );
  end if;

  if p_party_size > v_spots_left then
    return jsonb_build_object(
      'success', false,
      'code', 'PARTY_TOO_LARGE',
      'message', 'Your party is larger than the spots left.',
      'spots_left', v_spots_left,
      'spots_remaining_text', case
        when v_spots_left = 1 then 'There is 1 spot remaining.'
        else 'There are ' || v_spots_left || ' spots remaining.'
      end
    );
  end if;

  -- 7. Insert the RSVP record with checked_in fixed to false
  insert into public.rsvps (
    event_id,
    guest_name,
    contact,
    party_size,
    checked_in
  ) values (
    p_event_id,
    v_trimmed_name,
    v_trimmed_contact,
    p_party_size,
    false
  )
  returning id into v_rsvp_id;

  return jsonb_build_object(
    'success', true,
    'rsvp_id', v_rsvp_id,
    'spots_left', v_spots_left - p_party_size
  );

exception
  when unique_violation then
    return jsonb_build_object(
      'success', false,
      'code', 'DUPLICATE_CONTACT',
      'message', 'You have already RSVPed with this contact. Ask the host to change it.'
    );
  when others then
    return jsonb_build_object(
      'success', false,
      'code', 'NOT_SAVED',
      'message', 'Your RSVP was not saved. Try again.'
    );
end;
$$;

-- Grant execution privileges to anon and authenticated roles
revoke all on function public.submit_rsvp(uuid, text, text, integer) from public;
grant execute on function public.submit_rsvp(uuid, text, text, integer) to anon, authenticated;

