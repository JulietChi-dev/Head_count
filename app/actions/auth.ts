'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type AuthActionResult = {
  success?: boolean
  error?: string
  message?: string
  needsConfirmation?: boolean
}

function getCredentials(
  arg1?: FormData | { email?: string; password?: string } | unknown,
  arg2?: FormData
): { email: string; password: string } {
  let email = ''
  let password = ''

  if (arg2 instanceof FormData) {
    email = (arg2.get('email') as string) || ''
    password = (arg2.get('password') as string) || ''
  } else if (arg1 instanceof FormData) {
    email = (arg1.get('email') as string) || ''
    password = (arg1.get('password') as string) || ''
  } else if (arg1 && typeof arg1 === 'object') {
    const obj = arg1 as { email?: unknown; password?: unknown }
    email = typeof obj.email === 'string' ? obj.email : ''
    password = typeof obj.password === 'string' ? obj.password : ''
  }

  return {
    email: email.trim(),
    password: password.trim(),
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Server action for email-and-password registration.
 * Handles validation, Supabase responses, and respects the project's email confirmation setting.
 */
export async function signUp(
  arg1?: FormData | { email?: string; password?: string } | unknown,
  arg2?: FormData
): Promise<AuthActionResult> {
  const { email, password } = getCredentials(arg1, arg2)

  if (!email || !isValidEmail(email)) {
    return { error: 'Please enter a valid email address.' }
  }

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('user already exists')) {
        return {
          error: 'An account with this email already exists or cannot be registered. Please try logging in.',
        }
      }
      if (msg.includes('rate limit') || msg.includes('too many requests')) {
        return { error: 'Too many registration attempts. Please wait a moment and try again.' }
      }
      return { error: 'Unable to complete registration. Please try again.' }
    }

    // When email confirmation is enabled and the user already exists, Supabase may return
    // an empty identities array to prevent account enumeration.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return {
        success: true,
        needsConfirmation: true,
        message: 'If an account does not yet exist, a confirmation link has been sent to your email.',
      }
    }

    // Respect project's email confirmation setting:
    // If a session exists, email confirmation is disabled and the user is logged in immediately.
    // If no session exists, email confirmation is enabled and the user must verify their email.
    if (data.session) {
      revalidatePath('/', 'layout')
      return {
        success: true,
        needsConfirmation: false,
        message: 'Account created and signed in successfully.',
      }
    }

    return {
      success: true,
      needsConfirmation: true,
      message: 'Please check your email to confirm your account before logging in.',
    }
  } catch {
    return { error: 'An unexpected error occurred during sign up. Please try again.' }
  }
}

/**
 * Server action for email-and-password sign in.
 * Validates inputs and returns safe error responses without leaking private account status.
 */
export async function logIn(
  arg1?: FormData | { email?: string; password?: string } | unknown,
  arg2?: FormData
): Promise<AuthActionResult> {
  const { email, password } = getCredentials(arg1, arg2)

  if (!email || !isValidEmail(email)) {
    return { error: 'Please enter a valid email address.' }
  }

  if (!password) {
    return { error: 'Please enter your password.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('email not confirmed')) {
        return { error: 'Please confirm your email address before logging in.' }
      }
      if (msg.includes('rate limit') || msg.includes('too many requests')) {
        return { error: 'Too many sign-in attempts. Please wait a moment and try again.' }
      }
      // Safe generic message to prevent account discovery
      return { error: 'Invalid email or password. Please try again.' }
    }

    revalidatePath('/', 'layout')
    return {
      success: true,
      message: 'Logged in successfully.',
    }
  } catch {
    return { error: 'An unexpected error occurred during sign in. Please try again.' }
  }
}

/**
 * Server action for signing out the current user session.
 */
export async function signOut(): Promise<AuthActionResult> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { error: 'Failed to sign out. Please try again.' }
    }

    revalidatePath('/', 'layout')
    return {
      success: true,
      message: 'Signed out successfully.',
    }
  } catch {
    return { error: 'An unexpected error occurred while signing out. Please try again.' }
  }
}

// Aliases for naming flexibility
export async function signup(
  arg1?: FormData | { email?: string; password?: string } | unknown,
  arg2?: FormData
) {
  return signUp(arg1, arg2)
}

export async function login(
  arg1?: FormData | { email?: string; password?: string } | unknown,
  arg2?: FormData
) {
  return logIn(arg1, arg2)
}

export async function signIn(
  arg1?: FormData | { email?: string; password?: string } | unknown,
  arg2?: FormData
) {
  return logIn(arg1, arg2)
}

export async function signout() {
  return signOut()
}

export async function logout() {
  return signOut()
}

