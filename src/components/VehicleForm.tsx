import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import type { ExistingVehicleImage, VehicleDraft } from '../types/vehicle'
import '../styles/forms.css'
import './VehicleForm.css'

interface VehicleFormProps {
  initialDraft?: VehicleDraft
  existingImages?: ExistingVehicleImage[]
  onSave: (draft: VehicleDraft, images: File[], retainedImagePaths: string[]) => Promise<string | null>
  onCancel: () => void
}

const emptyDraft: VehicleDraft = {
  vehicle_number: '',
  name: '',
  model: '',
  company: '',
  year: '',
  taken_date: '',
  last_service_date: '',
  last_service_km: '',
  next_service_date: '',
  next_service_km: '',
  last_pucc_date: '',
  next_pucc_date: '',
  insurance_taken_date: '',
  insurance_next_renewal_date: '',
}

function VehicleForm({ initialDraft, existingImages = [], onSave, onCancel }: VehicleFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<VehicleDraft>(() => initialDraft ?? emptyDraft)
  const [images, setImages] = useState<File[]>([])
  const [retainedImages, setRetainedImages] = useState<ExistingVehicleImage[]>(existingImages)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    dialog.querySelector<HTMLInputElement>('input')?.focus()
    return () => dialog.close()
  }, [])

  function updateField(field: keyof VehicleDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const message = await onSave(draft, images, retainedImages.map((image) => image.path))
      if (message) setError(message)
    } catch {
      setError('Could not connect to the vehicle service. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleImageSelection(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const selected = Array.from(input.files ?? [])
    const invalid = selected.find((file) => !file.type.startsWith('image/'))
    if (invalid) {
      setError('Choose image files only.')
      input.value = ''
      return
    }
    const oversized = selected.find((file) => file.size > 10 * 1024 * 1024)
    if (oversized) {
      setError('Each image must be 10 MB or smaller.')
      input.value = ''
      return
    }
    setError(null)
    setImages((current) => [...current, ...selected])
    input.value = ''
  }

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current && !saving) onCancel()
  }

  function field(label: string, name: keyof VehicleDraft, type = 'text') {
    return (
      <label className="form-field" key={name}>
        <span>{label}</span>
        <input
          type={type}
          min={type === 'number' ? 0 : undefined}
          name={name}
          value={draft[name]}
          onChange={(event) => updateField(name, event.target.value)}
        />
      </label>
    )
  }

  return (
    <dialog
      ref={dialogRef}
      className="vehicle-dialog"
      aria-labelledby="vehicle-form-title"
      onCancel={(event) => { event.preventDefault(); if (!saving) onCancel() }}
      onClick={handleDialogClick}
    >
    <form className="vehicle-form" onSubmit={handleSubmit}>
      <div className="form-heading">
        <div>
          <p className="eyebrow">PRIVATE COLLECTION</p>
          <h2 id="vehicle-form-title">{initialDraft ? 'Edit vehicle' : 'Add a vehicle'}</h2>
        </div>
        <button className="text-action" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>

      <fieldset className="vehicle-fieldset">
        <legend>Vehicle information</legend>
        <div className="form-grid">
          {field('Registration number', 'vehicle_number')}
          {field('Vehicle name', 'name')}
          {field('Make', 'company')}
          {field('Model', 'model')}
          {field('Year', 'year', 'number')}
          {field('Date acquired', 'taken_date', 'date')}
        </div>
      </fieldset>

      <fieldset className="vehicle-fieldset">
        <legend>Service</legend>
        <div className="form-grid">
          {field('Last service date', 'last_service_date', 'date')}
          {field('Last service mileage (km)', 'last_service_km', 'number')}
          {field('Next service date', 'next_service_date', 'date')}
          {field('Next service mileage (km)', 'next_service_km', 'number')}
        </div>
      </fieldset>

      <fieldset className="vehicle-fieldset">
        <legend>Documents</legend>
        <div className="form-grid">
          {field('Last PUCC date', 'last_pucc_date', 'date')}
          {field('Next PUCC renewal', 'next_pucc_date', 'date')}
          {field('Insurance policy date', 'insurance_taken_date', 'date')}
          {field('Insurance renewal', 'insurance_next_renewal_date', 'date')}
        </div>
      </fieldset>

      <div className="form-field image-upload-field">
        <span>Vehicle images</span>
        <div className="file-picker">
          <label className="file-picker-button" htmlFor="vehicle-images">Choose images</label>
          <input
            id="vehicle-images"
            className="visually-hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleImageSelection}
          />
          <span>JPG, PNG, WebP or GIF · 10 MB max each</span>
        </div>
        {retainedImages.length > 0 && (
          <ul className="selected-files existing-files" aria-label="Uploaded images">
            {retainedImages.map((image, index) => (
              <li key={image.path}>
                {image.url && <img src={image.url} alt="" />}
                <span>Uploaded image {index + 1}</span>
                <button
                  type="button"
                  className="remove-file"
                  aria-label={`Remove uploaded image ${index + 1}`}
                  onClick={() => setRetainedImages((current) => current.filter((item) => item.path !== image.path))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {images.length > 0 && (
          <ul className="selected-files" aria-live="polite">
            {images.map((image, index) => (
              <li key={`${image.name}-${image.lastModified}-${index}`}>
                <span>{image.name}</span>
                <button
                  type="button"
                  className="remove-file"
                  aria-label={`Remove ${image.name}`}
                  onClick={() => setImages((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="form-feedback error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="text-action" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className="primary-action" type="submit" disabled={saving}>
          {saving ? 'Saving…' : initialDraft ? 'Save changes' : 'Save vehicle'}
        </button>
      </div>
    </form>
    </dialog>
  )
}

export default VehicleForm