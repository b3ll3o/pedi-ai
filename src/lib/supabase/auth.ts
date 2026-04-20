import type { AuthResponse, Session, User } from '@supabase/supabase-js'
import { createClient } from './client'

/**
 * Sign in with email and password
 */
async function signIn(email: string, password: string): Promise<AuthResponse> {
  const supabase = createClient()
  return supabase.auth.signInWithPassword({
    email,
    password,
  })
}

/**
 * Sign out the current user
 */
async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
}

/**
 * Get the current session
 */
async function getSession(): Promise<Session | null> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

/**
 * Get the current user
 */
async function getUser(): Promise<User | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Reset password for an email
 */
async function resetPassword(email: string): Promise<void> {
  const supabase = createClient()
  await supabase.auth.resetPasswordForEmail(email)
}

/**
 * Subscribe to auth state changes
 */
function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  const supabase = createClient()
  return supabase.auth.onAuthStateChange(callback)
}

export { signIn, signOut, getSession, getUser, resetPassword, onAuthStateChange }
export type { AuthResponse, Session, User }
