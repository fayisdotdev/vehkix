import { useState, type ReactNode } from 'react'
import { displayValue, formatDate, formatMileage, getDueMessage, getUpcomingDocuments, getVehicleName, getVehicleStatus } from '../lib/vehicle'
import type { ExistingVehicleImage, Vehicle } from '../types/vehicle'
import type { VehicleFieldKey, VehicleFieldSettings } from '../lib/vehicleSettings'
import VehicleShareDialog from './VehicleShareDialog'
import { createShareSections } from './vehicleShare'
import './VehicleList.css'

interface VehicleListProps {
  vehicles: Vehicle[]
  query: string
  expandedVehicleId: string | null
  deleteBusy: boolean
  showOwner?: boolean
  userId: string
  fieldSettings: VehicleFieldSettings
  onToggleExpanded: (vehicleId: string) => void
  onEdit: (vehicle: Vehicle) => void
  onDelete: (vehicle: Vehicle) => void
}

function VehicleList({
  vehicles,
  query,
  expandedVehicleId,
  deleteBusy,
  showOwner = false,
  userId,
  fieldSettings,
  onToggleExpanded,
  onEdit,
  onDelete,
}: VehicleListProps) {
  const [imageIndices, setImageIndices] = useState<Record<string, number>>({})
  const [sharingVehicleId, setSharingVehicleId] = useState<string | null>(null)
  const visibleDetailFields = new Set(
    Object.values(fieldSettings)
      .filter((setting) => setting.show_in_details)
      .map((setting) => setting.field_key),
  )

  if (vehicles.length === 0) {
    return (
      <p className="empty-state">
        {query.trim()
          ? <>No vehicles match “{query}”.</>
          : 'Your private collection is empty.'}
      </p>
    )
  }

  return (
    <div className="vehicle-list" role="list" aria-label="My vehicles">
      {vehicles.map((vehicle) => {
        const vehicleName = getVehicleName(
          fieldSettings.company.show_in_details ? vehicle.company : null,
          fieldSettings.model.show_in_details ? vehicle.model : null,
        )
        const status = getVehicleStatus(vehicle, visibleDetailFields)
        const dueMessage = getDueMessage(vehicle, visibleDetailFields)
        const visibleDocuments = getUpcomingDocuments(vehicle)
          .filter((document) => fieldSettings[document.id].show_in_details)
        const [nextDocument] = visibleDocuments
        const images = vehicle.images ?? []
        const carouselImages = vehicle.signed_images?.filter(
          (image): image is ExistingVehicleImage & { url: string } => Boolean(image.url),
        ) ?? images.map((url, index) => ({
          path: vehicle.image_paths?.[index] ?? String(index),
          url,
        }))
        const carouselKey = `${vehicle.id}:${vehicle.primary_image ?? ''}`
        const primaryImageIndex = Math.max(
          0,
          carouselImages.findIndex((image) => image.path === vehicle.primary_image),
        )
        const activeImageIndex = Math.min(
          imageIndices[carouselKey] ?? primaryImageIndex,
          Math.max(0, carouselImages.length - 1),
        )
        const isExpanded = expandedVehicleId === vehicle.id
        const detailsId = `details-${vehicle.id}`
        const detailField = (key: VehicleFieldKey, label: string, value: ReactNode) => (
          fieldSettings[key].show_in_details && <div key={key}><dt>{label}</dt><dd>{value}</dd></div>
        )

        return (
          <article className="vehicle-row" key={vehicle.id} role="listitem">
            <div className="vehicle-cover">
              {fieldSettings.images.show_in_details && carouselImages.length > 0 ? (
                <>
                  <img src={carouselImages[activeImageIndex].url} alt={`${vehicleName} vehicle`} />
                  {carouselImages.length > 1 && (
                    <>
                      <button
                        className="carousel-control previous"
                        type="button"
                        aria-label={`Previous ${vehicleName} image`}
                        onClick={() => setImageIndices((current) => ({
                          ...current,
                          [carouselKey]: (activeImageIndex - 1 + carouselImages.length) % carouselImages.length,
                        }))}
                      >
                        <span aria-hidden="true" />
                      </button>
                      <button
                        className="carousel-control next"
                        type="button"
                        aria-label={`Next ${vehicleName} image`}
                        onClick={() => setImageIndices((current) => ({
                          ...current,
                          [carouselKey]: (activeImageIndex + 1) % carouselImages.length,
                        }))}
                      >
                        <span aria-hidden="true" />
                      </button>
                      <span className="carousel-count" aria-live="polite">
                        {activeImageIndex + 1} / {carouselImages.length}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span className="vehicle-cover-empty">
                  {fieldSettings.images.show_in_details ? 'No image' : 'Photo hidden'}
                </span>
              )}
            </div>
            <div className="vehicle-main">
              {fieldSettings.vehicle_number.show_in_details && (
                <span className="vehicle-id">{displayValue(vehicle.vehicle_number)}</span>
              )}
              {fieldSettings.vehicle_title.show_in_details && <h2>{vehicleName}</h2>}
              <p>
                {[
                  fieldSettings.company.show_in_details ? vehicle.company : null,
                  fieldSettings.model.show_in_details ? vehicle.model : null,
                ].filter(Boolean).join(' ') || 'Vehicle details not set'}
                {fieldSettings.year.show_in_details && vehicle.year ? <> <span>·</span> {vehicle.year}</> : null}
              </p>
                {showOwner && fieldSettings.owner_username.show_in_details && (
                  <span className="vehicle-owner">Owner · {vehicle.owner_username || vehicle.user_id}</span>
                )}
            </div>
            {(fieldSettings.next_service_date.show_in_details || fieldSettings.next_service_km.show_in_details) && <div className="vehicle-detail">
              <span className="detail-label">NEXT SERVICE</span>
              {fieldSettings.next_service_date.show_in_details && <strong>{formatDate(vehicle.service?.next_service_date)}</strong>}
              <span>
                {fieldSettings.next_service_km.show_in_details
                  ? formatMileage(vehicle.service?.next_service_km)
                  : ''}
              </span>
            </div>}
            {visibleDocuments.length > 0 && <div className="vehicle-detail document-detail">
              <span className="detail-label">NEXT DOCUMENT</span>
              <strong>{formatDate(nextDocument?.date)}</strong>
              <span>{nextDocument.summaryLabel}</span>
            </div>}
            <div className="status-cell">
              <span className={`status ${status.className}`}>
                <span className="status-dot" />{status.label}
              </span>
              {dueMessage && <span className={`due-countdown ${status.className}`}>{dueMessage}</span>}
            </div>
            <div className="row-actions">
              <button className="text-action" type="button" onClick={() => setSharingVehicleId(vehicle.id)}>
                Share
              </button>
              <button className="text-action" type="button" onClick={() => onEdit(vehicle)}>
                Edit
              </button>
              <button
                className="text-action delete-action"
                type="button"
                disabled={deleteBusy}
                onClick={() => {
                  if (window.confirm(`Delete ${vehicleName} and its uploaded images? This cannot be undone.`)) {
                    onDelete(vehicle)
                  }
                }}
              >
                Delete
              </button>
              <button
                className="details-toggle"
                type="button"
                aria-expanded={isExpanded}
                aria-controls={detailsId}
                onClick={() => onToggleExpanded(vehicle.id)}
              >
                <span className="expand-icon" aria-hidden="true" />
                {isExpanded ? 'Hide details' : 'View details'}
              </button>
            </div>
            <section
              className="expanded-details"
              id={detailsId}
              aria-label={`${vehicleName} details`}
              hidden={!isExpanded}
            >
              <div className="detail-group vehicle-info-group">
                <h3>Vehicle</h3>
                <dl>
                  {detailField('vehicle_title', 'Vehicle title', vehicleName)}
                  {detailField('vehicle_number', 'Vehicle number', displayValue(vehicle.vehicle_number))}
                  {detailField('company', 'Make', displayValue(vehicle.company))}
                  {detailField('model', 'Model', displayValue(vehicle.model))}
                  {detailField('year', 'Year', displayValue(vehicle.year))}
                  {detailField('taken_date', 'Added to garage', formatDate(vehicle.taken_date))}
                    {showOwner && fieldSettings.owner_username.show_in_details && (
                      <div><dt>Owner</dt><dd>{vehicle.owner_username || vehicle.user_id}</dd></div>
                    )}
                  {detailField('id', 'Record ID', vehicle.id)}
                </dl>
              </div>
              {(fieldSettings.next_service_date.show_in_details || fieldSettings.next_service_km.show_in_details || fieldSettings.last_service_date.show_in_details || fieldSettings.last_service_km.show_in_details) && <div className="detail-group service-info-group">
                <h3>Service</h3>
                <dl>
                  {detailField('next_service_date', 'Next service', formatDate(vehicle.service?.next_service_date))}
                  {detailField('next_service_km', 'Next service mileage', formatMileage(vehicle.service?.next_service_km))}
                  {detailField('last_service_date', 'Last service', formatDate(vehicle.service?.last_service_date))}
                  {detailField('last_service_km', 'Last mileage', formatMileage(vehicle.service?.last_service_km))}
                </dl>
              </div>}
              {(visibleDocuments.length > 0 || fieldSettings.rc_owner_name.show_in_details || fieldSettings.chassis_no.show_in_details || fieldSettings.engine_no.show_in_details || fieldSettings.last_pucc_date.show_in_details || fieldSettings.insurance_taken_date.show_in_details) && <div className="detail-group paperwork-info-group">
                <h3>Registration &amp; documents</h3>
                <dl>
                  {getUpcomingDocuments(vehicle).map((document) => (
                    detailField(document.id, document.label, formatDate(document.date))
                  ))}
                  {detailField('rc_owner_name', 'RC owner name', displayValue(vehicle.rc_owner_name))}
                  {detailField('chassis_no', 'Chassis number', displayValue(vehicle.chassis_no))}
                  {detailField('engine_no', 'Engine number', displayValue(vehicle.engine_no))}
                  {detailField('last_pucc_date', 'Last check', formatDate(vehicle.pucc?.last_pucc_date))}
                  {detailField('insurance_taken_date', 'Policy date', formatDate(vehicle.insurance?.taken_date))}
                </dl>
              </div>}
              {fieldSettings.images.show_in_details && <div className="detail-group photo-info-group">
                <h3>Photos <span>({images.length})</span></h3>
                {images.length > 0 ? (
                  <ul className="detail-image-grid">
                    {images.map((image, index) => (
                      <li key={image}>
                        <a href={image} target="_blank" rel="noreferrer">
                          <img src={image} alt={`${vehicleName}, photo ${index + 1}`} loading="lazy" />
                          <span>Photo {index + 1}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : <p>No photos have been added.</p>}
              </div>}
              {(fieldSettings.uploaded_by.show_in_details || fieldSettings.uploaded_date.show_in_details) && <div className="detail-group record-info-group">
                <h3>Record</h3>
                <dl>
                  {detailField('uploaded_by', 'Uploaded by', displayValue(vehicle.uploaded_by))}
                  {detailField('uploaded_date', 'Uploaded on', formatDate(vehicle.uploaded_date))}
                </dl>
              </div>}
            </section>
              {sharingVehicleId === vehicle.id && (
                <VehicleShareDialog
                  sections={createShareSections(vehicle, showOwner, carouselImages, fieldSettings)}
                  userId={userId}
                  onClose={() => setSharingVehicleId(null)}
                />
              )}
          </article>
        )
      })}
    </div>
  )
}

export default VehicleList
