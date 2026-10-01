import { useState } from 'react'
import { supabaseClient } from './lib/supabase'
import AuthPanel from './components/AuthPanel'
import VehicleForm from './components/VehicleForm'
import VehicleList from './components/VehicleList'
import { useAuthSession } from './hooks/useAuthSession'
import { useMyVehicles } from './hooks/useMyVehicles'
import { getNextDue, toVehicleDraft } from './lib/vehicle'
import type { Vehicle, VehicleDraft } from './types/vehicle'
import './styles/page.css'

function App() {
  const [query, setQuery] = useState('')
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null)
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const { session, isReady: authReady, error: authError, submitAuth, signOut } = useAuthSession()
  const {
    vehicles: vehicleRecords,
    loading: myVehiclesLoading,
    error: myVehiclesError,
    deleteBusy,
    saveVehicle,
    deleteVehicle,
  } = useMyVehicles(session)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleVehicleSave(
    draft: VehicleDraft,
    images: File[],
    retainedImagePaths: string[],
    primaryImageIndex: number | null,
  ) {
    const message = await saveVehicle(
      draft,
      images,
      retainedImagePaths,
      primaryImageIndex,
      editingVehicle?.id,
    )
    if (!message) {
      setShowVehicleForm(false)
      setEditingVehicle(null)
    }
    return message
  }

  async function handleDeleteVehicle(vehicle: Vehicle) {
    setActionError(await deleteVehicle(vehicle))
  }

  async function handleSignOut() {
    setActionError(await signOut())
    setShowVehicleForm(false)
    setEditingVehicle(null)
  }

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
  const username = session?.user.user_metadata.username || session?.user.email || ''
  const connectionState = !supabaseClient ? 'error' : !authReady ? 'connecting' : 'live'

  return (
    <main className="page-shell">
      <header className="topbar">
        {session && (
          <a className="wordmark" href="#top" aria-label="Vehkix home">
            vehkix<span>.</span>
          </a>
        )}
        <div className="topbar-actions">
          <span className="data-status" data-state={connectionState}>
            <span aria-hidden="true" />
            {!supabaseClient ? 'SETUP REQUIRED' : !authReady ? 'CONNECTING' : 'CONNECTED'}
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
            <h1 id="page-title">
              {session ? 'My vehicles' : <>vehkix<span className="brand-mark">.</span></>}
            </h1>
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
          <AuthPanel onSubmit={submitAuth} />
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
            initialPrimaryImagePath={editingVehicle?.primary_image}
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
        {(authError || (session && myVehiclesError) || actionError) && (
          <p className="empty-state error-state" role="alert">
            {authError || myVehiclesError || actionError}
          </p>
        )}

        {session && !myVehiclesLoading && !myVehiclesError && (
          <VehicleList
            vehicles={filteredVehicles}
            query={query}
            expandedVehicleId={expandedVehicleId}
            deleteBusy={deleteBusy}
            onToggleExpanded={(vehicleId) => setExpandedVehicleId(
              expandedVehicleId === vehicleId ? null : vehicleId,
            )}
            onEdit={(vehicle) => { setEditingVehicle(vehicle); setShowVehicleForm(true) }}
            onDelete={(vehicle) => { void handleDeleteVehicle(vehicle) }}
          />
        )}
        {session && (
          <footer className="list-footer">
            <span>“The road ahead belongs to those who keep moving.”</span>
          </footer>
        )}
      </section>
    </main>
  )
}

export default App
