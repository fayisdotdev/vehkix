import { useState } from 'react'
import { displayValue, formatDate, getDueItems, getDueMessage, getVehicleStatus } from '../lib/vehicle'
import type { ExistingVehicleImage, Vehicle } from '../types/vehicle'
import './VehicleList.css'

interface VehicleListProps {
  vehicles: Vehicle[]
  query: string
  expandedVehicleId: string | null
  deleteBusy: boolean
  showOwner?: boolean
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
  onToggleExpanded,
  onEdit,
  onDelete,
}: VehicleListProps) {
  const [imageIndices, setImageIndices] = useState<Record<string, number>>({})

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
        const vehicleName = vehicle.name || 'Unnamed vehicle'
        const status = getVehicleStatus(vehicle)
        const dueMessage = getDueMessage(vehicle)
        const dueItems = getDueItems(vehicle).filter((item) => item.days <= 10)
        const documents = [
          { label: 'Insurance', date: vehicle.insurance?.next_renewal_date },
          { label: 'PUCC', date: vehicle.pucc?.next_pucc_date },
          { label: 'Tax', date: vehicle.tax_valid_upto },
          { label: 'Registration', date: vehicle.registration_validity },
        ]
          .filter((document): document is { label: string; date: string } => Boolean(document.date))
          .sort((first, second) => first.date.localeCompare(second.date))
        const nextDocument = documents[0]
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

        return (
          <article className="vehicle-row" key={vehicle.id} role="listitem">
            <div className="vehicle-cover">
              {carouselImages.length > 0 ? (
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
                <span className="vehicle-cover-empty">No image</span>
              )}
            </div>
            <div className="vehicle-main">
              <span className="vehicle-id">{vehicle.vehicle_number || vehicle.id}</span>
              <h2>{vehicleName}</h2>
              <p>
                {[vehicle.company, vehicle.model].filter(Boolean).join(' ') || 'Vehicle details not set'}
                {vehicle.year ? <> <span>·</span> {vehicle.year}</> : null}
              </p>
              {showOwner && <span className="vehicle-owner">Owner · {vehicle.owner_username || vehicle.user_id}</span>}
            </div>
            <div className="vehicle-detail">
              <span className="detail-label">NEXT SERVICE</span>
              <strong>{formatDate(vehicle.service?.next_service_date)}</strong>
              <span>
                {vehicle.service?.next_service_km == null
                  ? 'Mileage not set'
                  : `${vehicle.service.next_service_km.toLocaleString()} km`}
              </span>
            </div>
            <div className="vehicle-detail document-detail">
              <span className="detail-label">NEXT DOCUMENT</span>
              <strong>{formatDate(nextDocument?.date)}</strong>
              <span>{nextDocument ? `${nextDocument.label} renewal` : 'No renewal date'}</span>
            </div>
            <div className="status-cell">
              <span className={`status ${status.className}`}>
                <span className="status-dot" />{status.label}
              </span>
              {dueMessage && <span className={`due-countdown ${status.className}`}>{dueMessage}</span>}
            </div>
            <div className="row-actions">
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
              <div className="detail-group due-info-group">
                <h3>Due within 10 days</h3>
                {dueItems.length > 0 ? (
                  <dl>
                    {dueItems.map(({ label, date, days }) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>
                          {formatDate(date)}
                          <span className={days < 0 ? 'overdue' : 'upcoming'}>
                            {days < 0
                              ? ` · ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} overdue`
                              : days === 0 ? ' · Due today' : days === 1 ? ' · Due in 1 day' : ` · Due in ${days} days`}
                          </span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p>No items due within 10 days.</p>
                )}
              </div>
              <div className="detail-group vehicle-info-group">
                <h3>Vehicle</h3>
                <dl>
                  <div><dt>Vehicle number</dt><dd>{displayValue(vehicle.vehicle_number)}</dd></div>
                  <div><dt>Record ID</dt><dd>{vehicle.id}</dd></div>
                  <div><dt>Make</dt><dd>{displayValue(vehicle.company)}</dd></div>
                  <div><dt>Model</dt><dd>{displayValue(vehicle.model)}</dd></div>
                  <div><dt>Year</dt><dd>{displayValue(vehicle.year)}</dd></div>
                  <div><dt>Added to garage</dt><dd>{formatDate(vehicle.taken_date)}</dd></div>
                  {showOwner && <div><dt>Owner</dt><dd>{vehicle.owner_username || vehicle.user_id}</dd></div>}
                </dl>
              </div>
              <div className="detail-group service-info-group">
                <h3>Service</h3>
                <dl>
                  <div><dt>Last service</dt><dd>{formatDate(vehicle.service?.last_service_date)}</dd></div>
                  <div><dt>Last mileage</dt><dd>{vehicle.service?.last_service_km?.toLocaleString() ?? 'Not set'}{vehicle.service?.last_service_km == null ? '' : ' km'}</dd></div>
                  <div><dt>Next service</dt><dd>{formatDate(vehicle.service?.next_service_date)}</dd></div>
                  <div><dt>Next service mileage</dt><dd>{vehicle.service?.next_service_km?.toLocaleString() ?? 'Not set'}{vehicle.service?.next_service_km == null ? '' : ' km'}</dd></div>
                </dl>
              </div>
              <div className="detail-group paperwork-info-group">
                <h3>Registration &amp; documents</h3>
                <dl>
                  <div><dt>RC owner name</dt><dd>{displayValue(vehicle.rc_owner_name)}</dd></div>
                  <div><dt>Chassis number</dt><dd>{displayValue(vehicle.chassis_no)}</dd></div>
                  <div><dt>Engine number</dt><dd>{displayValue(vehicle.engine_no)}</dd></div>
                  <div><dt>Tax valid up to</dt><dd>{formatDate(vehicle.tax_valid_upto)}</dd></div>
                  <div><dt>Registration valid up to</dt><dd>{formatDate(vehicle.registration_validity)}</dd></div>
                  <div><dt>Last check</dt><dd>{formatDate(vehicle.pucc?.last_pucc_date)}</dd></div>
                  <div><dt>Next PUCC renewal</dt><dd>{formatDate(vehicle.pucc?.next_pucc_date)}</dd></div>
                  <div><dt>Policy date</dt><dd>{formatDate(vehicle.insurance?.taken_date)}</dd></div>
                  <div><dt>Insurance renewal</dt><dd>{formatDate(vehicle.insurance?.next_renewal_date)}</dd></div>
                </dl>
              </div>
              <div className="detail-group record-info-group">
                <h3>Record</h3>
                <dl>
                  <div><dt>Uploaded by</dt><dd>{displayValue(vehicle.uploaded_by)}</dd></div>
                  <div><dt>Uploaded on</dt><dd>{formatDate(vehicle.uploaded_date)}</dd></div>
                </dl>
              </div>
              <div className="detail-group photo-info-group">
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
              </div>
            </section>
          </article>
        )
      })}
    </div>
  )
}

export default VehicleList
