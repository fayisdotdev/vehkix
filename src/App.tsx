import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabaseClient } from './lib/supabase'
import AuthPanel, { type AuthFeedback, type AuthMode, type AuthValues } from './components/AuthPanel'
import VehicleForm, { type VehicleDraft } from './components/VehicleForm'
import './App.css'

interface Vehicle {
  id: string
  vehicle_number?: string | null
  name?: string | null
  model?: string | null
  company?: string | null
  year?: number | null
  taken_date?: string | null
  service?: {
    last_service_date?: string | null
    last_service_km?: number | null
    next_service_date?: string | null
    next_service_km?: number | null
  }
  pucc?: {
    last_pucc_date?: string | null
    next_pucc_date?: string | null
  }
  insurance?: {
    taken_date?: string | null
    next_renewal_date?: string | null
  }
  user_id?: string
  last_service_date?: string | null
  last_service_km?: number | null
  next_service_date?: string | null
  next_service_km?: number | null
  last_pucc_date?: string | null
  next_pucc_date?: string | null
  insurance_taken_date?: string | null
  insurance_next_renewal_date?: string | null
  uploaded_by?: string | null
  uploaded_date?: string | null
  images?: string[] | null
  image_paths?: string[]
  signed_images?: { path: string; url?: string }[]
}

function normalizeVehicle(vehicle: Vehicle): Vehicle {
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

function formatDate(value?: string | null) {
  const date = parseDate(value)
  return date ? dateFormatter.format(date) : 'Not set'
}

function daysUntil(value?: string | null) {
  const date = parseDate(value)
  if (!date) return Number.POSITIVE_INFINITY

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((date.getTime() - today.getTime()) / 86400000)
}

function getNextDue(vehicle: Vehicle) {
  return [
    { label: 'Service', date: vehicle.service?.next_service_date },
    { label: 'PUCC', date: vehicle.pucc?.next_pucc_date },
    { label: 'Insurance', date: vehicle.insurance?.next_renewal_date },
  ]
    .filter((item): item is { label: string; date: string } => Boolean(item.date))
    .map((item) => ({ ...item, days: daysUntil(item.date) }))
    .sort((first, second) => first.days - second.days)[0] ?? null
}

function getVehicleStatus(vehicle: Vehicle) {
  const nearestDue = getNextDue(vehicle)

  if (!nearestDue) return { label: 'No due date', className: 'no-date' }
  if (nearestDue.days < 0) return { label: 'Overdue', className: 'overdue' }
  if (nearestDue.days <= 10) return { label: 'Due soon', className: 'due-soon' }
  return { label: 'On track', className: 'on-track' }
}

function getDueMessage(vehicle: Vehicle) {
  const nextDue = getNextDue(vehicle)
  if (!nextDue || nextDue.days > 10) return null
  if (nextDue.days < 0) return `${nextDue.label} overdue by ${Math.abs(nextDue.days)} days`
  if (nextDue.days === 0) return `${nextDue.label} due today`
  return `${nextDue.label} due in ${nextDue.days} days`
}

function displayValue(value?: string | number | null) {
  return value === undefined || value === null || value === '' ? 'Not set' : value
}

function toVehicleDraft(vehicle: Vehicle): VehicleDraft {
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
  }
}

function App() {
  const [query, setQuery] = useState('')
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null)
  const [myVehicles, setMyVehicles] = useState<Vehicle[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!supabaseClient)
  const [myVehiclesLoadedFor, setMyVehiclesLoadedFor] = useState<string | null>(null)
  const [myVehiclesError, setMyVehiclesError] = useState<string | null>(null)
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    if (!supabaseClient) return

    const client = supabaseClient
    let isCurrent = true
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (isCurrent) {
        setSession(nextSession)
        setAuthReady(true)
        if (!nextSession) {
          setMyVehicles([])
          setMyVehiclesError(null)
          setMyVehiclesLoadedFor(null)
          setShowVehicleForm(false)
          setEditingVehicle(null)
        }
      }
    })

    client.auth.getSession().then(({ data, error }) => {
      if (!isCurrent) return
      if (error) setMyVehiclesError(error.message)
      setSession(data.session)
      setAuthReady(true)
      if (!data.session) {
        setMyVehicles([])
        setMyVehiclesError(null)
        setMyVehiclesLoadedFor(null)
        setShowVehicleForm(false)
        setEditingVehicle(null)
      }
    }).catch(() => {
      if (isCurrent) setAuthReady(true)
    })

    return () => {
      isCurrent = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const userId = session?.user.id
    if (!supabaseClient || !userId) return

    const client = supabaseClient
    const activeUserId = userId
    let isCurrent = true

    async function loadMyVehicles() {
      try {
        const { data, error } = await client
          .from('user_vehicles')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (!isCurrent) return
        if (error) {
          setMyVehiclesError('Could not load your garage. Run the user-account setup SQL and check its RLS policies.')
          setMyVehiclesLoadedFor(activeUserId)
          return
        }

        const vehiclesWithImages = await Promise.all((data ?? []).map(async (row) => {
          const vehicle = normalizeVehicle(row as unknown as Vehicle)
          const imagePaths = vehicle.images ?? []
          const imageResults = await Promise.all(imagePaths.map((path) =>
            client.storage.from('user-vehicle-images').createSignedUrl(path, 60 * 60),
          ))
          const signedImages = imagePaths.map((path, index) => ({
            path,
            url: imageResults[index].data?.signedUrl,
          }))
          return {
            ...vehicle,
            image_paths: imagePaths,
            signed_images: signedImages,
            images: signedImages.flatMap((image) => image.url ?? []),
          }
        }))
        setMyVehicles(vehiclesWithImages)
        setMyVehiclesError(null)
        setMyVehiclesLoadedFor(activeUserId)
      } catch {
        if (isCurrent) {
          setMyVehiclesError('Could not connect to your private garage.')
          setMyVehiclesLoadedFor(activeUserId)
        }
      }
    }

    void loadMyVehicles()

    return () => {
      isCurrent = false
    }
  }, [session?.user.id])

  async function handleAuth(mode: AuthMode, values: AuthValues): Promise<AuthFeedback> {
    if (!supabaseClient) {
      return { kind: 'error', message: 'Supabase is not configured.' }
    }

    if (mode === 'sign-in') {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })
      if (error) {
        return { kind: 'error', message: 'Email or password was not accepted.' }
      }
      return { kind: 'success', message: 'You are signed in.' }
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { username: values.username } },
    })
    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('profiles_username_unique_ci') || message.includes('duplicate key')) {
        return { kind: 'error', message: 'That username is already taken.' }
      }
      if (message.includes('already registered') || message.includes('already exists')) {
        return { kind: 'error', message: 'An account may already use that email address.' }
      }
      return { kind: 'error', message: 'Could not create the account. Check the details and try again.' }
    }

    return data.session
      ? { kind: 'success', message: 'Account created. You are signed in.' }
      : { kind: 'success', message: 'Account created. Check your email to confirm your address.' }
  }

  async function handleVehicleSave(
    draft: VehicleDraft,
    images: File[],
    retainedImagePaths: string[],
  ) {
    if (!supabaseClient || !session) return 'Sign in before adding a vehicle.'
    const client = supabaseClient

    const nullableText = (value: string) => value.trim() || null
    const nullableNumber = (value: string) => value.trim() ? Number(value) : null
    const username = session.user.user_metadata.username || session.user.email || null
    const currentImagePaths = editingVehicle?.image_paths ?? []
    const keptImagePaths = editingVehicle
      ? retainedImagePaths.filter((path) => currentImagePaths.includes(path))
      : []
    const vehicleId = editingVehicle?.id ?? crypto.randomUUID()
    const uploadedPaths: string[] = []

    for (const image of images) {
      const extension = image.name.includes('.')
        ? image.name.slice(image.name.lastIndexOf('.') + 1).replace(/[^a-zA-Z0-9]/g, '')
        : 'image'
      const path = `${session.user.id}/${vehicleId}/${crypto.randomUUID()}.${extension}`
      const { error } = await client.storage
        .from('user-vehicle-images')
        .upload(path, image, { contentType: image.type, upsert: false })

      if (error) {
        if (uploadedPaths.length > 0) {
          await client.storage.from('user-vehicle-images').remove(uploadedPaths)
        }
        return 'Could not upload an image. Check the file and try again.'
      }
      uploadedPaths.push(path)
    }

    const payload = {
      id: vehicleId,
      user_id: session.user.id,
      vehicle_number: nullableText(draft.vehicle_number),
      name: nullableText(draft.name),
      model: nullableText(draft.model),
      company: nullableText(draft.company),
      year: nullableNumber(draft.year),
      taken_date: nullableText(draft.taken_date),
      last_service_date: nullableText(draft.last_service_date),
      last_service_km: nullableNumber(draft.last_service_km),
      next_service_date: nullableText(draft.next_service_date),
      next_service_km: nullableNumber(draft.next_service_km),
      last_pucc_date: nullableText(draft.last_pucc_date),
      next_pucc_date: nullableText(draft.next_pucc_date),
      insurance_taken_date: nullableText(draft.insurance_taken_date),
      insurance_next_renewal_date: nullableText(draft.insurance_next_renewal_date),
      uploaded_by: username,
      images: [...keptImagePaths, ...uploadedPaths],
    }

    const result = editingVehicle
      ? await client
        .from('user_vehicles')
        .update(payload)
        .eq('id', editingVehicle.id)
        .eq('user_id', session.user.id)
        .select('*')
        .single()
      : await client
        .from('user_vehicles')
        .insert({ ...payload, id: vehicleId, user_id: session.user.id })
        .select('*')
        .single()
    const { data, error } = result

    if (error) {
      if (uploadedPaths.length > 0) {
        await client.storage.from('user-vehicle-images').remove(uploadedPaths)
      }
      return 'Could not save this vehicle. Check your connection and try again.'
    }

    const imagePaths = [...keptImagePaths, ...uploadedPaths]
    const imageResults = await Promise.all(imagePaths.map((path) =>
      client.storage.from('user-vehicle-images').createSignedUrl(path, 60 * 60),
    ))
    const signedImages = imagePaths.map((path, index) => ({
      path,
      url: imageResults[index].data?.signedUrl,
    }))
    const savedVehicle = normalizeVehicle({
      ...data,
      image_paths: imagePaths,
      signed_images: signedImages,
      images: signedImages.flatMap((image) => image.url ?? []),
    } as unknown as Vehicle)
    if (editingVehicle) {
      const removedPaths = currentImagePaths.filter((path) => !keptImagePaths.includes(path))
      setMyVehicles((current) => current.map((vehicle) =>
        vehicle.id === editingVehicle.id ? savedVehicle : vehicle,
      ))
      if (removedPaths.length > 0) {
        await client.storage.from('user-vehicle-images').remove(removedPaths)
      }
    } else {
      setMyVehicles((current) => [savedVehicle, ...current])
    }
    setShowVehicleForm(false)
    setEditingVehicle(null)
    return null
  }

  async function handleDeleteVehicle(vehicle: Vehicle) {
    if (!supabaseClient || !session) return
    setDeleteBusy(true)
    setMyVehiclesError(null)
    const client = supabaseClient
    try {
      const { error } = await client
        .from('user_vehicles')
        .delete()
        .eq('id', vehicle.id)
        .eq('user_id', session.user.id)

      if (error) {
        setMyVehiclesError('Could not delete this vehicle. Please try again.')
        return
      }

      setMyVehicles((current) => current.filter((item) => item.id !== vehicle.id))
      const imagePaths = vehicle.image_paths ?? []
      if (imagePaths.length > 0) {
        await client.storage.from('user-vehicle-images').remove(imagePaths)
      }
    } catch {
      setMyVehiclesError('Could not delete this vehicle. Please try again.')
    } finally {
      setDeleteBusy(false)
    }
  }

  async function handleSignOut() {
    if (!supabaseClient) return
    const { error } = await supabaseClient.auth.signOut()
    if (error) setMyVehiclesError('Could not sign out. Please try again.')
    else setShowVehicleForm(false)
  }

  const vehicleRecords = myVehicles
  const filteredVehicles = vehicleRecords.filter((vehicle) =>
    [vehicle.id, vehicle.vehicle_number, vehicle.name, vehicle.model, vehicle.company]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )
  const attentionCount = vehicleRecords.filter((vehicle) => {
    const nextDue = getNextDue(vehicle)
    return nextDue !== null && nextDue.days <= 10
  }).length
  const mostRecentUpload = vehicleRecords
    .map((vehicle) => vehicle.uploaded_date)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1)
  const myVehiclesLoading = Boolean(
    session?.user.id && myVehiclesLoadedFor !== session.user.id,
  )
  const username = session?.user.user_metadata.username || session?.user.email || ''
  const connectionState = !supabaseClient ? 'error' : !authReady ? 'connecting' : 'live'

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Vehkix home">
          vehkix<span>.</span>
        </a>
        <div className="topbar-actions">
          <span className="data-status" data-state={connectionState}>
            <span aria-hidden="true" />
            {!supabaseClient ? 'SETUP REQUIRED' : !authReady ? 'CONNECTING' : 'PRIVATE COLLECTION'}
          </span>
          {session && (
            <>
              <span className="account-name">{username}</span>
              <button className="text-action" type="button" onClick={handleSignOut}>Log out</button>
            </>
          )}
        </div>
      </header>

      <section className="fleet" id="top" aria-labelledby="page-title">
        <div className="page-heading">
          <div>
            <p className="eyebrow">PRIVATE COLLECTION</p>
            <h1 id="page-title">My vehicles</h1>
          </div>
          {session && (
            <div className="summary" aria-label="Collection summary">
              <div className="summary-item">
                <strong>{String(vehicleRecords.length).padStart(2, '0')}</strong>
                <span>vehicles</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-item">
                <strong>{String(attentionCount).padStart(2, '0')}</strong>
                <span>due within 10 days</span>
              </div>
            </div>
          )}
        </div>

        {!session && authReady && supabaseClient && (
          <AuthPanel onSubmit={handleAuth} />
        )}

        {!authReady && (
          <p className="empty-state" role="status">Checking your session…</p>
        )}

        {authReady && !supabaseClient && (
          <p className="empty-state error-state" role="alert">Supabase is not configured, so your private collection is unavailable.</p>
        )}

        {session && (
          <div className="private-toolbar">
            <p>Only you can see the vehicles in this collection.</p>
            {!showVehicleForm && (
              <button
                className="primary-action"
                type="button"
                onClick={() => { setEditingVehicle(null); setShowVehicleForm(true) }}
              >
                Add vehicle
              </button>
            )}
          </div>
        )}

        {session && showVehicleForm && (
          <VehicleForm
            key={editingVehicle?.id ?? 'new-vehicle'}
            initialDraft={editingVehicle ? toVehicleDraft(editingVehicle) : undefined}
            existingImages={editingVehicle?.signed_images ?? []}
            onSave={handleVehicleSave}
            onCancel={() => { setShowVehicleForm(false); setEditingVehicle(null) }}
          />
        )}

        {session && (
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
        )}

        {session && myVehiclesLoading && (
          <p className="empty-state" role="status">Loading your collection…</p>
        )}
        {session && myVehiclesError && (
          <p className="empty-state error-state" role="alert">{myVehiclesError}</p>
        )}

        {session && !myVehiclesLoading && !myVehiclesError && (
        <div className="vehicle-list" role="list" aria-label="My vehicles">
          {filteredVehicles.map((vehicle) => {
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
                  <button
                    className="text-action"
                    type="button"
                    onClick={() => { setEditingVehicle(vehicle); setShowVehicleForm(true) }}
                  >
                    Edit
                  </button>
                  <button
                    className="text-action delete-action"
                    type="button"
                    disabled={deleteBusy}
                    onClick={() => {
                      if (window.confirm(`Delete ${vehicleName} and its uploaded images? This cannot be undone.`)) {
                        void handleDeleteVehicle(vehicle)
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
                    onClick={() => setExpandedVehicleId(isExpanded ? null : vehicle.id)}
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
          {filteredVehicles.length === 0 && (
            <p className="empty-state">
              {query.trim()
                ? <>No vehicles match “{query}”.</>
                : 'Your private collection is empty.'}
            </p>
          )}
        </div>
        )}
        <footer className="list-footer">
          <span>Private vehicles · {vehicleRecords.length}</span>
          {mostRecentUpload && <span>Updated {formatDate(mostRecentUpload)}</span>}
        </footer>
      </section>
    </main>
  )
}

export default App
