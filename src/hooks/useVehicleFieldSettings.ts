import { useCallback, useEffect, useState } from 'react'
import { supabaseClient } from '../lib/supabase'
import {
  defaultVehicleFieldSettings,
  settingColumn,
  vehicleFieldDefinitions,
  type VehicleFieldKey,
  type VehicleFieldSettings,
  type VehicleFieldSurface,
} from '../lib/vehicleSettings'

const fieldKeys = new Set<string>(vehicleFieldDefinitions.map((field) => field.key))

export function useVehicleFieldSettings(userId: string | undefined, isAdmin: boolean) {
  const [state, setState] = useState<{
    userId: string | undefined
    settings: VehicleFieldSettings
    error: string | null
  }>({ userId: undefined, settings: defaultVehicleFieldSettings, error: null })

  useEffect(() => {
    if (!supabaseClient || !userId) return

    let current = true
    let loadGeneration = 0
    const client = supabaseClient

    async function loadSettings() {
      const generation = ++loadGeneration
      const { data, error: queryError } = await client
        .from('vehicle_field_visibility')
        .select('field_key, show_in_form, show_in_details, allow_share')

      if (!current || generation !== loadGeneration) return
      if (queryError) {
        setState({
          userId,
          settings: defaultVehicleFieldSettings,
          error: 'Could not load vehicle field settings. Run the latest user-account SQL setup.',
        })
        return
      }

      const nextSettings = { ...defaultVehicleFieldSettings }
      for (const row of data ?? []) {
        if (!fieldKeys.has(row.field_key)) continue
        const key = row.field_key as VehicleFieldKey
        nextSettings[key] = {
          field_key: key,
          show_in_form: row.show_in_form,
          show_in_details: row.show_in_details,
          allow_share: row.allow_share,
        }
      }
      setState({ userId, settings: nextSettings, error: null })
    }

    void loadSettings().catch(() => {
      if (!current) return
      setState({
        userId,
        settings: defaultVehicleFieldSettings,
        error: 'Could not load vehicle field settings.',
      })
    })

    const channel = client
      .channel(`vehicle-field-visibility:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vehicle_field_visibility',
      }, () => {
        void loadSettings().catch(() => {
          if (!current) return
          setState((previous) => previous.userId === userId
            ? { ...previous, error: 'Could not refresh vehicle field settings.' }
            : previous)
        })
      })
      .subscribe()

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadSettings().catch(() => {
          if (!current) return
          setState((previous) => previous.userId === userId
            ? { ...previous, error: 'Could not refresh vehicle field settings.' }
            : previous)
        })
      }
    }
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      current = false
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      void client.removeChannel(channel)
    }
  }, [userId])

  const updateSetting = useCallback(async (
    key: VehicleFieldKey,
    surface: VehicleFieldSurface,
    visible: boolean,
  ) => {
    if (!supabaseClient || !isAdmin) return 'Administrator access is required to change field settings.'

    try {
      const { error: updateError } = await supabaseClient
        .from('vehicle_field_visibility')
        .update({ [settingColumn(surface)]: visible, updated_at: new Date().toISOString() })
        .eq('field_key', key)

      if (updateError) return 'Could not save this field setting.'
      setState((current) => ({
        userId: current.userId,
        settings: {
          ...current.settings,
          [key]: { ...current.settings[key], [settingColumn(surface)]: visible },
        },
        error: null,
      }))
      return null
    } catch {
      return 'Could not save this field setting.'
    }
  }, [isAdmin])

  const currentState = state.userId === userId ? state : null
  return {
    settings: currentState?.settings ?? defaultVehicleFieldSettings,
    loading: Boolean(userId && !currentState),
    error: currentState?.error ?? null,
    updateSetting,
  }
}