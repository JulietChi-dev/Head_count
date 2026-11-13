import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function isValidUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {}

  try {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      body = (await request.json()) as Record<string, unknown>
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await request.formData()
      const entries: Record<string, unknown> = {}
      formData.forEach((value, key) => {
        entries[key] = value
      })
      body = entries
    } else {
      // Default attempt to parse JSON
      body = (await request.json()) as Record<string, unknown>
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: 'INVALID_INPUT',
        message: 'Invalid request body format.',
      },
      { status: 400 }
    )
  }

  // 1. Extract and normalize fields
  const rawEventId = String(body.eventId || body.event_id || '').trim()
  const rawName = String(body.guestName || body.guest_name || body.name || '').trim()
  const rawContact = String(body.contact || '').trim()
  const rawPartySize = body.partySize !== undefined ? body.partySize : body.party_size

  // 2. Validate Event Identifier
  if (!rawEventId || !isValidUuid(rawEventId)) {
    return NextResponse.json(
      {
        success: false,
        code: 'LINK_NOT_FOUND',
        message: 'This link was not found.',
      },
      { status: 404 }
    )
  }

  // 3. Validate Guest Name
  if (!rawName) {
    return NextResponse.json(
      {
        success: false,
        code: 'INVALID_INPUT',
        message: 'Guest name is required.',
      },
      { status: 400 }
    )
  }

  // 4. Validate Contact Details (phone or email, without punctuation normalization)
  if (!rawContact) {
    return NextResponse.json(
      {
        success: false,
        code: 'INVALID_INPUT',
        message: 'Contact details are required.',
      },
      { status: 400 }
    )
  }

  // 5. Validate Party Size (whole number from 1 to 10)
  const partySize = Number(rawPartySize)
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 10) {
    return NextResponse.json(
      {
        success: false,
        code: 'INVALID_INPUT',
        message: 'Party size must be a whole number between 1 and 10.',
      },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()

    // 6. Invoke capacity-safe database function
    const { data, error } = await supabase.rpc('submit_rsvp', {
      p_event_id: rawEventId,
      p_guest_name: rawName,
      p_contact: rawContact,
      p_party_size: partySize,
    })

    if (error) {
      return NextResponse.json(
        {
          success: false,
          code: 'NOT_SAVED',
          message: 'Your RSVP was not saved. Try again.',
        },
        { status: 500 }
      )
    }

    const result = data as {
      success: boolean
      code?: string
      message?: string
      rsvp_id?: string
      spots_left?: number
      spots_remaining_text?: string
    }

    // Handle failure codes from database function
    if (!result.success) {
      if (result.code === 'LINK_NOT_FOUND') {
        return NextResponse.json(
          {
            success: false,
            code: 'LINK_NOT_FOUND',
            message: result.message || 'This link was not found.',
          },
          { status: 404 }
        )
      }

      if (result.code === 'EVENT_FULL') {
        return NextResponse.json(
          {
            success: false,
            code: 'EVENT_FULL',
            message: result.message || 'The event is full.',
            spotsLeft: 0,
          },
          { status: 409 }
        )
      }

      if (result.code === 'PARTY_TOO_LARGE') {
        return NextResponse.json(
          {
            success: false,
            code: 'PARTY_TOO_LARGE',
            message: result.message || 'Your party is larger than the spots left.',
            spotsLeft: result.spots_left,
            spotsRemainingText: result.spots_remaining_text,
          },
          { status: 409 }
        )
      }

      if (result.code === 'DUPLICATE_CONTACT') {
        return NextResponse.json(
          {
            success: false,
            code: 'DUPLICATE_CONTACT',
            message:
              result.message ||
              'You have already RSVPed with this contact. Ask the host to change it.',
          },
          { status: 409 }
        )
      }

      if (result.code === 'EVENT_ENDED') {
        return NextResponse.json(
          {
            success: false,
            code: 'EVENT_ENDED',
            message: result.message || 'This event has ended.',
          },
          { status: 410 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          code: result.code || 'NOT_SAVED',
          message: result.message || 'Your RSVP was not saved. Try again.',
        },
        { status: 400 }
      )
    }

    // 7. Success response - explicitly excludes any private guest or contact records
    return NextResponse.json(
      {
        success: true,
        message: 'RSVP confirmed successfully.',
        rsvpId: result.rsvp_id,
        spotsLeft: result.spots_left,
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: 'NOT_SAVED',
        message: 'Your RSVP was not saved. Try again.',
      },
      { status: 500 }
    )
  }
}

