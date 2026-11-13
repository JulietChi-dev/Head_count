import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/**
 * Server-side authentication check for host-only operations.
 * Verifies the user against Supabase Auth (does not rely on proxy alone).
 * Redirects signed-out visitors to /login.
 */
export async function requireHostUser(): Promise<User> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return user
}

/**
 * Server-side retrieval of the authenticated host user.
 * Returns null if the user is unauthenticated without redirecting.
 */
export async function getHostUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

