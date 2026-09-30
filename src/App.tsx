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

function getVehicleStatus(vehicle: Vehicle) {
  const nearestDue = Math.min(
    daysUntil(vehicle.service?.next_service_date),
    daysUntil(vehicle.pucc?.next_pucc_date),
    daysUntil(vehicle.insurance?.next_renewal_date),
  )

  if (!Number.isFinite(nearestDue)) return { label: 'No due date', className: 'no-date' }
  if (nearestDue < 0) return { label: 'Overdue', className: 'overdue' }
  if (nearestDue <= 30) return { label: 'Due soon', className: 'due-soon' }
  return { label: 'On track', className: 'on-track' }
}

function displayValue(value?: string | number | null) {
  return value === undefined || value === null || value === '' ? 'Not set' : value
}

function App() {
  const [query, setQuery] = useState('')
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null)
  const [activeCollection, setActiveCollection] = useState<'public' | 'mine'>('public')
  const [publicVehicles, setPublicVehicles] = useState<Vehicle[]>([])
  const [myVehicles, setMyVehicles] = useState<Vehicle[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!supabaseClient)
  const [publicLoading, setPublicLoading] = useState(Boolean(supabaseClient))
  const [myVehiclesLoadedFor, setMyVehiclesLoadedFor] = useState<string | null>(null)
  const [publicError, setPublicError] = useState<string | null>(
    supabaseClient ? null : 'Supabase is not configured. Add the public project URL and anon key to the app environment.',
  )
  const [myVehiclesError, setMyVehiclesError] = useState<string | null>(null)
  const [showVehicleForm, setShowVehicleForm] = useState(false)

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
        }
      }
    })

    client.auth.getSession().then(({ data, error }) => {
      if (!isCurrent) return
      if (error) setMyVehiclesError(error.message)
      setSession(data.session)
      setAuthReady(true)
      if (!data.session) setMyVehicles([])
    }).catch(() => {
      if (isCurrent) setAuthReady(true)
    })

    async function loadPublicVehicles() {
      try {
        const { data, error } = await client
          .from('vehicles')
          .select('*')
          .order('id', { ascending: true })

        if (!isCurrent) return
        if (error) {
          setPublicError('Could not load the public vehicle register. Check the Supabase table and access policy.')
          return
        }

        setPublicVehicles((data ?? []).map((row) => normalizeVehicle(row as unknown as Vehicle)))
      } catch {
        if (isCurrent) setPublicError('Could not connect to the public vehicle register.')
      } finally {
        if (isCurrent) setPublicLoading(false)
      }
    }

    void loadPublicVehicles()

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
          const imageResults = await Promise.all((vehicle.images ?? []).map((path) =>
            client.storage.from('user-vehicle-images').createSignedUrl(path, 60 * 60),
          ))
          return {
            ...vehicle,
            images: imageResults.flatMap((result) => result.data?.signedUrl ?? []),
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

  async function handleVehicleSave(draft: VehicleDraft, images: File[]) {
    if (!supabaseClient || !session) return 'Sign in before adding a vehicle.'
    const client = supabaseClient

    const nullableText = (value: string) => value.trim() || null
    const nullableNumber = (value: string) => value.trim() ? Number(value) : null
    const username = session.user.user_metadata.username || session.user.email || null
    const vehicleId = crypto.randomUUID()
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
      images: uploadedPaths,
    }

    const { data, error } = await client
      .from('user_vehicles')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      if (uploadedPaths.length > 0) {
        await client.storage.from('user-vehicle-images').remove(uploadedPaths)
      }
      return 'Could not save this vehicle. Check your connection and try again.'
    }

    const imageResults = await Promise.all(uploadedPaths.map((path) =>
      client.storage.from('user-vehicle-images').createSignedUrl(path, 60 * 60),
    ))
    const savedVehicle = normalizeVehicle({
      ...data,
      images: imageResults.flatMap((result) => result.data?.signedUrl ?? []),
    } as unknown as Vehicle)
    setMyVehicles((current) => [savedVehicle, ...current])
    setShowVehicleForm(false)
    return null
  }

  async function handleSignOut() {
    if (!supabaseClient) return
    const { error } = await supabaseClient.auth.signOut()
    if (error) setMyVehiclesError('Could not sign out. Please try again.')
    else setShowVehicleForm(false)
  }

  const vehicleRecords = activeCollection === 'public' ? publicVehicles : myVehicles
  const filteredVehicles = vehicleRecords.filter((vehicle) =>
    [vehicle.id, vehicle.vehicle_number, vehicle.name, vehicle.model, vehicle.company]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )
  const attentionCount = vehicleRecords.filter((vehicle) => {
    const nextDue = Math.min(
      daysUntil(vehicle.service?.next_service_date),
      daysUntil(vehicle.pucc?.next_pucc_date),
      daysUntil(vehicle.insurance?.next_renewal_date),
    )
    return nextDue <= 30
  }).length
  const mostRecentUpload = vehicleRecords
    .map((vehicle) => vehicle.uploaded_date)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1)
  const myVehiclesLoading = Boolean(
    session?.user.id && myVehiclesLoadedFor !== session.user.id,
  )
  const collectionLoading = activeCollection === 'public' ? publicLoading : myVehiclesLoading
  const collectionError = activeCollection === 'public' ? publicError : myVehiclesError
  const username = session?.user.user_metadata.username || session?.user.email || ''

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Vehkix home">
          vehkix<span>.</span>
        </a>
        <div className="topbar-actions">
          <span className="data-status" data-state={publicLoading ? 'connecting' : publicError ? 'error' : 'live'}>
          <span aria-hidden="true" />
            {publicLoading ? 'CONNECTING' : publicError ? 'DATA ERROR' : 'LIVE DATA'}
          </span>
          {session ? (
            <>
              <span className="account-name">{username}</span>
              <button className="text-action" type="button" onClick={handleSignOut}>Log out</button>
            </>
          ) : (
            <button className="text-action" type="button" onClick={() => setActiveCollection('mine')}>
              Log in / Sign up
            </button>
          )}
        </div>
      </header>

      <section className="fleet" id="top" aria-labelledby="page-title">
        <div className="page-heading">
          <div>
            <p className="eyebrow">{activeCollection === 'public' ? 'PUBLIC REGISTER' : 'YOUR GARAGE'}</p>
            <h1 id="page-title">{activeCollection === 'public' ? 'Vehicles' : 'My vehicles'}</h1>
          </div>
          <div className="summary" aria-label="Fleet summary">
            <div className="summary-item">
              <strong>{String(vehicleRecords.length).padStart(2, '0')}</strong>
              <span>vehicles</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-item">
              <strong>{String(attentionCount).padStart(2, '0')}</strong>
              <span>need attention</span>
            </div>
          </div>
        </div>

        <div className="collection-tabs" role="tablist" aria-label="Vehicle collections">
          <button
            type="button"
            role="tab"
            aria-selected={activeCollection === 'public'}
            onClick={() => { setActiveCollection('public'); setQuery('') }}
          >
            Public fleet <span>{publicVehicles.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCollection === 'mine'}
            onClick={() => { setActiveCollection('mine'); setQuery('') }}
          >
            My vehicles <span>{myVehicles.length}</span>
          </button>
        </div>

        {activeCollection === 'mine' && !session && authReady && supabaseClient && (
          <AuthPanel onSubmit={handleAuth} />
        )}

        {activeCollection === 'mine' && !authReady && (
          <p className="empty-state" role="status">Checking your session…</p>
        )}

        {activeCollection === 'mine' && authReady && !supabaseClient && (
          <p className="empty-state error-state" role="alert">Supabase is not configured, so accounts and private vehicles are unavailable.</p>
        )}

        {activeCollection === 'mine' && session && (
          <div className="private-toolbar">
            <p>Only you can see the vehicles in this garage.</p>
            {!showVehicleForm && (
              <button className="primary-action" type="button" onClick={() => setShowVehicleForm(true)}>
                Add vehicle
              </button>
            )}
          </div>
        )}

        {activeCollection === 'mine' && session && showVehicleForm && (
          <VehicleForm onSave={handleVehicleSave} onCancel={() => setShowVehicleForm(false)} />
        )}

        {(activeCollection === 'public' || session) && (
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

        {collectionLoading && (activeCollection === 'public' || session) && (
          <p className="empty-state" role="status">Loading vehicles…</p>
        )}
        {collectionError && (activeCollection === 'public' || session) && (
          <p className="empty-state error-state" role="alert">{collectionError}</p>
        )}

        {!collectionLoading && !collectionError && (activeCollection === 'public' || session) && (
        <div className="vehicle-list" role="list" aria-label={activeCollection === 'public' ? 'Public vehicles' : 'My vehicles'}>
          {filteredVehicles.map((vehicle) => {
            const vehicleName = vehicle.name || 'Unnamed vehicle'
            const status = getVehicleStatus(vehicle)
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
                : activeCollection === 'mine'
                  ? 'Your private garage is empty.'
                  : 'No public vehicles have been added yet.'}
            </p>
          )}
        </div>
        )}
        <footer className="list-footer">
          <span>{activeCollection === 'public' ? 'Public vehicles' : 'Private vehicles'} · {vehicleRecords.length}</span>
          {mostRecentUpload && <span>Updated {formatDate(mostRecentUpload)}</span>}
        </footer>
      </section>
    </main>
  )
}

export default App
