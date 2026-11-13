import Link from 'next/link'
import { Suspense } from 'react'
import { getHostEvents } from '@/lib/data/events'

export const metadata = {
  title: 'My Events | HeadCount',
  description: 'View and manage the events you host on HeadCount.',
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

export default function MyEventsPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              My events
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Everything you host, with links to each guest list.
            </p>
          </div>
          <Link
            href="/events/new"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Create event
          </Link>
        </div>

        <Suspense fallback={<EventsLoading />}>
          <HostEvents />
        </Suspense>
      </div>
    </main>
  )
}

async function HostEvents() {
  const { events, error } = await getHostEvents()

  if (error) {
    return (
      <div
        role="alert"
        className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
      >
        <p className="font-semibold">We could not load your events.</p>
        <p className="mt-1">{error}</p>
      </div>
    )
  }

  if (events.length === 0) {
    return <EmptyState />
  }

  return (
    <ul className="mt-8 space-y-4">
      {events.map((event) => (
        <li
          key={event.id}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {event.title}
          </h2>

          <dl className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="flex gap-1.5">
              <dt className="font-medium text-zinc-700 dark:text-zinc-300">Date:</dt>
              <dd>{formatEventDate(event.date)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="font-medium text-zinc-700 dark:text-zinc-300">Venue:</dt>
              <dd>{event.venue}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="font-medium text-zinc-700 dark:text-zinc-300">Capacity:</dt>
              <dd>{event.capacity} guests</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/events/${event.id}/guests`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Guest list
            </Link>
            <Link
              href={`/events/${event.id}/edit`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Edit event
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        No events yet
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        You have not created any events. Create your first event to start
        collecting RSVPs and managing your guest list.
      </p>
      <Link
        href="/events/new"
        className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Create event
      </Link>
    </div>
  )
}

function EventsLoading() {
  return (
    <div className="mt-8 space-y-4" aria-hidden="true">
      {[0, 1].map((key) => (
        <div
          key={key}
          className="h-36 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        />
      ))}
    </div>
  )
}
