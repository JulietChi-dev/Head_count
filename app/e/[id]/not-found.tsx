import Link from 'next/link'

export const metadata = {
  title: 'Link not found | HeadCount',
  description: 'This invite link could not be found.',
}

export default function PublicEventNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 text-center dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          This link was not found.
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The invite link may be incorrect, or the event may have been removed. Ask the host to
          share the link again.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Go to HeadCount
        </Link>
      </div>
    </main>
  )
}
