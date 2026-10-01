import { useEffect, useRef, useState } from 'react'
import brandWordmark from '../../images/logo/vehkix-wordmark-color.png'
import { displayValue, formatDate, getDueMessage, getVehicleStatus } from '../lib/vehicle'
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

interface ShareField {
  id: string
  label: string
  value: string
  imageUrl?: string
}

interface ShareSection {
  title: string
  fields: ShareField[]
}

interface PrintDocument {
  vehicleName: string
  vehicleIdentifier: string
  sections: ShareSection[]
}

function createShareSections(vehicle: Vehicle, showOwner: boolean, images: { url: string }[]): ShareSection[] {
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

interface VehicleShareDialogProps {
  vehicleName: string
  vehicleIdentifier: string
  sections: ShareSection[]
  onClose: () => void
}

function VehicleShareDialog({ vehicleName, vehicleIdentifier, sections, onClose }: VehicleShareDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const allFieldIds = sections.flatMap((section) => section.fields.map((field) => field.id))
  const [selectedFieldIds, setSelectedFieldIds] = useState(allFieldIds)
  const [printDocument, setPrintDocument] = useState<PrintDocument | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    return () => dialog.close()
  }, [])

  useEffect(() => {
    if (!printDocument) return
    const previousTitle = document.title
    const finishPrint = () => onClose()
    document.title = printDocument.vehicleName
    document.body.classList.add('vehicle-printing')
    window.addEventListener('afterprint', finishPrint, { once: true })
    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.close()
      window.print()
    })

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('afterprint', finishPrint)
      document.body.classList.remove('vehicle-printing')
      document.title = previousTitle
    }
  }, [onClose, printDocument])

  function handlePrint() {
    setPrintDocument({
      vehicleName,
      vehicleIdentifier,
      sections: sections
        .map((section) => ({
          ...section,
          fields: section.fields.filter((field) => selectedFieldIds.includes(field.id)),
        }))
        .filter((section) => section.fields.length > 0),
    })
  }

  function requestExit() {
    setShowExitConfirm(true)
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        className="vehicle-share-dialog"
        aria-labelledby="vehicle-share-title"
        onCancel={(event) => { event.preventDefault(); requestExit() }}
        onClick={(event) => {
          if (event.target === event.currentTarget) requestExit()
        }}
      >
        <div className="vehicle-share-content">
          <header className="vehicle-share-heading">
            <p className="eyebrow">SHARE VEHICLE</p>
            <h2 id="vehicle-share-title">Choose details to include</h2>
            <p>Select the information for your print-ready copy. Choose “Save as PDF” in the print dialog to save it to your device.</p>
          </header>
          <div className="vehicle-share-controls">
            <span>{selectedFieldIds.length} of {allFieldIds.length} selected</span>
            <button type="button" className="text-action" onClick={() => setSelectedFieldIds(allFieldIds)}>
              Select all
            </button>
            <button type="button" className="text-action" onClick={() => setSelectedFieldIds([])}>
              Clear all
            </button>
          </div>
          <div className="vehicle-share-sections">
            {sections.map((section) => (
              <fieldset className="vehicle-share-section" key={section.title}>
                <legend>{section.title}</legend>
                {section.fields.map((field) => (
                  <label className="vehicle-share-field" key={field.id}>
                    <input
                      type="checkbox"
                      checked={selectedFieldIds.includes(field.id)}
                      onChange={(event) => setSelectedFieldIds((current) => event.target.checked
                        ? [...current, field.id]
                        : current.filter((id) => id !== field.id))}
                    />
                    <span>
                      <strong>{field.label}</strong>
                      <small>{field.imageUrl ? 'Photo will be included' : field.value}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <footer className="vehicle-share-actions">
            <button type="button" className="text-action" onClick={requestExit}>Cancel</button>
            <button
              type="button"
              className="primary-action"
              disabled={selectedFieldIds.length === 0}
              onClick={handlePrint}
            >
              Print / Save PDF
            </button>
          </footer>
        </div>
        {showExitConfirm && (
          <div className="vehicle-share-exit-backdrop">
            <section
              className="vehicle-share-exit-confirm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="vehicle-share-exit-title"
              aria-describedby="vehicle-share-exit-description"
            >
              <h3 id="vehicle-share-exit-title">Exit share screen?</h3>
              <p id="vehicle-share-exit-description">
                Your selected options will be lost. Are you sure you want to exit?
              </p>
              <div className="vehicle-share-exit-actions">
                <button type="button" className="text-action" autoFocus onClick={() => setShowExitConfirm(false)}>
                  Keep sharing
                </button>
                <button type="button" className="primary-action" onClick={onClose}>
                  Exit sharing
                </button>
              </div>
            </section>
          </div>
        )}
      </dialog>
      {printDocument && (
        <article className="vehicle-print-sheet" aria-hidden="true">
          <header>
            <div className="vehicle-print-logo">
              <img src={brandWordmark} alt="Vehkix" />
            </div>
            <p>VEHICLE RECORD</p>
            <h1>{printDocument.vehicleName}</h1>
            <span>{printDocument.vehicleIdentifier}</span>
          </header>
          {printDocument.sections.map((section) => (
            <section className="vehicle-print-section" key={section.title}>
              <h2>{section.title}</h2>
              <dl>
                {section.fields.map((field) => (
                  <div className="vehicle-print-field" key={field.id}>
                    <dt>{field.label}</dt>
                    <dd>
                      {field.imageUrl
                        ? <img src={field.imageUrl} alt={field.label} />
                        : field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </article>
      )}
    </>
  )
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
  const [sharingVehicleId, setSharingVehicleId] = useState<string | null>(null)

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
        const shareSections = createShareSections(vehicle, showOwner, carouselImages)
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
              {sharingVehicleId === vehicle.id && (
                <VehicleShareDialog
                  vehicleName={vehicleName}
                  vehicleIdentifier={vehicle.vehicle_number || vehicle.id}
                  sections={shareSections}
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
