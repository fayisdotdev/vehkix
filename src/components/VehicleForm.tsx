import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react'
import type { ExistingVehicleImage, VehicleDraft } from '../types/vehicle'
import '../styles/forms.css'
import './VehicleForm.css'

interface VehicleFormProps {
  initialDraft?: VehicleDraft
  existingImages?: ExistingVehicleImage[]
  initialPrimaryImagePath?: string | null
  onSave: (
    draft: VehicleDraft,
    images: File[],
    retainedImagePaths: string[],
    primaryImageIndex: number | null,
  ) => Promise<string | null>
  onCancel: () => void
}

interface SelectedImage {
  id: string
  file: File
  previewUrl: string
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
  rc_owner_name: '',
  chassis_no: '',
  engine_no: '',
  tax_valid_upto: '',
  registration_validity: '',
}

function VehicleForm({
  initialDraft,
  existingImages = [],
  initialPrimaryImagePath,
  onSave,
  onCancel,
}: VehicleFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previewUrls = useRef(new Set<string>())
  const [draft, setDraft] = useState<VehicleDraft>(() => initialDraft ?? emptyDraft)
  const [primaryImageKey, setPrimaryImageKey] = useState(
    initialPrimaryImagePath ?? existingImages[0]?.path ?? '',
  )
  const [images, setImages] = useState<SelectedImage[]>([])
  const [retainedImages, setRetainedImages] = useState<ExistingVehicleImage[]>(existingImages)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    dialog.querySelector<HTMLInputElement>('input')?.focus()
    return () => dialog.close()
  }, [])

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url))
    previewUrls.current.clear()
  }, [])

  function updateField(field: keyof VehicleDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const allImages = [
        ...retainedImages.map((image) => ({ key: image.path })),
        ...images.map((image) => ({ key: image.id })),
      ]
      const primaryIndex = allImages.findIndex((image) => image.key === primaryImageKey)
      const message = await onSave(
        draft,
        images.map((image) => image.file),
        retainedImages.map((image) => image.path),
        primaryIndex < 0 ? null : primaryIndex,
      )
      if (message) setError(message)
    } catch {
      setError('Could not connect to the vehicle service. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
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
    const selectedImages = selected.map((file) => {
      const previewUrl = URL.createObjectURL(file)
      previewUrls.current.add(previewUrl)
      return { id: `new:${crypto.randomUUID()}`, file, previewUrl }
    })
    setError(null)
    setImages((current) => [...current, ...selectedImages])
    if (!primaryImageKey && selectedImages[0]) setPrimaryImageKey(selectedImages[0].id)
    input.value = ''
  }

  function hasUnsavedChanges() {
    const originalDraft = initialDraft ?? emptyDraft
    const draftChanged = Object.keys(emptyDraft).some((key) =>
      draft[key as keyof VehicleDraft] !== originalDraft[key as keyof VehicleDraft],
    )
    const originalPaths = existingImages.map((image) => image.path)
    const retainedPaths = retainedImages.map((image) => image.path)
    return draftChanged
      || images.length > 0
      || retainedPaths.length !== originalPaths.length
      || retainedPaths.some((path, index) => path !== originalPaths[index])
      || primaryImageKey !== (initialPrimaryImagePath ?? existingImages[0]?.path ?? '')
  }

  function requestClose() {
    if (saving) return
    if (hasUnsavedChanges()) {
      setShowDiscardConfirm(true)
      return
    }
    onCancel()
  }

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) requestClose()
  }

  function removeStoredImage(path: string) {
    const remaining = retainedImages.filter((image) => image.path !== path)
    setRetainedImages(remaining)
    if (primaryImageKey === path) setPrimaryImageKey(remaining[0]?.path ?? images[0]?.id ?? '')
  }

  function removeSelectedImage(id: string) {
    const removed = images.find((image) => image.id === id)
    const remaining = images.filter((image) => image.id !== id)
    if (removed) {
      URL.revokeObjectURL(removed.previewUrl)
      previewUrls.current.delete(removed.previewUrl)
    }
    setImages(remaining)
    if (primaryImageKey === id) setPrimaryImageKey(retainedImages[0]?.path ?? remaining[0]?.id ?? '')
  }

  const imageEntries = [
    ...retainedImages.map((image, index) => ({
      key: image.path,
      url: image.url,
      label: `Uploaded image ${index + 1}`,
      kind: 'stored' as const,
    })),
    ...images.map((image) => ({
      key: image.id,
      url: image.previewUrl,
      label: image.file.name,
      kind: 'selected' as const,
    })),
  ]

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
      onCancel={(event) => {
        event.preventDefault()
        if (showDiscardConfirm) setShowDiscardConfirm(false)
        else requestClose()
      }}
      onClick={handleDialogClick}
    >
    <form className="vehicle-form" onSubmit={handleSubmit}>
      <div className="form-heading">
        <div>
          <h2 id="vehicle-form-title">{initialDraft ? 'Edit vehicle' : 'Add a vehicle'}</h2>
        </div>
        <button className="text-action" type="button" onClick={requestClose} disabled={saving}>
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

      <fieldset className="vehicle-fieldset">
        <legend>RC details</legend>
        <div className="form-grid">
          {field('RC owner name', 'rc_owner_name')}
          {field('Chassis number', 'chassis_no')}
          {field('Engine number', 'engine_no')}
          {field('Tax valid up to', 'tax_valid_upto', 'date')}
          {field('Registration valid up to', 'registration_validity', 'date')}
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
        {imageEntries.length > 0 && (
          <ul className="image-preview-grid" aria-label="Vehicle image previews">
            {imageEntries.map((image) => (
              <li className="image-preview" key={image.key}>
                {image.url
                  ? <img src={image.url} alt={image.label} />
                  : <span className="image-preview-placeholder">Preview unavailable</span>}
                <div className="image-preview-controls">
                  <label>
                    <input
                      type="radio"
                      name="primary-vehicle-image"
                      checked={primaryImageKey === image.key}
                      onChange={() => setPrimaryImageKey(image.key)}
                    />
                    <span>Primary</span>
                  </label>
                  <span className="image-preview-name" title={image.label}>{image.label}</span>
                </div>
                <button
                  type="button"
                  className="remove-file"
                  aria-label={`Remove ${image.label}`}
                  onClick={() => image.kind === 'stored'
                    ? removeStoredImage(image.key)
                    : removeSelectedImage(image.key)}
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
        <button className="text-action" type="button" onClick={requestClose} disabled={saving}>
          Cancel
        </button>
        <button className="primary-action" type="submit" disabled={saving}>
          {saving ? 'Saving…' : initialDraft ? 'Save changes' : 'Save vehicle'}
        </button>
      </div>
    </form>
    {showDiscardConfirm && (
      <div className="discard-confirm-backdrop" onClick={(event) => event.stopPropagation()}>
        <section
          className="discard-confirm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="discard-title"
          aria-describedby="discard-message"
        >
          <h3 id="discard-title">Discard unsaved changes?</h3>
          <p id="discard-message">Your vehicle details and image choices have not been saved.</p>
          <div className="discard-actions">
            <button className="text-action" type="button" onClick={() => setShowDiscardConfirm(false)}>
              Keep editing
            </button>
            <button className="primary-action" type="button" onClick={onCancel}>
              Discard changes
            </button>
          </div>
        </section>
      </div>
    )}
    </dialog>
  )
}

export default VehicleForm