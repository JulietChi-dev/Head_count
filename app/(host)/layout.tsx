import { ReactNode } from 'react'
import { requireHostUser } from '@/lib/auth'

// The signed-in host check reads the session cookie, so this segment renders at
// request time. Opt the host area out of Cache Components' static-shell
// validation; host pages keep blocking on the server by design.
export const instant = false

/**
 * Server-side layout for the (host) route group.
 * Ensures the visiting user is an authenticated host via Supabase Auth getUser().
 * Redirects unauthenticated visitors to /login.
 */
export default async function HostLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireHostUser()

  return <>{children}</>
}

