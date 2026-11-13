import Link from 'next/link'
import { getEventGuestList } from '@/app/actions/rsvps'
import GuestList from './guest-list'

export const metadata = {
  title: 'Guest list | HeadCount',
  description: 'See who has RSVPed and check guests in on HeadCount.',
}

function formatEventDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default async function GuestListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getEventGuestList(id)

  if (result.error || !result.event || !result.rsvps || !result.totals) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
          <Link
            href="/events"
            className="text-sm font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            &larr; Back to my events
          </Link>

          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            <p className="font-semibold">We could not load this guest list.</p>
            <p className="mt-1">{result.error ?? 'Please try again.'}</p>
          </div>
        </div>
      </main>
    )
  }

  const { event, rsvps } = result

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <Link
          href="/events"
          className="text-sm font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          &larr; Back to my events
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          {event.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {formatEventDate(event.event_date)} &middot; {event.venue}
        </p>

        <h2 className="mt-8 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Guest list
        </h2>

        <GuestList rsvps={rsvps} capacity={event.capacity} />
      </div>
    </main>
  )
}
