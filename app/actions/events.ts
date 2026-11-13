'use server'

import { createClient } from '@/lib/supabase/server'
import { requireHostUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type EventActionResult = {
  success?: boolean
  error?: string
  message?: string
  event?: {
    id: string
    owner_id: string
    title: string
    event_date: string
    venue: string
    description?: string | null
    capacity: number
    created_at: string
  }
}

export type EventInput = {
  id?: string
  title?: string
  date?: string
  event_date?: string
  venue?: string
  description?: string | null
  capacity?: number | string
}

function parseEventData(
  arg1?: FormData | EventInput | unknown,
  arg2?: FormData | EventInput | unknown
): {
  id?: string
  title: string
  date: string
  venue: string
  description?: string | null
  capacity: number
  validationError?: string
} {
  let id: string | undefined
  let title = ''
  let date = ''
  let venue = ''
  let description: string | null = null
  let rawCapacity: unknown

  // Check if arg2 is FormData (e.g. useActionState or action.bind(null, id))
  if (arg2 instanceof FormData) {
    if (typeof arg1 === 'string') {
      id = arg1
    }
    title = (arg2.get('title') as string) || ''
    date = (arg2.get('event_date') as string) || (arg2.get('date') as string) || ''
    venue = (arg2.get('venue') as string) || ''
    description = (arg2.get('description') as string) || null
    rawCapacity = arg2.get('capacity')
    if (!id && arg2.get('id')) {
      id = arg2.get('id') as string
    }
  } else if (arg1 instanceof FormData) {
    id = (arg1.get('id') as string) || undefined
    title = (arg1.get('title') as string) || ''
    date = (arg1.get('event_date') as string) || (arg1.get('date') as string) || ''
    venue = (arg1.get('venue') as string) || ''
    description = (arg1.get('description') as string) || null
    rawCapacity = arg1.get('capacity')
  } else if (arg1 && typeof arg1 === 'object') {
    const input = arg1 as EventInput
    id = input.id
    title = input.title || ''
    date = input.event_date || input.date || ''
    venue = input.venue || ''
    description = input.description ?? null
    rawCapacity = input.capacity
  }

  // Validate title
  title = title.trim()
  if (!title) {
    return { title, date, venue, description, capacity: 0, validationError: 'Title is required.' }
  }

  // Validate date
  date = date.trim()
  if (!date || isNaN(Date.parse(date))) {
    return {
      title,
      date,
      venue,
      description,
      capacity: 0,
      validationError: 'A valid event date and time is required.',
    }
  }

  // Validate venue
  venue = venue.trim()
  if (!venue) {
    return { title, date, venue, description, capacity: 0, validationError: 'Venue is required.' }
  }

  // Validate positive integer capacity
  const capacityNum = Number(rawCapacity)
  if (!Number.isInteger(capacityNum) || capacityNum <= 0) {
    return {
      title,
      date,
      venue,
      description,
      capacity: 0,
      validationError: 'Capacity must be a positive whole number of at least 1.',
    }
  }

  if (description) {
    description = description.trim() || null
  }

  return {
    id,
    title,
    date: new Date(date).toISOString(),
    venue,
    description,
    capacity: capacityNum,
  }
}

/**
 * Server action to create a new event.
 * Validates inputs, binds owner_id to the signed-in host user, and revalidates affected pages.
 */
export async function createEvent(
  arg1?: FormData | EventInput | unknown,
  arg2?: FormData | EventInput | unknown
): Promise<EventActionResult> {
  const user = await requireHostUser()
  const { title, date, venue, description, capacity, validationError } = parseEventData(
    arg1,
    arg2
  )

  if (validationError) {
    return { error: validationError }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('events')
      .insert({
        owner_id: user.id,
        title,
        event_date: date,
        venue,
        description,
        capacity,
      })
      .select()
      .single()

    if (error || !data) {
      return { error: 'Failed to create event. Please try again.' }
    }

    revalidatePath('/events')
    revalidatePath('/')
    return {
      success: true,
      message: 'Event created successfully.',
      event: data,
    }
  } catch {
    return { error: 'An unexpected error occurred while creating the event.' }
  }
}

/**
 * Server action to edit an existing event.
 * Enforces ownership in the query and ensures capacity is not reduced below already booked guests.
 */
export async function updateEvent(
  arg1?: string | FormData | EventInput | unknown,
  arg2?: FormData | EventInput | unknown
): Promise<EventActionResult> {
  const user = await requireHostUser()

  let explicitId: string | undefined
  if (typeof arg1 === 'string') {
    explicitId = arg1
  }

  const { id: parsedId, title, date, venue, description, capacity, validationError } =
    parseEventData(arg1, arg2)

  const eventId = explicitId || parsedId
  if (!eventId) {
    return { error: 'Event ID is required to update an event.' }
  }

  if (validationError) {
    return { error: validationError }
  }

  try {
    const supabase = await createClient()

    // Verify ownership and check current booked guest count before updating capacity
    const { data: currentEvent, error: fetchError } = await supabase
      .from('events')
      .select('id, owner_id')
      .eq('id', eventId)
      .eq('owner_id', user.id) // Enforce ownership in query
      .single()

    if (fetchError || !currentEvent) {
      return { error: 'Event not found or you do not have permission to edit it.' }
    }

    // Check booked guest totals from RSVPs
    const { data: rsvps, error: rsvpError } = await supabase
      .from('rsvps')
      .select('party_size')
      .eq('event_id', eventId)

    if (!rsvpError && rsvps) {
      const bookedGuests = rsvps.reduce((sum, r) => sum + (r.party_size || 0), 0)
      if (capacity < bookedGuests) {
        return {
          error: `Capacity cannot be reduced below ${bookedGuests}, the number of guests already booked.`,
        }
      }
    }

    // Update event with ownership enforcement in database query
    const { data, error } = await supabase
      .from('events')
      .update({
        title,
        event_date: date,
        venue,
        description,
        capacity,
      })
      .eq('id', eventId)
      .eq('owner_id', user.id) // Enforce ownership in query
      .select()
      .single()

    if (error || !data) {
      return { error: 'Failed to update event. Please try again.' }
    }

    revalidatePath('/events')
    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/events/${eventId}/edit`)
    return {
      success: true,
      message: 'Event updated successfully.',
      event: data,
    }
  } catch {
    return { error: 'An unexpected error occurred while updating the event.' }
  }
}

/**
 * Server action to delete an event.
 * Enforces ownership in the query and revalidates affected paths.
 */
export async function deleteEvent(
  arg1?: string | FormData | { id?: string } | unknown
): Promise<EventActionResult> {
  const user = await requireHostUser()

  let eventId = ''
  if (typeof arg1 === 'string') {
    eventId = arg1
  } else if (arg1 instanceof FormData) {
    eventId = (arg1.get('id') as string) || ''
  } else if (arg1 && typeof arg1 === 'object' && 'id' in arg1) {
    eventId = String((arg1 as { id?: unknown }).id || '')
  }

  eventId = eventId.trim()
  if (!eventId) {
    return { error: 'Event ID is required to delete an event.' }
  }

  try {
    const supabase = await createClient()

    // Enforce ownership directly in delete query
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('owner_id', user.id)

    if (error) {
      return { error: 'Failed to delete event or you do not have permission.' }
    }

    revalidatePath('/events')
    revalidatePath('/')
    return {
      success: true,
      message: 'Event deleted successfully.',
    }
  } catch {
    return { error: 'An unexpected error occurred while deleting the event.' }
  }
}

// Aliases for convenience
export async function editEvent(
  arg1?: string | FormData | EventInput | unknown,
  arg2?: FormData | EventInput | unknown
) {
  return updateEvent(arg1, arg2)
}


