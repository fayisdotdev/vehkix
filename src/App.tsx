import { useState } from 'react'
import vehicles from '../data/data.json'
import './App.css'

type Vehicle = (typeof vehicles)[number]

const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(value: string) {
  return dateFormatter.format(parseDate(value))
}

function daysUntil(value: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((parseDate(value).getTime() - today.getTime()) / 86400000)
}

function getVehicleStatus(vehicle: Vehicle) {
  const dueDates = [
    vehicle.service.next_service_date,
    vehicle.pucc.next_pucc_date,
    vehicle.insurance.next_renewal_date,
  ]
  const nearestDue = Math.min(...dueDates.map(daysUntil))

  if (nearestDue < 0) return { label: 'Overdue', className: 'overdue' }
  if (nearestDue <= 30) return { label: 'Due soon', className: 'due-soon' }
  return { label: 'On track', className: 'on-track' }
}

function App() {
  const [query, setQuery] = useState('')
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null)
  const filteredVehicles = vehicles.filter((vehicle) =>
    [vehicle.id, vehicle.name, vehicle.model, vehicle.company]
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )
  const attentionCount = vehicles.filter((vehicle) => {
    const nextDue = Math.min(
      daysUntil(vehicle.service.next_service_date),
      daysUntil(vehicle.pucc.next_pucc_date),
      daysUntil(vehicle.insurance.next_renewal_date),
    )
    return nextDue <= 30
  }).length

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Vehkix home">
          vehkix<span>.</span>
        </a>
        <span className="topbar-label">VEHICLE REGISTER</span>
      </header>

      <section className="fleet" id="top" aria-labelledby="page-title">
        <div className="page-heading">
          <div>
            <p className="eyebrow">YOUR GARAGE</p>
            <h1 id="page-title">Vehicles</h1>
          </div>
          <div className="summary" aria-label="Fleet summary">
            <div className="summary-item">
              <strong>{String(vehicles.length).padStart(2, '0')}</strong>
              <span>vehicles</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-item">
              <strong>{String(attentionCount).padStart(2, '0')}</strong>
              <span>need attention</span>
            </div>
          </div>
        </div>

        <label className="search-box">
          <span className="search-icon" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search vehicles"
            aria-label="Search vehicles"
          />
          <span className="result-count">{filteredVehicles.length} shown</span>
        </label>

        <div className="vehicle-list" role="list" aria-label="Vehicles">
          {filteredVehicles.map((vehicle) => {
            const status = getVehicleStatus(vehicle)
            const documents = [
              { label: 'Insurance', date: vehicle.insurance.next_renewal_date },
              { label: 'PUCC', date: vehicle.pucc.next_pucc_date },
            ].sort((first, second) => first.date.localeCompare(second.date))
            const isExpanded = expandedVehicleId === vehicle.id
            const detailsId = `details-${vehicle.id}`

            return (
              <article className="vehicle-row" key={vehicle.id} role="listitem">
                <div className="vehicle-main">
                  <span className="vehicle-id">{vehicle.id}</span>
                  <h2>{vehicle.name}</h2>
                  <p>{vehicle.company} {vehicle.model} <span>·</span> {vehicle.year}</p>
                </div>
                <div className="vehicle-detail">
                  <span className="detail-label">NEXT SERVICE</span>
                  <strong>{formatDate(vehicle.service.next_service_date)}</strong>
                  <span>{vehicle.service.next_service_km.toLocaleString()} km</span>
                </div>
                <div className="vehicle-detail document-detail">
                  <span className="detail-label">NEXT DOCUMENT</span>
                  <strong>{formatDate(documents[0].date)}</strong>
                  <span>{documents[0].label} renewal</span>
                </div>
                <span className={`status ${status.className}`}>
                  <span className="status-dot" />{status.label}
                </span>
                <div className="row-actions">
                  <button
                    className="details-toggle"
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={detailsId}
                    onClick={() => setExpandedVehicleId(isExpanded ? null : vehicle.id)}
                  >
                    <span className="expand-icon" aria-hidden="true" />
                    {isExpanded ? 'Hide details' : 'View details'}
                  </button>
                </div>
                <section
                  className="expanded-details"
                  id={detailsId}
                  aria-label={`${vehicle.name} details`}
                  hidden={!isExpanded}
                >
                    <div className="detail-group">
                      <h3>Vehicle</h3>
                      <dl>
                        <div><dt>Make</dt><dd>{vehicle.company}</dd></div>
                        <div><dt>Model</dt><dd>{vehicle.model}</dd></div>
                        <div><dt>Year</dt><dd>{vehicle.year}</dd></div>
                        <div><dt>Added to garage</dt><dd>{formatDate(vehicle.taken_date)}</dd></div>
                      </dl>
                    </div>
                    <div className="detail-group">
                      <h3>Service</h3>
                      <dl>
                        <div><dt>Last service</dt><dd>{formatDate(vehicle.service.last_service_date)}</dd></div>
                        <div><dt>Last mileage</dt><dd>{vehicle.service.last_service_km.toLocaleString()} km</dd></div>
                        <div><dt>Next service</dt><dd>{formatDate(vehicle.service.next_service_date)}</dd></div>
                        <div><dt>Next service mileage</dt><dd>{vehicle.service.next_service_km.toLocaleString()} km</dd></div>
                      </dl>
                    </div>
                    <div className="detail-group">
                      <h3>PUCC</h3>
                      <dl>
                        <div><dt>Last check</dt><dd>{formatDate(vehicle.pucc.last_pucc_date)}</dd></div>
                        <div><dt>Next renewal</dt><dd>{formatDate(vehicle.pucc.next_pucc_date)}</dd></div>
                      </dl>
                    </div>
                    <div className="detail-group">
                      <h3>Insurance</h3>
                      <dl>
                        <div><dt>Policy date</dt><dd>{formatDate(vehicle.insurance.taken_date)}</dd></div>
                        <div><dt>Next renewal</dt><dd>{formatDate(vehicle.insurance.next_renewal_date)}</dd></div>
                      </dl>
                    </div>
                    <div className="detail-group record-details">
                      <h3>Record</h3>
                      <dl>
                        <div><dt>Uploaded by</dt><dd>{vehicle.uploaded_by}</dd></div>
                        <div><dt>Uploaded on</dt><dd>{formatDate(vehicle.uploaded_date)}</dd></div>
                      </dl>
                    </div>
                    <div className="detail-group image-details">
                      <h3>Images <span>({vehicle.images.length})</span></h3>
                      <ul>
                        {vehicle.images.map((image, index) => (
                          <li key={image}>
                            <a href={image} target="_blank" rel="noreferrer">
                              View image {index + 1}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                </section>
              </article>
            )
          })}
          {filteredVehicles.length === 0 && (
            <p className="empty-state">No vehicles match “{query}”.</p>
          )}
        </div>
        <footer className="list-footer">
          <span>Showing {filteredVehicles.length} of {vehicles.length} vehicles</span>
          <span>Updated {formatDate(vehicles[0].uploaded_date)}</span>
        </footer>
      </section>
    </main>
  )
}

export default App
