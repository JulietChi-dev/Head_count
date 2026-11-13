'use client'

import { useState, useTransition } from 'react'
import { setRsvpCheckIn, type GuestRsvp } from '@/app/actions/rsvps'

type GuestListProps = {
  rsvps: GuestRsvp[]
  capacity: number
}

function formatPartySize(size: number): string {
  return size === 1 ? '1 guest' : `${size} guests`
}

/**
 * Interactive guest list for a single event.
 * Totals are derived from local state so they update the moment a host checks
 * someone in, and each check-in is saved through the host-only server action.
 */
export default function GuestList({ rsvps: initialRsvps, capacity }: GuestListProps) {
  const [rsvps, setRsvps] = useState<GuestRsvp[]>(initialRsvps)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const totalRsvps = rsvps.length
  const totalGuests = rsvps.reduce((sum, rsvp) => sum + rsvp.party_size, 0)
  const checkedInGuests = rsvps.reduce(
    (sum, rsvp) => sum + (rsvp.checked_in ? rsvp.party_size : 0),
    0
  )
  const spotsLeft = Math.max(0, capacity - totalGuests)

  function toggleCheckIn(rsvp: GuestRsvp) {
    if (isPending) {
      return
    }

    const nextCheckedIn = !rsvp.checked_in

    setError(null)
    setPendingId(rsvp.id)
    // Update immediately so the control responds to touch, then reconcile with the server.
    setRsvps((previous) =>
      previous.map((item) =>
        item.id === rsvp.id ? { ...item, checked_in: nextCheckedIn } : item
      )
    )

    startTransition(async () => {
      try {
        const result = await setRsvpCheckIn(rsvp.id, nextCheckedIn)

        if (result.error) {
          setRsvps((previous) =>
            previous.map((item) =>
              item.id === rsvp.id ? { ...item, checked_in: rsvp.checked_in } : item
            )
          )
          setError(result.error)
        } else if (result.rsvp) {
          const saved = result.rsvp
          setRsvps((previous) => previous.map((item) => (item.id === rsvp.id ? saved : item)))
        }
      } catch {
        setRsvps((previous) =>
          previous.map((item) =>
            item.id === rsvp.id ? { ...item, checked_in: rsvp.checked_in } : item
          )
        )
        setError('An unexpected error occurred. Please try again.')
      } finally {
        setPendingId(null)
      }
    })
  }

  return (
    <div className="mt-4">
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <span className="mr-1.5 font-semibold">Error:</span>
          <span>{error}</span>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total guests" value={totalGuests} />
        <Stat label="Checked in" value={checkedInGuests} />
        <Stat label="RSVPs" value={totalRsvps} />
        <Stat label="Spots left" value={spotsLeft} />
      </dl>

      {rsvps.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">No RSVPs yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            Guests who RSVP using your invite link will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rsvps.map((rsvp) => {
            const isSaving = pendingId === rsvp.id

            return (
              <li
                key={rsvp.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {rsvp.guest_name}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                      {formatPartySize(rsvp.party_size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleCheckIn(rsvp)}
                    disabled={isPending}
                    aria-pressed={rsvp.checked_in}
                    aria-label={
                      rsvp.checked_in
                        ? `Undo check-in for ${rsvp.guest_name}`
                        : `Check in ${rsvp.guest_name}`
                    }
                    className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 sm:w-auto ${
                      rsvp.checked_in
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:focus:ring-emerald-400'
                        : 'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800 dark:focus:ring-zinc-100'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Spinner />
                        Saving...
                      </>
                    ) : rsvp.checked_in ? (
                      <>
                        <CheckIcon />
                        Checked in
                      </>
                    ) : (
                      <>
                        <CircleIcon />
                        Check in
                      </>
                    )}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{value}</dd>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 010 1.415l-7.5 7.5a1 1 0 01-1.415 0l-3.5-3.5a1 1 0 111.415-1.415l2.793 2.793 6.793-6.793a1 1 0 011.415 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function CircleIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7" />
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
