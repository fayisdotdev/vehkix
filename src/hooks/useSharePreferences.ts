import { useEffect, useRef, useState } from 'react'
import { supabaseClient } from '../lib/supabase'

type PreferenceSaveState = 'saved' | 'saving' | 'error'

interface SharePreferenceState {
  userId: string
  selectedFieldIds: string[]
  loaded: boolean
  dirty: boolean
  saveState: PreferenceSaveState
  error: string | null
}

function sameSelection(first: string[], second: string[]) {
  return first.length === second.length && first.every((fieldId, index) => fieldId === second[index])
}

export function useSharePreferences(userId: string, allowedFieldIds: string[]) {
  const allowedKey = allowedFieldIds.join('|')
  const currentAllowedFieldIds = allowedKey ? allowedKey.split('|') : []
  const [state, setState] = useState<SharePreferenceState | null>(null)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    if (!supabaseClient) return
    const allowedIdsForRequest = allowedKey ? allowedKey.split('|') : []
    const client = supabaseClient
    let current = true

    async function loadPreferences() {
      const { data, error: queryError } = await client
        .from('user_vehicle_share_preferences')
        .select('share_field_keys')
        .eq('user_id', userId)
        .maybeSingle()

      if (!current) return
      if (queryError) {
        setState({
          userId,
          selectedFieldIds: allowedIdsForRequest,
          loaded: true,
          dirty: false,
          saveState: 'error',
          error: 'Could not load your saved print choices. Run the latest user-account SQL setup.',
        })
        return
      }

      const saved = data?.share_field_keys
      setState({
        userId,
        selectedFieldIds: saved ?? allowedIdsForRequest,
        loaded: true,
        dirty: false,
        saveState: 'saved',
        error: null,
      })
    }

    void loadPreferences().catch(() => {
      if (!current) return
      setState({
        userId,
        selectedFieldIds: allowedIdsForRequest,
        loaded: true,
        dirty: false,
        saveState: 'error',
        error: 'Could not load your saved print choices.',
      })
    })

    return () => {
      current = false
    }
  }, [allowedKey, userId])

  useEffect(() => {
    if (state?.userId !== userId || !state.loaded || !state.dirty || !supabaseClient) return
    const client = supabaseClient
    const selectionToSave = [...state.selectedFieldIds]
    const timeout = window.setTimeout(() => {
      const save = saveQueue.current.then(async () => {
        const { error: saveError } = await client
          .from('user_vehicle_share_preferences')
          .upsert({
            user_id: userId,
            share_field_keys: selectionToSave,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
        if (saveError) throw saveError
      })
      saveQueue.current = save.catch(() => undefined)
      void save.then(
        () => setState((current) => {
          if (current?.userId !== userId) return current
          const isLatestSelection = sameSelection(current.selectedFieldIds, selectionToSave)
          return {
            ...current,
            dirty: !isLatestSelection,
            saveState: isLatestSelection ? 'saved' : 'saving',
            error: null,
          }
        }),
        () => setState((current) => {
          if (current?.userId !== userId) return current
          const isLatestSelection = sameSelection(current.selectedFieldIds, selectionToSave)
          return {
            ...current,
            dirty: !isLatestSelection,
            saveState: isLatestSelection ? 'error' : 'saving',
            error: isLatestSelection ? 'Could not save your print choices.' : null,
          }
        }),
      )
    }, 400)
    return () => window.clearTimeout(timeout)
  }, [state?.dirty, state?.loaded, state?.selectedFieldIds, state?.userId, userId])

  function updateSelection(update: (current: string[]) => string[]) {
    setState((current) => {
      const currentUserState = current?.userId === userId ? current : null
      const selectedFieldIds = update(currentUserState?.selectedFieldIds ?? currentAllowedFieldIds)
      return {
        userId,
        selectedFieldIds,
        loaded: currentUserState?.loaded ?? false,
        dirty: true,
        saveState: 'saving',
        error: null,
      }
    })
  }

  const currentState = state?.userId === userId ? state : null
  const allowed = new Set(currentAllowedFieldIds)
  return {
    selectedFieldIds: (currentState?.selectedFieldIds ?? currentAllowedFieldIds)
      .filter((fieldId) => allowed.has(fieldId)),
    updateSelection,
    loaded: !supabaseClient || Boolean(currentState?.loaded),
    saveState: currentState?.saveState ?? 'saving',
    error: currentState?.error ?? null,
  }
}