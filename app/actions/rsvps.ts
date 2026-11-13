'use server'

import { createClient } from '@/lib/supabase/server'
import { requireHostUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type GuestRsvp = {
  id: string
  event_id: string
  guest_name: string
  contact: string
  party_size: number
  checked_in: boolean
  created_at: string
}

export type GuestListTotals = {
  totalRsvps: number
  totalGuests: number
  checkedInGuests: number
  spotsLeft: number
}

export type GuestListResult = {
  success?: boolean
  error?: string
  event?: {
    id: string
    title: string
    capacity: number
    event_date: string
    venue: string
  }
  rsvps?: GuestRsvp[]
  totals?: GuestListTotals
}

export type CheckInActionResult = {
  success?: boolean
  error?: string
  rsvp?: GuestRsvp
}

/**
 * Server-side function to retrieve RSVP records for an event owned by the signed-in host.
 * Strictly verifies event ownership on the server and respects RLS policies.
 * Returns only the guest-list fields and totals specified in the PRD.
 */
export async function getEventGuestList(eventId: string): Promise<GuestListResult> {
  const user = await requireHostUser()
  const cleanId = (eventId || '').trim()

  if (!cleanId) {
    return { error: 'Event ID is required.' }
  }

  try {
    const supabase = await createClient()

    // 1. Verify event ownership on the server
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, capacity, event_date, venue, owner_id')
      .eq('id', cleanId)
      .eq('owner_id', user.id)
      .single()

    if (eventError || !event) {
      return { error: 'Event not found or you do not have permission to view its guest list.' }
    }

    // 2. Retrieve RSVPs with RLS protections preserved
    const { data: rsvps, error: rsvpsError } = await supabase
      .from('rsvps')
      .select('id, event_id, guest_name, contact, party_size, checked_in, created_at')
      .eq('event_id', cleanId)
      .order('created_at', { ascending: true })

    if (rsvpsError || !rsvps) {
      return { error: 'Failed to retrieve guest list. Please try again.' }
    }

    // 3. Compute totals as defined in PRD Section 9
    const totalRsvps = rsvps.length
    const totalGuests = rsvps.reduce((sum, r) => sum + (r.party_size || 0), 0)
    const checkedInGuests = rsvps.reduce(
      (sum, r) => sum + (r.checked_in ? r.party_size || 0 : 0),
      0
    )
    const spotsLeft = Math.max(0, event.capacity - totalGuests)

    return {
      success: true,
      event: {
        id: event.id,
        title: event.title,
        capacity: event.capacity,
        event_date: event.event_date,
        venue: event.venue,
      },
      rsvps: rsvps as GuestRsvp[],
      totals: {
        totalRsvps,
        totalGuests,
        checkedInGuests,
        spotsLeft,
      },
    }
  } catch {
    return { error: 'An unexpected error occurred while fetching the guest list.' }
  }
}

/**
 * Server action to mark one RSVP checked in or not checked in.
 * Verifies event ownership on the server and preserves database RLS.
 */
export async function setRsvpCheckIn(
  rsvpId: string,
  checkedIn: boolean
): Promise<CheckInActionResult> {
  const user = await requireHostUser()
  const cleanRsvpId = (rsvpId || '').trim()

  if (!cleanRsvpId) {
    return { error: 'RSVP ID is required.' }
  }

  try {
    const supabase = await createClient()

    // 1. Fetch the RSVP to obtain its associated event_id
    const { data: rsvp, error: rsvpError } = await supabase
      .from('rsvps')
      .select('id, event_id')
      .eq('id', cleanRsvpId)
      .single()

    if (rsvpError || !rsvp) {
      return { error: 'RSVP record not found.' }
    }

    // 2. Verify on the server that the signed-in host owns the associated event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', rsvp.event_id)
      .eq('owner_id', user.id)
      .single()

    if (eventError || !event) {
      return { error: 'Unauthorized: You do not have permission to check in guests for this event.' }
    }

    // 3. Update the checked_in state
    const { data: updated, error: updateError } = await supabase
      .from('rsvps')
      .update({ checked_in: Boolean(checkedIn) })
      .eq('id', cleanRsvpId)
      .select('id, event_id, guest_name, contact, party_size, checked_in, created_at')
      .single()

    if (updateError || !updated) {
      return { error: 'Failed to update check-in status. Please try again.' }
    }

    revalidatePath(`/events/${rsvp.event_id}`)
    revalidatePath(`/events/${rsvp.event_id}/guests`)
    return {
      success: true,
      rsvp: updated as GuestRsvp,
    }
  } catch {
    return { error: 'An unexpected error occurred while updating check-in status.' }
  }
}

/**
 * Server action to remove an RSVP for an event owned by the host.
 */
export async function removeRsvp(rsvpId: string): Promise<{ success?: boolean; error?: string }> {
  const user = await requireHostUser()
  const cleanRsvpId = (rsvpId || '').trim()

  if (!cleanRsvpId) {
    return { error: 'RSVP ID is required.' }
  }

  try {
    const supabase = await createClient()

    // 1. Fetch the RSVP to identify the event
    const { data: rsvp, error: rsvpError } = await supabase
      .from('rsvps')
      .select('id, event_id')
      .eq('id', cleanRsvpId)
      .single()

    if (rsvpError || !rsvp) {
      return { error: 'RSVP record not found.' }
    }

    // 2. Verify that the host owns the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', rsvp.event_id)
      .eq('owner_id', user.id)
      .single()

    if (eventError || !event) {
      return { error: 'Unauthorized: You cannot remove RSVPs from this event.' }
    }

    // 3. Delete the RSVP record
    const { error: deleteError } = await supabase
      .from('rsvps')
      .delete()
      .eq('id', cleanRsvpId)

    if (deleteError) {
      return { error: 'Failed to remove RSVP. Please try again.' }
    }

    revalidatePath(`/events/${rsvp.event_id}`)
    revalidatePath(`/events/${rsvp.event_id}/guests`)
    return { success: true }
  } catch {
    return { error: 'An unexpected error occurred while removing the RSVP.' }
  }
}

// Aliases for convenience
export async function markCheckIn(rsvpId: string, checkedIn: boolean) {
  return setRsvpCheckIn(rsvpId, checkedIn)
}

export async function toggleRsvpCheckIn(rsvpId: string, checkedIn: boolean) {
  return setRsvpCheckIn(rsvpId, checkedIn)
}

