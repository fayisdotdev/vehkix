export interface Vehicle {
  id: string
  vehicle_number?: string | null
  name?: string | null
  model?: string | null
  company?: string | null
  year?: number | null
  taken_date?: string | null
  service?: {
    last_service_date?: string | null
    last_service_km?: number | null
    next_service_date?: string | null
    next_service_km?: number | null
  }
  pucc?: {
    last_pucc_date?: string | null
    next_pucc_date?: string | null
  }
  insurance?: {
    taken_date?: string | null
    next_renewal_date?: string | null
  }
  user_id?: string
  last_service_date?: string | null
  last_service_km?: number | null
  next_service_date?: string | null
  next_service_km?: number | null
  last_pucc_date?: string | null
  next_pucc_date?: string | null
  insurance_taken_date?: string | null
  insurance_next_renewal_date?: string | null
  uploaded_by?: string | null
  uploaded_date?: string | null
  images?: string[] | null
  image_paths?: string[]
  signed_images?: ExistingVehicleImage[]
}

export interface VehicleDraft {
  vehicle_number: string
  name: string
  model: string
  company: string
  year: string
  taken_date: string
  last_service_date: string
  last_service_km: string
  next_service_date: string
  next_service_km: string
  last_pucc_date: string
  next_pucc_date: string
  insurance_taken_date: string
  insurance_next_renewal_date: string
}

export interface ExistingVehicleImage {
  path: string
  url?: string
}
