'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createEvent, updateEvent } from '@/app/actions/events'

type EventFormMode = 'create' | 'edit'

type EventFormInitialValues = {
  title?: string
  /** Absolute ISO date-time string as stored on the server. */
  date?: string
  venue?: string
  capacity?: number
  description?: string | null
}

type EventFormProps = {
  mode: EventFormMode
  eventId?: string
  initialValues?: EventFormInitialValues
}

type FieldErrors = {
  title?: string
  eventDate?: string
  venue?: string
  capacity?: string
}

const inputClass =
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-100'

const labelClass = 'mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300'

/**
 * Converts an absolute ISO date-time string into the `YYYY-MM-DDTHH:mm` value
 * expected by a `datetime-local` input, using the viewer's local time zone.
 */
function toLocalDateTimeValue(iso: string): string {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

export default function EventForm({ mode, eventId, initialValues }: EventFormProps) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  const [title, setTitle] = useState(initialValues?.title ?? '')
  // The server and the browser can resolve the same instant to different local
  // times, so this value is intentionally rendered per environment and the
  // hydration warning for it is suppressed below.
  const [eventDate, setEventDate] = useState(() =>
    initialValues?.date ? toLocalDateTimeValue(initialValues.date) : ''
  )
  const [venue, setVenue] = useState(initialValues?.venue ?? '')
  const [capacity, setCapacity] = useState(
    initialValues?.capacity != null ? String(initialValues.capacity) : ''
  )
  const [description, setDescription] = useState(initialValues?.description ?? '')

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Show the success message briefly, then return the host to their event list.
  useEffect(() => {
    if (!successMessage) {
      return
    }

    const timer = setTimeout(() => {
      router.push('/events')
      router.refresh()
    }, 1000)

    return () => clearTimeout(timer)
  }, [successMessage, router])

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((previous) => {
      if (!previous[field]) {
        return previous
      }

      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {}

    if (!title.trim()) {
      errors.title = 'Title is required.'
    }

    if (!eventDate.trim()) {
      errors.eventDate = 'Date and time is required.'
    } else if (Number.isNaN(new Date(eventDate).getTime())) {
      errors.eventDate = 'Enter a valid date and time.'
    }

    if (!venue.trim()) {
      errors.venue = 'Venue is required.'
    }

    const capacityNumber = Number(capacity)
    if (!capacity.trim()) {
      errors.capacity = 'Capacity is required.'
    } else if (!Number.isInteger(capacityNumber) || capacityNumber < 1) {
      errors.capacity = 'Capacity must be a whole number of at least 1.'
    }

    return errors
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    const errors = validate()
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    const formData = new FormData()
    formData.set('title', title.trim())
    formData.set('event_date', new Date(eventDate).toISOString())
    formData.set('venue', venue.trim())
    formData.set('capacity', String(Number(capacity)))
    formData.set('description', description.trim())

    startTransition(async () => {
      try {
        const result =
          isEdit && eventId ? await updateEvent(eventId, formData) : await createEvent(formData)

        if (result.error) {
          setError(result.error)
          return
        }

        if (result.success) {
          setSuccessMessage(
            result.message ??
              (isEdit ? 'Event updated successfully.' : 'Event created successfully.')
          )
        }
      } catch {
        setError('An unexpected error occurred. Please try again.')
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <span className="mr-1.5 font-semibold">Error:</span>
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <span className="mr-1.5 font-semibold">Success:</span>
          <span>{successMessage}</span>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="title" className={labelClass}>
            Title <span className="text-red-600 dark:text-red-400">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              clearFieldError('title')
            }}
            disabled={isPending}
            required
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? 'title-error' : undefined}
            placeholder="Rooftop launch party"
            className={`${inputClass} ${
              fieldErrors.title
                ? 'border-red-400 dark:border-red-700'
                : 'border-zinc-300 dark:border-zinc-700'
            }`}
          />
          {fieldErrors.title && (
            <p id="title-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {fieldErrors.title}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="event_date" className={labelClass}>
            Date and time <span className="text-red-600 dark:text-red-400">*</span>
          </label>
          <input
            id="event_date"
            name="event_date"
            type="datetime-local"
            value={eventDate}
            onChange={(e) => {
              setEventDate(e.target.value)
              clearFieldError('eventDate')
            }}
            disabled={isPending}
            required
            suppressHydrationWarning
            aria-invalid={Boolean(fieldErrors.eventDate)}
            aria-describedby={fieldErrors.eventDate ? 'event-date-error' : undefined}
            className={`${inputClass} ${
              fieldErrors.eventDate
                ? 'border-red-400 dark:border-red-700'
                : 'border-zinc-300 dark:border-zinc-700'
            }`}
          />
          {fieldErrors.eventDate && (
            <p id="event-date-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {fieldErrors.eventDate}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="venue" className={labelClass}>
            Venue <span className="text-red-600 dark:text-red-400">*</span>
          </label>
          <input
            id="venue"
            name="venue"
            type="text"
            value={venue}
            onChange={(e) => {
              setVenue(e.target.value)
              clearFieldError('venue')
            }}
            disabled={isPending}
            required
            aria-invalid={Boolean(fieldErrors.venue)}
            aria-describedby={fieldErrors.venue ? 'venue-error' : undefined}
            placeholder="The Skyline Terrace, 12 Main Street"
            className={`${inputClass} ${
              fieldErrors.venue
                ? 'border-red-400 dark:border-red-700'
                : 'border-zinc-300 dark:border-zinc-700'
            }`}
          />
          {fieldErrors.venue && (
            <p id="venue-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {fieldErrors.venue}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="capacity" className={labelClass}>
            Capacity <span className="text-red-600 dark:text-red-400">*</span>
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={capacity}
            onChange={(e) => {
              setCapacity(e.target.value)
              clearFieldError('capacity')
            }}
            disabled={isPending}
            required
            aria-invalid={Boolean(fieldErrors.capacity)}
            aria-describedby={fieldErrors.capacity ? 'capacity-error' : 'capacity-hint'}
            placeholder="50"
            className={`${inputClass} ${
              fieldErrors.capacity
                ? 'border-red-400 dark:border-red-700'
                : 'border-zinc-300 dark:border-zinc-700'
            }`}
          />
          {fieldErrors.capacity ? (
            <p id="capacity-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {fieldErrors.capacity}
            </p>
          ) : (
            <p id="capacity-hint" className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Total guests you can host. Must be at least 1.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
            rows={4}
            placeholder="Add anything guests should know before they RSVP."
            className={`${inputClass} border-zinc-300 dark:border-zinc-700`}
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Optional.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving...
            </span>
          ) : isEdit ? (
            'Save changes'
          ) : (
            'Create event'
          )}
        </button>

        <Link
          href="/events"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
