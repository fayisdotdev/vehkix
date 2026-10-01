import type { Vehicle, VehicleDraft } from '../types/vehicle'

const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

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

export function getNextDue(vehicle: Vehicle) {
  return [
    { label: 'Service', date: vehicle.service?.next_service_date },
    { label: 'PUCC', date: vehicle.pucc?.next_pucc_date },
    { label: 'Insurance', date: vehicle.insurance?.next_renewal_date },
    { label: 'Tax', date: vehicle.tax_valid_upto },
    { label: 'Registration', date: vehicle.registration_validity },
  ]
    .filter((item): item is { label: string; date: string } => Boolean(item.date))
    .map((item) => ({ ...item, days: daysUntil(item.date) }))
    .sort((first, second) => first.days - second.days)[0] ?? null
}

export function getVehicleStatus(vehicle: Vehicle) {
  const nearestDue = getNextDue(vehicle)

  if (!nearestDue) return { label: 'No due date', className: 'no-date' }
  if (nearestDue.days < 0) return { label: 'Overdue', className: 'overdue' }
  if (nearestDue.days <= 10) return { label: 'Due soon', className: 'due-soon' }
  return { label: 'On track', className: 'on-track' }
}

export function getDueMessage(vehicle: Vehicle) {
  const nextDue = getNextDue(vehicle)
  if (!nextDue || nextDue.days > 10) return null
  if (nextDue.days < 0) return `${nextDue.label} overdue by ${Math.abs(nextDue.days)} days`
  if (nextDue.days === 0) return `${nextDue.label} due today`
  return `${nextDue.label} due in ${nextDue.days} days`
}

export function displayValue(value?: string | number | null) {
  return value === undefined || value === null || value === '' ? 'Not set' : value
}

export function toVehicleDraft(vehicle: Vehicle): VehicleDraft {
  return {
    vehicle_number: vehicle.vehicle_number ?? '',
    name: vehicle.name ?? '',
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
