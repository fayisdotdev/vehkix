import { displayValue, formatDate } from '../lib/vehicle'
import type { Vehicle } from '../types/vehicle'

interface ShareField {
  id: string
  label: string
  value: string
  imageUrl?: string
}

export interface ShareSection {
  title: string
  fields: ShareField[]
}

export function createShareSections(vehicle: Vehicle, showOwner: boolean, images: { url: string }[]): ShareSection[] {
  const vehicleFields: ShareField[] = [
    { id: 'vehicle-number', label: 'Vehicle number', value: String(displayValue(vehicle.vehicle_number)) },
    { id: 'record-id', label: 'Record ID', value: vehicle.id },
    { id: 'make', label: 'Make', value: String(displayValue(vehicle.company)) },
    { id: 'model', label: 'Model', value: String(displayValue(vehicle.model)) },
    { id: 'year', label: 'Year', value: String(displayValue(vehicle.year)) },
    { id: 'taken-date', label: 'Added to garage', value: formatDate(vehicle.taken_date) },
  ]
  if (showOwner) {
    vehicleFields.push({
      id: 'owner',
      label: 'Owner',
      value: vehicle.owner_username || vehicle.user_id || 'Not set',
    })
  }

  return [
    {
      title: 'Vehicle',
      fields: vehicleFields,
    },
    {
      title: 'Service',
      fields: [
        { id: 'last-service-date', label: 'Last service', value: formatDate(vehicle.service?.last_service_date) },
        {
          id: 'last-service-mileage',
          label: 'Last mileage',
          value: vehicle.service?.last_service_km?.toLocaleString() ?? 'Not set',
        },
        { id: 'next-service-date', label: 'Next service', value: formatDate(vehicle.service?.next_service_date) },
        {
          id: 'next-service-mileage',
          label: 'Next service mileage',
          value: vehicle.service?.next_service_km?.toLocaleString() ?? 'Not set',
        },
      ],
    },
    {
      title: 'Registration & documents',
      fields: [
        { id: 'rc-owner', label: 'RC owner name', value: String(displayValue(vehicle.rc_owner_name)) },
        { id: 'chassis-number', label: 'Chassis number', value: String(displayValue(vehicle.chassis_no)) },
        { id: 'engine-number', label: 'Engine number', value: String(displayValue(vehicle.engine_no)) },
        { id: 'tax-validity', label: 'Tax valid up to', value: formatDate(vehicle.tax_valid_upto) },
        { id: 'registration-validity', label: 'Registration valid up to', value: formatDate(vehicle.registration_validity) },
        { id: 'last-pucc', label: 'Last check', value: formatDate(vehicle.pucc?.last_pucc_date) },
        { id: 'next-pucc', label: 'Next PUCC renewal', value: formatDate(vehicle.pucc?.next_pucc_date) },
        { id: 'policy-date', label: 'Policy date', value: formatDate(vehicle.insurance?.taken_date) },
        { id: 'insurance-renewal', label: 'Insurance renewal', value: formatDate(vehicle.insurance?.next_renewal_date) },
      ],
    },
    {
      title: 'Record',
      fields: [
        { id: 'uploaded-by', label: 'Uploaded by', value: String(displayValue(vehicle.uploaded_by)) },
        { id: 'uploaded-on', label: 'Uploaded on', value: formatDate(vehicle.uploaded_date) },
      ],
    },
    {
      title: 'Photos',
      fields: images.map((image, index) => ({
        id: `photo-${index + 1}`,
        label: `Photo ${index + 1}`,
        value: 'Include photo',
        imageUrl: image.url,
      })),
    },
  ].filter((section) => section.fields.length > 0)
}