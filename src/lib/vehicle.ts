import type { Vehicle, VehicleDraft } from '../types/vehicle'
import type { VehicleFieldKey } from './vehicleSettings'

const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

interface UpcomingDocument {
  id: VehicleFieldKey
  summaryLabel: string
  label: string
  date?: string | null
}

function parseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function normalizeVehicle(vehicle: Vehicle): Vehicle {
  return {
    ...vehicle,
    service: vehicle.service ?? {
      last_service_date: vehicle.last_service_date,
      last_service_km: vehicle.last_service_km,
      next_service_date: vehicle.next_service_date,
      next_service_km: vehicle.next_service_km,
    },
    pucc: vehicle.pucc ?? {
      last_pucc_date: vehicle.last_pucc_date,
      next_pucc_date: vehicle.next_pucc_date,
    },
    insurance: vehicle.insurance ?? {
      taken_date: vehicle.insurance_taken_date,
      next_renewal_date: vehicle.insurance_next_renewal_date,
    },
  }
}

export function formatDate(value?: string | null) {
  const date = parseDate(value)
  return date ? dateFormatter.format(date) : 'Not set'
}

export function daysUntil(value?: string | null) {
  const date = parseDate(value)
  if (!date) return Number.POSITIVE_INFINITY

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((date.getTime() - today.getTime()) / 86400000)
}

export function getDueItems(vehicle: Vehicle, visibleFields?: Set<VehicleFieldKey>) {
  const items: { field: VehicleFieldKey; label: string; date?: string | null }[] = [
    { field: 'next_service_date', label: 'Service', date: vehicle.service?.next_service_date },
    { field: 'next_pucc_date', label: 'PUCC', date: vehicle.pucc?.next_pucc_date },
    { field: 'insurance_next_renewal_date', label: 'Insurance', date: vehicle.insurance?.next_renewal_date },
    { field: 'tax_valid_upto', label: 'Tax', date: vehicle.tax_valid_upto },
    { field: 'registration_validity', label: 'Registration', date: vehicle.registration_validity },
  ]

  return items
    .filter((item): item is { field: VehicleFieldKey; label: string; date: string } => (
      Boolean(item.date) && (!visibleFields || visibleFields.has(item.field))
    ))
    .map((item) => ({ ...item, days: daysUntil(item.date) }))
    .sort((first, second) => first.days - second.days)
}

export function getUpcomingDocuments(vehicle: Vehicle) {
  return [
    {
      id: 'insurance_next_renewal_date',
      summaryLabel: 'Insurance renewal',
      label: 'Insurance renewal',
      date: vehicle.insurance?.next_renewal_date,
    },
    {
      id: 'next_pucc_date',
      summaryLabel: 'PUCC renewal',
      label: 'Next PUCC renewal',
      date: vehicle.pucc?.next_pucc_date,
    },
    {
      id: 'tax_valid_upto',
      summaryLabel: 'Tax validity',
      label: 'Tax valid up to',
      date: vehicle.tax_valid_upto,
    },
    {
      id: 'registration_validity',
      summaryLabel: 'Registration validity',
      label: 'Registration valid up to',
      date: vehicle.registration_validity,
    },
  ]
    .filter((document): document is UpcomingDocument & { date: string } => Boolean(document.date))
    .sort((first, second) => first.date.localeCompare(second.date))
}

export function getNextDue(vehicle: Vehicle, visibleFields?: Set<VehicleFieldKey>) {
  return getDueItems(vehicle, visibleFields)[0] ?? null
}

export function getVehicleStatus(vehicle: Vehicle, visibleFields?: Set<VehicleFieldKey>) {
  const nearestDue = getNextDue(vehicle, visibleFields)

  if (!nearestDue) return { label: 'No due date', className: 'no-date' }
  if (nearestDue.days < 0) return { label: 'Overdue', className: 'overdue' }
  if (nearestDue.days <= 10) return { label: 'Due soon', className: 'due-soon' }
  return { label: 'On track', className: 'on-track' }
}

export function getDueMessage(vehicle: Vehicle, visibleFields?: Set<VehicleFieldKey>) {
  const nextDue = getNextDue(vehicle, visibleFields)
  if (!nextDue || nextDue.days > 10) return null
  if (nextDue.days < 0) return `${nextDue.label} overdue by ${Math.abs(nextDue.days)} days`
  if (nextDue.days === 0) return `${nextDue.label} due today`
  if (nextDue.days === 1) return `${nextDue.label} due in 1 day`
  return `${nextDue.label} due in ${nextDue.days} days`
}

export function displayValue(value?: string | number | null) {
  return value === undefined || value === null || value === '' ? 'Not set' : value
}

export function getVehicleName(company?: string | null, model?: string | null) {
  return [company, model].filter(Boolean).join(' ') || 'Unnamed vehicle'
}

export function formatMileage(value?: number | null) {
  return value == null ? 'Not set' : `${value.toLocaleString()} km`
}

export function toVehicleDraft(vehicle: Vehicle): VehicleDraft {
  return {
    vehicle_number: vehicle.vehicle_number ?? '',
    name: getVehicleName(vehicle.company, vehicle.model),
    model: vehicle.model ?? '',
    company: vehicle.company ?? '',
    year: vehicle.year == null ? '' : String(vehicle.year),
    taken_date: vehicle.taken_date ?? '',
    last_service_date: vehicle.service?.last_service_date ?? '',
    last_service_km: vehicle.service?.last_service_km == null ? '' : String(vehicle.service.last_service_km),
    next_service_date: vehicle.service?.next_service_date ?? '',
    next_service_km: vehicle.service?.next_service_km == null ? '' : String(vehicle.service.next_service_km),
    last_pucc_date: vehicle.pucc?.last_pucc_date ?? '',
    next_pucc_date: vehicle.pucc?.next_pucc_date ?? '',
    insurance_taken_date: vehicle.insurance?.taken_date ?? '',
    insurance_next_renewal_date: vehicle.insurance?.next_renewal_date ?? '',
    rc_owner_name: vehicle.rc_owner_name ?? '',
    chassis_no: vehicle.chassis_no ?? '',
    engine_no: vehicle.engine_no ?? '',
    tax_valid_upto: vehicle.tax_valid_upto ?? '',
    registration_validity: vehicle.registration_validity ?? '',
  }
}
