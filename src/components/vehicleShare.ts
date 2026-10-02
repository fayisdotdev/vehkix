import { displayValue, formatDate, formatMileage, getUpcomingDocuments, getVehicleName } from '../lib/vehicle'
import type { Vehicle } from '../types/vehicle'
import { type VehicleFieldKey, type VehicleFieldSettings } from '../lib/vehicleSettings'

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

export function createShareSections(
  vehicle: Vehicle,
  showOwner: boolean,
  images: { url: string }[],
  settings: VehicleFieldSettings,
): ShareSection[] {
  const vehicleFields: ShareField[] = [
    { id: 'vehicle-number', label: 'Vehicle number', value: String(displayValue(vehicle.vehicle_number)) },
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
  vehicleFields.push({ id: 'record-id', label: 'Record ID', value: vehicle.id })

  return [
    {
      title: 'Vehicle',
      fields: [
          {
            id: 'vehicle-title',
            label: 'Vehicle title',
            value: getVehicleName(
              settings.company.allow_share ? vehicle.company : null,
              settings.model.allow_share ? vehicle.model : null,
            ),
          },
        ...vehicleFields,
      ],
    },
    {
      title: 'Service',
      fields: [
        { id: 'next-service-date', label: 'Next service', value: formatDate(vehicle.service?.next_service_date) },
        {
          id: 'next-service-mileage',
          label: 'Next service mileage',
          value: formatMileage(vehicle.service?.next_service_km),
        },
        { id: 'last-service-date', label: 'Last service', value: formatDate(vehicle.service?.last_service_date) },
        {
          id: 'last-service-mileage',
          label: 'Last mileage',
          value: formatMileage(vehicle.service?.last_service_km),
        },
      ],
    },
    {
      title: 'Registration & documents',
      fields: [
        ...getUpcomingDocuments(vehicle).map((document) => ({
          id: document.id,
          label: document.label,
          value: formatDate(document.date),
        })),
        { id: 'rc-owner', label: 'RC owner name', value: String(displayValue(vehicle.rc_owner_name)) },
        { id: 'chassis-number', label: 'Chassis number', value: String(displayValue(vehicle.chassis_no)) },
        { id: 'engine-number', label: 'Engine number', value: String(displayValue(vehicle.engine_no)) },
        { id: 'last-pucc', label: 'Last check', value: formatDate(vehicle.pucc?.last_pucc_date) },
        { id: 'policy-date', label: 'Policy date', value: formatDate(vehicle.insurance?.taken_date) },
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
    {
      title: 'Record',
      fields: [
        { id: 'uploaded-by', label: 'Uploaded by', value: String(displayValue(vehicle.uploaded_by)) },
        { id: 'uploaded-on', label: 'Uploaded on', value: formatDate(vehicle.uploaded_date) },
      ],
    },
  ]
    .map((section) => ({
      ...section,
      fields: section.fields.filter((field) => (
        field.value !== 'Not set'
        && settings[shareSettingKey(field.id)].allow_share
      )),
    }))
    .filter((section) => section.fields.length > 0)
}

const shareSettingKeys: Record<string, VehicleFieldKey> = {
  'vehicle-title': 'vehicle_title',
  'vehicle-number': 'vehicle_number',
  'record-id': 'id',
  owner: 'owner_username',
  make: 'company',
  model: 'model',
  year: 'year',
  'taken-date': 'taken_date',
  'last-service-date': 'last_service_date',
  'last-service-mileage': 'last_service_km',
  'next-service-date': 'next_service_date',
  'next-service-mileage': 'next_service_km',
  next_pucc_date: 'next_pucc_date',
  insurance_next_renewal_date: 'insurance_next_renewal_date',
  tax_valid_upto: 'tax_valid_upto',
  registration_validity: 'registration_validity',
  'last-pucc': 'last_pucc_date',
  'policy-date': 'insurance_taken_date',
  'rc-owner': 'rc_owner_name',
  'chassis-number': 'chassis_no',
  'engine-number': 'engine_no',
  'uploaded-by': 'uploaded_by',
  'uploaded-on': 'uploaded_date',
}

function shareSettingKey(fieldId: string): VehicleFieldKey {
  return fieldId.startsWith('photo-') ? 'images' : shareSettingKeys[fieldId]
}