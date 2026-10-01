import { useEffect, useRef, useState } from 'react'
import brandWordmark from '../../images/logo/vehkix-wordmark-color-transparent.png'
import type { ShareSection } from './vehicleShare'

interface PrintDocument {
  vehicleName: string
  vehicleIdentifier: string
  sections: ShareSection[]
}

interface PrintDocument {
  vehicleName: string
  vehicleIdentifier: string
  sections: ShareSection[]
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
  document.title = printDocument.vehicleName
  document.body.classList.add('vehicle-printing')

  const finishPrint = () => {
    onClose()
  }

  window.addEventListener('afterprint', finishPrint, { once: true })

  const print = async () => {
    const logo = document.querySelector<HTMLImageElement>(
      '.vehicle-print-logo img'
    )

    if (logo) {
      if (!logo.complete) {
        await new Promise<void>((resolve) => {
          logo.addEventListener('load', () => resolve(), { once: true })
          logo.addEventListener('error', () => resolve(), { once: true })
        })
      }

      if (logo.decode) {
        try {
          await logo.decode()
        } catch {
          // Continue printing even if decode is unavailable
        }
      }
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dialogRef.current?.close()
        window.print()
      })
    })
  }

  print()

  return () => {
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

export default VehicleShareDialog