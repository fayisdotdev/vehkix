import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabaseClient } from '../lib/supabase'

interface AdminAccessState {
  userId: string
  isAdmin: boolean
  error: string | null
}

export function useAdminAccess(session: Session | null) {
  const [accessState, setAccessState] = useState<AdminAccessState | null>(null)
  const userId = session?.user.id

  useEffect(() => {
    if (!supabaseClient || !userId) return

    const client = supabaseClient
    let isCurrent = true
    const activeUserId = userId

    async function checkAccess() {
      try {
        const { data, error } = await client.rpc('is_admin')
        if (!isCurrent) return
        setAccessState({
          userId: activeUserId,
          isAdmin: !error && data === true,
          error: error ? 'Could not verify administrator access.' : null,
        })
      } catch {
        if (isCurrent) {
          setAccessState({
            userId: activeUserId,
            isAdmin: false,
            error: 'Could not verify administrator access.',
          })
        }
      }
    }

    void checkAccess()

    return () => {
      isCurrent = false
    }
  }, [userId])

  const currentState = accessState?.userId === userId ? accessState : null
  return {
    isAdmin: currentState?.isAdmin ?? false,
    loading: Boolean(userId && !currentState),
    error: currentState?.error ?? null,
  }
}
