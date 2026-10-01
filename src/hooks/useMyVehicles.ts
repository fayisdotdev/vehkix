import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabaseClient } from '../lib/supabase'
import { normalizeVehicle } from '../lib/vehicle'
import type { Vehicle, VehicleDraft } from '../types/vehicle'

interface VehicleImage {
  path: string
  url?: string
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
    name: nullableText(draft.name),
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

export function useMyVehicles(session: Session | null) {
  const [records, setRecords] = useState<Vehicle[]>([])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [errorState, setErrorState] = useState<{ userId: string; message: string } | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const userId = session?.user.id

  useEffect(() => {
    if (!supabaseClient || !userId) return

    const client = supabaseClient
    const activeUserId = userId
    let isCurrent = true

    async function loadVehicles() {
      try {
        const { data, error } = await client
          .from('user_vehicles')
          .select('*')
          .eq('user_id', activeUserId)
          .order('created_at', { ascending: false })

        if (!isCurrent) return
        if (error) {
          setErrorState({
            userId: activeUserId,
            message: 'Could not load your collection. Check the user-account setup SQL and RLS policies.',
          })
          setLoadedFor(activeUserId)
          return
        }

        const normalized = (data ?? []).map((row) => normalizeVehicle(row as unknown as Vehicle))
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
        setRecords(withImages)
        setErrorState(null)
        setLoadedFor(activeUserId)
      } catch {
        if (!isCurrent) return
        setErrorState({ userId: activeUserId, message: 'Could not connect to your private collection.' })
        setLoadedFor(activeUserId)
      }
    }

    void loadVehicles()

    return () => {
      isCurrent = false
    }
  }, [userId])

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
    const existingPaths = editingVehicle?.image_paths ?? []
    const keptImagePaths = editingVehicle
      ? retainedImagePaths.filter((path) => existingPaths.includes(path))
      : []
    const vehicleId = editingVehicle?.id ?? crypto.randomUUID()
    const uploadedPaths: string[] = []

    try {
      for (const image of images) {
        const extension = image.name.includes('.')
          ? image.name.slice(image.name.lastIndexOf('.') + 1).replace(/[^a-zA-Z0-9]/g, '')
          : 'image'
        const path = `${session.user.id}/${vehicleId}/${crypto.randomUUID()}.${extension}`
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
        ...toDatabasePayload(draft, session.user.user_metadata.username || session.user.email || null),
        images: imagePaths,
        primary_image: primaryImagePath,
      }
      const result = editingVehicle
        ? await client
          .from('user_vehicles')
          .update(payload)
          .eq('id', editingVehicle.id)
          .eq('user_id', session.user.id)
          .select('*')
          .single()
        : await client
          .from('user_vehicles')
          .insert({ ...payload, id: vehicleId, user_id: session.user.id })
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
        .eq('user_id', session.user.id)

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

  const loading = Boolean(userId && loadedFor !== userId)
  const error = errorState && errorState.userId === userId ? errorState.message : null
  const vehicles = loadedFor === userId ? records : []

  return { vehicles, loading, error, deleteBusy, saveVehicle, deleteVehicle }
}
