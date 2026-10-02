import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabaseClient } from '../lib/supabase'
import { getVehicleName, normalizeVehicle } from '../lib/vehicle'
import type { AdminAccount } from '../types/admin'
import type { Vehicle, VehicleDraft } from '../types/vehicle'

interface VehicleImage {
  path: string
  url?: string
}

interface ProfileSummary {
  id: string
  username: string
  email: string | null
}

async function signVehicleImages(paths: string[]): Promise<VehicleImage[]> {
  if (!supabaseClient) return []
  const client = supabaseClient
  const results = await Promise.all(paths.map((path) =>
    client.storage.from('user-vehicle-images').createSignedUrl(path, 60 * 60),
  ))
  return paths.map((path, index) => ({
    path,
    url: results[index].data?.signedUrl,
  }))
}

function toDatabasePayload(draft: VehicleDraft, username: string | null) {
  const nullableText = (value: string) => value.trim() || null
  const nullableNumber = (value: string) => value.trim() ? Number(value) : null

  return {
    vehicle_number: nullableText(draft.vehicle_number),
    name: nullableText(getVehicleName(draft.company, draft.model)),
    model: nullableText(draft.model),
    company: nullableText(draft.company),
    year: nullableNumber(draft.year),
    taken_date: nullableText(draft.taken_date),
    last_service_date: nullableText(draft.last_service_date),
    last_service_km: nullableNumber(draft.last_service_km),
    next_service_date: nullableText(draft.next_service_date),
    next_service_km: nullableNumber(draft.next_service_km),
    last_pucc_date: nullableText(draft.last_pucc_date),
    next_pucc_date: nullableText(draft.next_pucc_date),
    insurance_taken_date: nullableText(draft.insurance_taken_date),
    insurance_next_renewal_date: nullableText(draft.insurance_next_renewal_date),
    rc_owner_name: nullableText(draft.rc_owner_name),
    chassis_no: nullableText(draft.chassis_no),
    engine_no: nullableText(draft.engine_no),
    tax_valid_upto: nullableText(draft.tax_valid_upto),
    registration_validity: nullableText(draft.registration_validity),
    uploaded_by: username,
  }
}

export function useMyVehicles(session: Session | null, adminView = false) {
  const [records, setRecords] = useState<Vehicle[]>([])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [errorState, setErrorState] = useState<{ scopeKey: string; message: string } | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [userCount, setUserCount] = useState<number | null>(null)
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const userId = session?.user.id
  const scopeKey = userId ? `${userId}:${adminView ? 'admin' : 'owner'}` : null

  useEffect(() => {
    if (!supabaseClient || !userId) return

    const client = supabaseClient
    const activeUserId = userId
    const activeScopeKey = `${activeUserId}:${adminView ? 'admin' : 'owner'}`
    let isCurrent = true

    async function loadVehicles() {
      try {
        const vehicleQuery = client.from('user_vehicles').select('*')
        const vehicleResult = adminView
          ? await vehicleQuery.order('created_at', { ascending: false })
          : await vehicleQuery
            .eq('user_id', activeUserId)
            .order('created_at', { ascending: false })

        if (!isCurrent) return
        if (vehicleResult.error) {
          setErrorState({
            scopeKey: activeScopeKey,
            message: 'Could not load your collection. Check the user-account setup SQL and RLS policies.',
          })
          setLoadedFor(activeScopeKey)
          return
        }

        let profiles: ProfileSummary[] = []
        if (adminView) {
          const profileResult = await client.from('profiles').select('id, username, email')
          if (profileResult.error) {
            const usernameResult = await client.from('profiles').select('id, username')
            if (!isCurrent) return
            if (!usernameResult.error) {
              profiles = (usernameResult.data ?? []).map((profile) => ({ ...profile, email: null }))
            } else {
              setErrorState({ scopeKey: activeScopeKey, message: 'Could not load admin account summaries.' })
              setLoadedFor(activeScopeKey)
              return
            }
          } else {
            profiles = profileResult.data ?? []
          }
          if (!isCurrent) return
        }
        const usernameById = new Map(profiles.map((profile) => [profile.id, profile.username]))
        const emailById = new Map(profiles.map((profile) => [profile.id, profile.email]))
        const normalized = (vehicleResult.data ?? []).map((row) => normalizeVehicle({
          ...(row as unknown as Vehicle),
          owner_username: usernameById.get(row.user_id) ?? row.user_id,
          owner_email: emailById.get(row.user_id) ?? null,
        }))
        const withImages = await Promise.all(normalized.map(async (vehicle) => {
          const paths = vehicle.images ?? []
          const signedImages = await signVehicleImages(paths)
          return {
            ...vehicle,
            image_paths: paths,
            signed_images: signedImages,
            images: signedImages.flatMap((image) => image.url ?? []),
          }
        }))

        if (!isCurrent) return
        const vehicleCounts = new Map<string, number>()
        for (const vehicle of normalized) {
          if (!vehicle.user_id) continue
          vehicleCounts.set(vehicle.user_id, (vehicleCounts.get(vehicle.user_id) ?? 0) + 1)
        }
        setRecords(withImages)
        setErrorState(null)
        setUserCount(adminView ? profiles.length : null)
        setAccounts(adminView
          ? profiles.map((profile) => ({
            ...profile,
            vehicleCount: vehicleCounts.get(profile.id) ?? 0,
          }))
          : [])
        setLoadedFor(activeScopeKey)
      } catch {
        if (!isCurrent) return
        setErrorState({ scopeKey: activeScopeKey, message: 'Could not connect to your private collection.' })
        setLoadedFor(activeScopeKey)
      }
    }

    void loadVehicles()

    return () => {
      isCurrent = false
    }
  }, [userId, adminView])

  async function saveVehicle(
    draft: VehicleDraft,
    images: File[],
    retainedImagePaths: string[],
    primaryImageIndex: number | null,
    editingVehicleId?: string,
  ): Promise<string | null> {
    if (!supabaseClient || !session) return 'Sign in before saving a vehicle.'
    const client = supabaseClient
    const editingVehicle = editingVehicleId
      ? records.find((vehicle) => vehicle.id === editingVehicleId)
      : undefined
    if (adminView && !editingVehicle) return 'Select an existing vehicle to manage from the admin panel.'
    const existingPaths = editingVehicle?.image_paths ?? []
    const keptImagePaths = editingVehicle
      ? retainedImagePaths.filter((path) => existingPaths.includes(path))
      : []
    const vehicleId = editingVehicle?.id ?? crypto.randomUUID()
    const targetUserId = editingVehicle?.user_id ?? session.user.id
    const uploadedPaths: string[] = []

    try {
      for (const image of images) {
        const extension = image.name.includes('.')
          ? image.name.slice(image.name.lastIndexOf('.') + 1).replace(/[^a-zA-Z0-9]/g, '')
          : 'image'
        const path = `${targetUserId}/${vehicleId}/${crypto.randomUUID()}.${extension}`
        const { error } = await client.storage
          .from('user-vehicle-images')
          .upload(path, image, { contentType: image.type, upsert: false })

        if (error) {
          if (uploadedPaths.length > 0) {
            await client.storage.from('user-vehicle-images').remove(uploadedPaths)
          }
          return 'Could not upload an image. Check the file and try again.'
        }
        uploadedPaths.push(path)
      }

      const imagePaths = [...keptImagePaths, ...uploadedPaths]
      const primaryImagePath = primaryImageIndex == null
        ? imagePaths[0] ?? null
        : imagePaths[primaryImageIndex] ?? null
      const payload = {
        ...toDatabasePayload(
          draft,
          editingVehicle?.uploaded_by ?? session.user.user_metadata.username ?? session.user.email ?? null,
        ),
        images: imagePaths,
        primary_image: primaryImagePath,
      }
      const result = editingVehicle
        ? await client
          .from('user_vehicles')
          .update(payload)
          .eq('id', editingVehicle.id)
          .eq('user_id', targetUserId)
          .select('*')
          .single()
        : await client
          .from('user_vehicles')
          .insert({ ...payload, id: vehicleId, user_id: targetUserId })
          .select('*')
          .single()

      if (result.error) {
        if (uploadedPaths.length > 0) {
          await client.storage.from('user-vehicle-images').remove(uploadedPaths)
        }
        return 'Could not save this vehicle. Check your connection and try again.'
      }

      const signedImages = await signVehicleImages(imagePaths)
      const savedVehicle = normalizeVehicle({
        ...result.data,
        image_paths: imagePaths,
        signed_images: signedImages,
        images: signedImages.flatMap((image) => image.url ?? []),
      } as unknown as Vehicle)

      if (editingVehicle) {
        setRecords((current) => current.map((vehicle) =>
          vehicle.id === editingVehicle.id ? savedVehicle : vehicle,
        ))
        const removedPaths = existingPaths.filter((path) => !keptImagePaths.includes(path))
        if (removedPaths.length > 0) {
          await client.storage.from('user-vehicle-images').remove(removedPaths)
        }
      } else {
        setRecords((current) => [savedVehicle, ...current])
      }
      setErrorState(null)
      return null
    } catch {
      if (uploadedPaths.length > 0) {
        await client.storage.from('user-vehicle-images').remove(uploadedPaths)
      }
      return 'Could not save this vehicle. Check your connection and try again.'
    }
  }

  async function deleteVehicle(vehicle: Vehicle): Promise<string | null> {
    if (!supabaseClient || !session) return 'Sign in before deleting a vehicle.'
    setDeleteBusy(true)
    const client = supabaseClient

    try {
      const { error } = await client
        .from('user_vehicles')
        .delete()
        .eq('id', vehicle.id)
        .eq('user_id', vehicle.user_id ?? session.user.id)

      if (error) return 'Could not delete this vehicle. Please try again.'

      setRecords((current) => current.filter((item) => item.id !== vehicle.id))
      const imagePaths = vehicle.image_paths ?? []
      if (imagePaths.length > 0) {
        const { error: storageError } = await client.storage
          .from('user-vehicle-images')
          .remove(imagePaths)
        if (storageError) return 'Vehicle deleted, but some stored images could not be removed.'
      }
      return null
    } catch {
      return 'Could not delete this vehicle. Please try again.'
    } finally {
      setDeleteBusy(false)
    }
  }

  const loading = Boolean(scopeKey && loadedFor !== scopeKey)
  const error = errorState && errorState.scopeKey === scopeKey ? errorState.message : null
  const vehicles = loadedFor === scopeKey ? records : []
  const currentAccounts = adminView && loadedFor === scopeKey ? accounts : []

  return { vehicles, loading, error, deleteBusy, userCount, accounts: currentAccounts, saveVehicle, deleteVehicle }
}
