import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabaseClient } from '../lib/supabase'
import type { AuthFeedback, AuthMode, AuthValues } from '../types/auth'

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [isReady, setIsReady] = useState(!supabaseClient)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabaseClient) return

    let isCurrent = true
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!isCurrent) return
      setSession(nextSession)
      setIsReady(true)
      if (!nextSession) setError(null)
    })

    supabaseClient.auth.getSession().then(({ data, error: sessionError }) => {
      if (!isCurrent) return
      if (sessionError) setError('Could not restore your session. Please sign in again.')
      setSession(data.session)
      setIsReady(true)
    }).catch(() => {
      if (isCurrent) {
        setError('Could not connect to the account service.')
        setIsReady(true)
      }
    })

    return () => {
      isCurrent = false
      subscription.unsubscribe()
    }
  }, [])

  async function submitAuth(mode: AuthMode, values: AuthValues): Promise<AuthFeedback> {
    if (!supabaseClient) {
      return { kind: 'error', message: 'Supabase is not configured.' }
    }

    if (mode === 'sign-in') {
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })
      if (signInError) {
        return { kind: 'error', message: 'Email or password was not accepted.' }
      }
      return { kind: 'success', message: 'You are signed in.' }
    }

    const { data, error: signUpError } = await supabaseClient.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { username: values.username } },
    })
    if (signUpError) {
      const message = signUpError.message.toLowerCase()
      if (message.includes('profiles_username_unique_ci') || message.includes('duplicate key')) {
        return { kind: 'error', message: 'That username is already taken.' }
      }
      if (message.includes('already registered') || message.includes('already exists')) {
        return { kind: 'error', message: 'An account may already use that email address.' }
      }
      return { kind: 'error', message: 'Could not create the account. Check the details and try again.' }
    }

    return data.session
      ? { kind: 'success', message: 'Account created. You are signed in.' }
      : { kind: 'success', message: 'Account created. Check your email to confirm your address.' }
  }

  async function signOut() {
    if (!supabaseClient) return 'Supabase is not configured.'
    const { error: signOutError } = await supabaseClient.auth.signOut()
    return signOutError ? 'Could not sign out. Please try again.' : null
  }

  return { session, isReady, error, submitAuth, signOut }
}
