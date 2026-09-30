import { displayValue, formatDate, getDueMessage, getVehicleStatus } from '../lib/vehicle'
import type { Vehicle } from '../types/vehicle'
import './VehicleList.css'

interface VehicleListProps {
  vehicles: Vehicle[]
  query: string
  expandedVehicleId: string | null
  deleteBusy: boolean
  onToggleExpanded: (vehicleId: string) => void
  onEdit: (vehicle: Vehicle) => void
  onDelete: (vehicle: Vehicle) => void
}

function VehicleList({
  vehicles,
  query,
  expandedVehicleId,
  deleteBusy,
  onToggleExpanded,
  onEdit,
  onDelete,
}: VehicleListProps) {
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
        const documents = [
          { label: 'Insurance', date: vehicle.insurance?.next_renewal_date },
          { label: 'PUCC', date: vehicle.pucc?.next_pucc_date },
        ]
          .filter((document): document is { label: string; date: string } => Boolean(document.date))
          .sort((first, second) => first.date.localeCompare(second.date))
        const nextDocument = documents[0]
        const images = vehicle.images ?? []
        const isExpanded = expandedVehicleId === vehicle.id
        const detailsId = `details-${vehicle.id}`

        return (
          <article className="vehicle-row" key={vehicle.id} role="listitem">
            <div className="vehicle-main">
              <span className="vehicle-id">{vehicle.vehicle_number || vehicle.id}</span>
              <h2>{vehicleName}</h2>
              <p>
                {[vehicle.company, vehicle.model].filter(Boolean).join(' ') || 'Vehicle details not set'}
                {vehicle.year ? <> <span>·</span> {vehicle.year}</> : null}
              </p>
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
              <div className="detail-group">
                <h3>Vehicle</h3>
                <dl>
                  <div><dt>Vehicle number</dt><dd>{displayValue(vehicle.vehicle_number)}</dd></div>
                  <div><dt>Record ID</dt><dd>{vehicle.id}</dd></div>
                  <div><dt>Make</dt><dd>{displayValue(vehicle.company)}</dd></div>
                  <div><dt>Model</dt><dd>{displayValue(vehicle.model)}</dd></div>
                  <div><dt>Year</dt><dd>{displayValue(vehicle.year)}</dd></div>
                  <div><dt>Added to garage</dt><dd>{formatDate(vehicle.taken_date)}</dd></div>
                </dl>
              </div>
              <div className="detail-group">
                <h3>Service</h3>
                <dl>
                  <div><dt>Last service</dt><dd>{formatDate(vehicle.service?.last_service_date)}</dd></div>
                  <div><dt>Last mileage</dt><dd>{vehicle.service?.last_service_km?.toLocaleString() ?? 'Not set'}{vehicle.service?.last_service_km == null ? '' : ' km'}</dd></div>
                  <div><dt>Next service</dt><dd>{formatDate(vehicle.service?.next_service_date)}</dd></div>
                  <div><dt>Next service mileage</dt><dd>{vehicle.service?.next_service_km?.toLocaleString() ?? 'Not set'}{vehicle.service?.next_service_km == null ? '' : ' km'}</dd></div>
                </dl>
              </div>
              <div className="detail-group">
                <h3>PUCC</h3>
                <dl>
                  <div><dt>Last check</dt><dd>{formatDate(vehicle.pucc?.last_pucc_date)}</dd></div>
                  <div><dt>Next renewal</dt><dd>{formatDate(vehicle.pucc?.next_pucc_date)}</dd></div>
                </dl>
              </div>
              <div className="detail-group">
                <h3>Insurance</h3>
                <dl>
                  <div><dt>Policy date</dt><dd>{formatDate(vehicle.insurance?.taken_date)}</dd></div>
                  <div><dt>Next renewal</dt><dd>{formatDate(vehicle.insurance?.next_renewal_date)}</dd></div>
                </dl>
              </div>
              <div className="detail-group record-details">
                <h3>Record</h3>
                <dl>
                  <div><dt>Uploaded by</dt><dd>{displayValue(vehicle.uploaded_by)}</dd></div>
                  <div><dt>Uploaded on</dt><dd>{formatDate(vehicle.uploaded_date)}</dd></div>
                </dl>
              </div>
              <div className="detail-group image-details">
                <h3>Images <span>({images.length})</span></h3>
                {images.length > 0 ? (
                  <ul>
                    {images.map((image, index) => (
                      <li key={image}>
                        <a href={image} target="_blank" rel="noreferrer">
                          View image {index + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : <p>No images</p>}
              </div>
            </section>
          </article>
        )
      })}
    </div>
  )
}

export default VehicleList
