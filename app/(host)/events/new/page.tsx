import Link from 'next/link'
import EventForm from '../event-form'

export const metadata = {
  title: 'Create event | HeadCount',
  description: 'Create a new event on HeadCount.',
}

export default function NewEventPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <Link
          href="/events"
          className="text-sm font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          &larr; Back to my events
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create event
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Add the details guests need to find and RSVP to your event.
        </p>

        <div className="mt-8">
          <EventForm mode="create" />
        </div>
      </div>
    </main>
  )
}
