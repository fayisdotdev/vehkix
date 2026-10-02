export const vehicleFieldDefinitions = [
  { key: 'vehicle_title', label: 'Vehicle title (make + model)', group: 'Vehicle', form: false, details: true, share: true },
  { key: 'vehicle_number', label: 'Registration number', group: 'Vehicle', form: true, details: true, share: true },
  { key: 'company', label: 'Make', group: 'Vehicle', form: true, details: true, share: true },
  { key: 'model', label: 'Model', group: 'Vehicle', form: true, details: true, share: true },
  { key: 'year', label: 'Year', group: 'Vehicle', form: true, details: true, share: true },
  { key: 'taken_date', label: 'Added to garage', group: 'Vehicle', form: false, details: false, share: false },
  { key: 'last_service_date', label: 'Last service date', group: 'Service', form: true, details: true, share: true },
  { key: 'last_service_km', label: 'Last service mileage', group: 'Service', form: true, details: true, share: true },
  { key: 'next_service_date', label: 'Next service date', group: 'Service', form: true, details: true, share: true },
  { key: 'next_service_km', label: 'Next service mileage', group: 'Service', form: true, details: true, share: true },
  { key: 'next_pucc_date', label: 'Next PUCC renewal', group: 'Documents', form: true, details: true, share: true },
  { key: 'insurance_next_renewal_date', label: 'Insurance renewal', group: 'Documents', form: true, details: true, share: true },
  { key: 'tax_valid_upto', label: 'Tax valid up to', group: 'Documents', form: true, details: true, share: true },
  { key: 'registration_validity', label: 'Registration valid up to', group: 'Documents', form: true, details: true, share: true },
  { key: 'last_pucc_date', label: 'Last PUCC check', group: 'Documents', form: true, details: true, share: true },
  { key: 'insurance_taken_date', label: 'Insurance policy date', group: 'Documents', form: true, details: true, share: true },
  { key: 'rc_owner_name', label: 'RC owner name', group: 'RC details', form: true, details: true, share: true },
  { key: 'chassis_no', label: 'Chassis number', group: 'RC details', form: true, details: true, share: true },
  { key: 'engine_no', label: 'Engine number', group: 'RC details', form: true, details: true, share: true },
  { key: 'images', label: 'Vehicle photos', group: 'Photos', form: true, details: true, share: true },
  { key: 'owner_username', label: 'Vehicle owner', group: 'Record', form: false, details: true, share: true },
  { key: 'id', label: 'Record ID', group: 'Record', form: false, details: false, share: false },
  { key: 'uploaded_by', label: 'Uploaded by', group: 'Record', form: false, details: false, share: false },
  { key: 'uploaded_date', label: 'Uploaded on', group: 'Record', form: false, details: false, share: false },
] as const

export type VehicleFieldKey = typeof vehicleFieldDefinitions[number]['key']
export type VehicleFieldSurface = 'form' | 'details' | 'share'

export interface VehicleFieldVisibility {
  field_key: VehicleFieldKey
  show_in_form: boolean
  show_in_details: boolean
  allow_share: boolean
}

export type VehicleFieldSettings = Record<VehicleFieldKey, VehicleFieldVisibility>

export const defaultVehicleFieldSettings = Object.fromEntries(
  vehicleFieldDefinitions.map((field) => [field.key, {
    field_key: field.key,
    show_in_form: field.form,
    show_in_details: field.details,
    allow_share: field.share,
  }]),
) as VehicleFieldSettings

export function settingColumn(surface: VehicleFieldSurface) {
  if (surface === 'form') return 'show_in_form'
  if (surface === 'details') return 'show_in_details'
  return 'allow_share'
}