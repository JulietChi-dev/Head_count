import { notFound } from 'next/navigation'
import { getPublicEventDetails } from '@/lib/data/events'
import RsvpForm from './rsvp-form'

// The page loads the event from the database and compares the current time to
// the start time, so it renders per request instead of shipping a static shell.
export const instant = false

export const metadata = {
  title: 'Event invitation | HeadCount',
  description: 'View event details and RSVP on HeadCount.',
}

function formatEventDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date)
}

// RSVPs close once the event has started, so this is evaluated per request
// rather than inlined in the component body.
function hasEventEnded(eventDate: string): boolean {
  return new Date(eventDate).getTime() <= Date.now()
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getPublicEventDetails(id)

  if (!event) {
    notFound()
  }

  // RSVPs close at the event start time, but the details stay available.
  const hasEnded = hasEventEnded(event.date)

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            You&apos;re invited
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {event.title}
          </h1>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex gap-2">
              <dt className="font-medium text-zinc-700 dark:text-zinc-300">Date:</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">{formatEventDate(event.date)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-zinc-700 dark:text-zinc-300">Venue:</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">{event.venue}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-zinc-700 dark:text-zinc-300">Capacity:</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">{event.capacity} guests</dd>
            </div>
          </dl>

          {event.description && (
            <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                About this event
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-400">
                {event.description}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6">
          {hasEnded ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                This event has ended.
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                RSVPs are closed, but the event details are still here for reference.
              </p>
            </div>
          ) : (
            <RsvpForm eventId={event.id} />
          )}
        </div>
      </div>
    </main>
  )
}
