'use client'

import { useState } from 'react'

type RsvpFormProps = {
  eventId: string
}

type FieldErrors = {
  guestName?: string
  contact?: string
  partySize?: string
}

type RsvpApiResponse = {
  success?: boolean
  code?: string
  message?: string
  spotsRemainingText?: string
}

const inputClass =
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-100'

const labelClass = 'mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300'

const PARTY_SIZE_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1)

export default function RsvpForm({ eventId }: RsvpFormProps) {
  const [guestName, setGuestName] = useState('')
  const [contact, setContact] = useState('')
  const [partySize, setPartySize] = useState('1')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [spotsRemainingText, setSpotsRemainingText] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmedPartySize, setConfirmedPartySize] = useState(1)

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSpotsRemainingText(null)

    const trimmedName = guestName.trim()
    const trimmedContact = contact.trim()
    const size = Number(partySize)

    const errors: FieldErrors = {}
    if (!trimmedName) {
      errors.guestName = 'Guest name is required.'
    }
    if (!trimmedContact) {
      errors.contact = 'Contact details are required.'
    }
    if (!Number.isInteger(size) || size < 1 || size > 10) {
      errors.partySize = 'Please choose between 1 and 10 guests.'
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          guestName: trimmedName,
          contact: trimmedContact,
          partySize: size,
        }),
      })

      let data: RsvpApiResponse = {}
      try {
        data = (await response.json()) as RsvpApiResponse
      } catch {
        data = {}
      }

      if (response.ok && data.success) {
        setConfirmedPartySize(size)
        setConfirmed(true)
        return
      }

      setError(data.message || 'Your RSVP was not saved. Try again.')
      if (data.spotsRemainingText) {
        setSpotsRemainingText(data.spotsRemainingText)
      }
    } catch {
      setError('Your RSVP was not saved. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (confirmed) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm sm:p-8 dark:border-emerald-900/50 dark:bg-emerald-950/40"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500">
          <CheckIcon />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight text-emerald-900 dark:text-emerald-200">
          You&apos;re on the list!
        </h2>
        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
          Your RSVP for {confirmedPartySize === 1 ? '1 guest' : `${confirmedPartySize} guests`} is
          confirmed. The host can see your name and contact details.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        RSVP to this event
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        No account needed. Just add your details below.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <p className="font-semibold">{error}</p>
          {spotsRemainingText && <p className="mt-1">{spotsRemainingText}</p>}
        </div>
      )}

      <div className="mt-5 space-y-5">
        <div>
          <label htmlFor="guest-name" className={labelClass}>
            Your name <span className="text-red-600 dark:text-red-400">*</span>
          </label>
          <input
            id="guest-name"
            name="guestName"
            type="text"
            value={guestName}
            onChange={(e) => {
              setGuestName(e.target.value)
              clearFieldError('guestName')
            }}
            disabled={isSubmitting}
            autoComplete="name"
            required
            aria-invalid={Boolean(fieldErrors.guestName)}
            aria-describedby={fieldErrors.guestName ? 'guest-name-error' : undefined}
            placeholder="e.g. Tolu Adeyemi"
            className={`${inputClass} ${
              fieldErrors.guestName
                ? 'border-red-400 dark:border-red-700'
                : 'border-zinc-300 dark:border-zinc-700'
            }`}
          />
          {fieldErrors.guestName && (
            <p id="guest-name-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {fieldErrors.guestName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="contact" className={labelClass}>
            Contact details <span className="text-red-600 dark:text-red-400">*</span>
          </label>
          <input
            id="contact"
            name="contact"
            type="text"
            value={contact}
            onChange={(e) => {
              setContact(e.target.value)
              clearFieldError('contact')
            }}
            disabled={isSubmitting}
            autoComplete="off"
            required
            aria-invalid={Boolean(fieldErrors.contact)}
            aria-describedby={fieldErrors.contact ? 'contact-error' : 'contact-hint'}
            placeholder="Phone number or email"
            className={`${inputClass} ${
              fieldErrors.contact
                ? 'border-red-400 dark:border-red-700'
                : 'border-zinc-300 dark:border-zinc-700'
            }`}
          />
          {fieldErrors.contact ? (
            <p id="contact-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {fieldErrors.contact}
            </p>
          ) : (
            <p id="contact-hint" className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              The host uses this to reach you by hand.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="party-size" className={labelClass}>
            Number of guests <span className="text-red-600 dark:text-red-400">*</span>
          </label>
          <select
            id="party-size"
            name="partySize"
            value={partySize}
            onChange={(e) => {
              setPartySize(e.target.value)
              clearFieldError('partySize')
            }}
            disabled={isSubmitting}
            required
            aria-invalid={Boolean(fieldErrors.partySize)}
            aria-describedby={fieldErrors.partySize ? 'party-size-error' : 'party-size-hint'}
            className={`${inputClass} ${
              fieldErrors.partySize
                ? 'border-red-400 dark:border-red-700'
                : 'border-zinc-300 dark:border-zinc-700'
            }`}
          >
            {PARTY_SIZE_OPTIONS.map((size) => (
              <option key={size} value={String(size)}>
                {size === 1 ? '1 guest' : `${size} guests`}
              </option>
            ))}
          </select>
          {fieldErrors.partySize ? (
            <p id="party-size-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {fieldErrors.partySize}
            </p>
          ) : (
            <p id="party-size-hint" className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Including you. Up to 10 guests per RSVP.
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
        Your name and contact details will be shared with this event’s host.
      </p>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-zinc-900 px-5 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Spinner />
            Sending RSVP...
          </span>
        ) : (
          'Send RSVP'
        )}
      </button>
    </form>
  )
}

function CheckIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 010 1.415l-7.5 7.5a1 1 0 01-1.415 0l-3.5-3.5a1 1 0 111.415-1.415l2.793 2.793 6.793-6.793a1 1 0 011.415 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
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
  )
}
