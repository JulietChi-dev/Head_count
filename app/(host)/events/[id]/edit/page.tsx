import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getHostEventById } from '@/lib/data/events'
import EventForm from '../../event-form'

export const metadata = {
  title: 'Edit event | HeadCount',
  description: 'Update the details of an event you host on HeadCount.',
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getHostEventById(id)

  if (!event) {
    notFound()
  }

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
          Edit event
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Update the details for {event.title}.
        </p>

        <div className="mt-8">
          <EventForm
            mode="edit"
            eventId={event.id}
            initialValues={{
              title: event.title,
              date: event.date,
              venue: event.venue,
              capacity: event.capacity,
              description: event.description,
            }}
          />
        </div>
      </div>
    </main>
  )
}
