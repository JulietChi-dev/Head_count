import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getHostUser } from '@/lib/auth'

export type PublicEventDetails = {
  id: string
  title: string
  date: string
  venue: string
  description: string | null
  capacity: number
}

function isValidUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
}

function getPublicSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createSupabaseClient(supabaseUrl, supabasePublishableKey)
}

/**
 * Server-side data function to retrieve public event details by identifier.
 * Returns ONLY title, date, venue, description, and capacity.
 * Explicitly does not fetch or return RSVP rows, contact details, or owner account data.
 * Returns null (not-found result) for an invalid or non-existent event identifier.
 */
export async function getPublicEventDetails(
  identifier: string
): Promise<PublicEventDetails | null> {
  const trimmed = identifier ? identifier.trim() : ''

  // Validate format; return null for invalid identifier
  if (!trimmed || !isValidUuid(trimmed)) {
    return null
  }

  try {
    const supabase = getPublicSupabaseClient()

    // Request only public fields; explicitly omit owner_id and exclude RSVP relations
    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_date, venue, description, capacity')
      .eq('id', trimmed)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      title: data.title,
      date: data.event_date,
      venue: data.venue,
      description: data.description ?? null,
      capacity: data.capacity,
    }
  } catch {
    return null
  }
}

// Alias for naming convenience
export const getPublicEvent = getPublicEventDetails

export type HostEventSummary = {
  id: string
  title: string
  date: string
  venue: string
  capacity: number
  createdAt: string
}

export type HostEventsResult = {
  events: HostEventSummary[]
  error?: string
}

/**
 * Server-side data function to retrieve the events owned by the signed-in host.
 * Resolves the host from the session and filters by owner_id, so a host can only
 * ever receive their own events (also enforced by Row Level Security).
 * Returns an empty list with a message when the session cannot be resolved or
 * the query fails, so the caller can always render a clear state.
 */
export async function getHostEvents(): Promise<HostEventsResult> {
  const user = await getHostUser()

  if (!user) {
    return { events: [], error: 'You must be signed in to view your events.' }
  }

  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_date, venue, capacity, created_at')
      .eq('owner_id', user.id)
      .order('event_date', { ascending: true })

    if (error || !data) {
      return { events: [], error: 'Failed to load your events. Please try again.' }
    }

    return {
      events: data.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.event_date,
        venue: event.venue,
        capacity: event.capacity,
        createdAt: event.created_at,
      })),
    }
  } catch {
    return { events: [], error: 'An unexpected error occurred while loading your events.' }
  }
}

export type HostEventDetails = {
  id: string
  title: string
  date: string
  venue: string
  description: string | null
  capacity: number
}

/**
 * Server-side data function to retrieve a single event owned by the signed-in host.
 * Resolves the host from the session and filters by owner_id, so a host can only
 * ever receive their own events (also enforced by Row Level Security).
 * Returns null for an invalid identifier, a missing event, or an event owned by
 * someone else, so the caller can render a not-found state.
 */
export async function getHostEventById(id: string): Promise<HostEventDetails | null> {
  const trimmed = id ? id.trim() : ''

  // Validate format; return null for an invalid identifier
  if (!trimmed || !isValidUuid(trimmed)) {
    return null
  }

  const user = await getHostUser()

  if (!user) {
    return null
  }

  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_date, venue, description, capacity')
      .eq('id', trimmed)
      .eq('owner_id', user.id) // Enforce ownership in query
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      title: data.title,
      date: data.event_date,
      venue: data.venue,
      description: data.description ?? null,
      capacity: data.capacity,
    }
  } catch {
    return null
  }
}

