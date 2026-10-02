import { useState } from 'react'
import brandMark from '../images/logo/vehkix-mark-color.png'
import brandWordmark from '../images/logo/vehkix-wordmark-color-transparent.png'
import { supabaseClient } from './lib/supabase'
import AdminPanel from './components/AdminPanel'
import AuthPanel from './components/AuthPanel'
import VehicleForm from './components/VehicleForm'
import VehicleList from './components/VehicleList'
import { useAdminAccess } from './hooks/useAdminAccess'
import { useAuthSession } from './hooks/useAuthSession'
import { useMyVehicles } from './hooks/useMyVehicles'
import { useVehicleFieldSettings } from './hooks/useVehicleFieldSettings'
import { formatDate, getDueItems, getVehicleName, toVehicleDraft } from './lib/vehicle'
import { vehicleFieldDefinitions } from './lib/vehicleSettings'
import type { AdminSection } from './types/admin'
import type { Vehicle, VehicleDraft } from './types/vehicle'
import './styles/page.css'

function App() {
  const [activeView, setActiveView] = useState<'collection' | 'admin'>('collection')
  const [query, setQuery] = useState('')
  const [showDueVehicles, setShowDueVehicles] = useState(false)
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null)
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [adminSection, setAdminSection] = useState<AdminSection>('overview')
  const { session, isReady: authReady, error: authError, submitAuth, signOut } = useAuthSession()
  const { isAdmin, loading: adminAccessLoading, error: adminAccessError } = useAdminAccess(session)
  const {
    settings: fieldSettings,
    loading: fieldSettingsLoading,
    error: fieldSettingsError,
    updateSetting: updateFieldSetting,
  } = useVehicleFieldSettings(session?.user.id, isAdmin)
  const adminView = activeView === 'admin' && isAdmin
  const {
    vehicles: vehicleRecords,
    loading: myVehiclesLoading,
    error: myVehiclesError,
    deleteBusy,
    userCount,
    accounts,
    saveVehicle,
    deleteVehicle,
  } = useMyVehicles(session, adminView)
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
    setActiveView('collection')
  }

  const visibleDetailFields = new Set(
    vehicleFieldDefinitions
      .filter((field) => fieldSettings[field.key].show_in_details)
      .map((field) => field.key),
  )
  const filteredVehicles = vehicleRecords.filter((vehicle) =>
    [
      fieldSettings.id.show_in_details ? vehicle.id : null,
      fieldSettings.vehicle_number.show_in_details ? vehicle.vehicle_number : null,
      fieldSettings.vehicle_title.show_in_details ? getVehicleName(
        fieldSettings.company.show_in_details ? vehicle.company : null,
        fieldSettings.model.show_in_details ? vehicle.model : null,
      ) : null,
      fieldSettings.model.show_in_details ? vehicle.model : null,
      fieldSettings.company.show_in_details ? vehicle.company : null,
      adminView ? vehicle.owner_username : null,
      adminView ? vehicle.owner_email : null,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )
  const matchingOwnerIds = new Set(filteredVehicles.map((vehicle) => vehicle.user_id).filter(Boolean))
  const searchTerm = query.trim().toLowerCase()
  const filteredAccounts = accounts.filter((account) => (
    !searchTerm
    || account.username.toLowerCase().includes(searchTerm)
    || account.email?.toLowerCase().includes(searchTerm)
    || matchingOwnerIds.has(account.id)
  ))
  const dueVehicles = vehicleRecords
    .map((vehicle) => ({
      vehicle,
      items: getDueItems(vehicle, visibleDetailFields).filter((item) => item.days <= 10),
    }))
    .filter(({ items }) => items.length > 0)
  const attentionCount = dueVehicles.length
  const username = session?.user.user_metadata.username || session?.user.email || ''
  const connectionState = !supabaseClient ? 'error' : !authReady ? 'connecting' : 'live'

  return (
    <main className="page-shell">
      <header className="topbar">
        {session && (
          <a className="wordmark" href="#top" aria-label="Vehkix home">
            <img src={brandMark} alt="Vehkix" />
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
              {isAdmin && (
                <button
                  className="text-action admin-view-toggle"
                  type="button"
                  aria-pressed={adminView}
                  onClick={() => {
                    setActiveView(adminView ? 'collection' : 'admin')
                    setAdminSection('overview')
                    setQuery('')
                  }}
                >
                  {adminView ? 'My collection' : 'Admin panel'}
                </button>
              )}
              <button className="text-action" type="button" onClick={handleSignOut}>Log out</button>
            </>
          )}
        </div>
      </header>

      <section className="fleet" id="top" aria-labelledby="page-title">
        <div className="page-heading">
          <div>
            <h1 id="page-title">
              {session
                ? adminView
                  ? adminSection === 'vehicles' ? 'Vehicles' : adminSection === 'users' ? 'Users' : adminSection === 'overview' ? 'Admin panel' : 'Field visibility'
                  : 'My vehicles'
                : <img className="brand-wordmark" src={brandWordmark} alt="Vehkix" />}
            </h1>
          </div>
          {session && !adminView && (
            <div className="summary" aria-label="Collection summary">
              <div className="summary-item">
                <strong>{String(vehicleRecords.length).padStart(2, '0')}</strong>
                <span>vehicles</span>
              </div>
              <div className="summary-divider" />
              <button
                className="summary-item due-summary-toggle"
                type="button"
                aria-expanded={showDueVehicles}
                aria-controls="due-vehicle-list"
                onClick={() => setShowDueVehicles((visible) => !visible)}
              >
                <strong>{String(attentionCount).padStart(2, '0')}</strong>
                <span>due within 10 days</span>
              </button>
            </div>
          )}
        </div>

        {session && !adminView && showDueVehicles && (
          <section className="due-summary-panel" id="due-vehicle-list" aria-labelledby="due-summary-title">
            <div className="due-summary-heading">
              <h2 id="due-summary-title">Due within 10 days</h2>
              <span>{attentionCount} {attentionCount === 1 ? 'vehicle' : 'vehicles'}</span>
            </div>
            {dueVehicles.length > 0 ? (
              <ul className="due-vehicle-list">
                {dueVehicles.map(({ vehicle, items }) => (
                  <li className="due-vehicle" key={vehicle.id}>
                    <div className="due-vehicle-heading">
                      {fieldSettings.vehicle_title.show_in_details && (
                        <strong>{getVehicleName(
                          fieldSettings.company.show_in_details ? vehicle.company : null,
                          fieldSettings.model.show_in_details ? vehicle.model : null,
                        )}</strong>
                      )}
                      {fieldSettings.vehicle_number.show_in_details && (
                        <span>{vehicle.vehicle_number || 'Not set'}</span>
                      )}
                      {!fieldSettings.vehicle_number.show_in_details && fieldSettings.id.show_in_details && (
                        <span>{vehicle.id}</span>
                      )}
                    </div>
                    <ul className="due-item-list">
                      {items.map(({ label, date, days }) => (
                        <li className="due-item" key={label}>
                          <span>{label}</span>
                          <strong>{formatDate(date)}</strong>
                          <span className={days < 0 ? 'overdue' : 'upcoming'}>
                            {days < 0
                              ? `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} overdue`
                              : days === 0 ? 'Due today' : days === 1 ? 'Due in 1 day' : `Due in ${days} days`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="due-summary-empty">No vehicles are due within 10 days.</p>
            )}
          </section>
        )}

        {!session && authReady && supabaseClient && (
          <AuthPanel onSubmit={submitAuth} />
        )}

        {!authReady && (
          <p className="empty-state" role="status">Checking your session…</p>
        )}

        {authReady && !supabaseClient && (
          <p className="empty-state error-state" role="alert">Supabase is not configured, so your private collection is unavailable.</p>
        )}

        {session && adminAccessLoading && (
          <p className="empty-state" role="status">Verifying admin access…</p>
        )}

        {session && adminView && (
          <AdminPanel
            userCount={userCount}
            vehicleCount={vehicleRecords.length}
            dueCount={attentionCount}
            fieldSettings={fieldSettings}
            settingsLoading={fieldSettingsLoading}
            settingsError={fieldSettingsError}
            onUpdateFieldSetting={updateFieldSetting}
            activeSection={adminSection}
            accounts={accounts}
            accountsLoading={myVehiclesLoading}
            accountsError={myVehiclesError}
            onSelectSection={(section) => { setAdminSection(section); setQuery('') }}
          >
            {adminSection === 'vehicles' && (
              <>
                <label className="search-box">
                  <span className="search-icon" aria-hidden="true" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search username, email, or vehicles"
                    aria-label="Search users and vehicles"
                  />
                  <span className="result-count">{filteredVehicles.length} shown</span>
                </label>
                {myVehiclesLoading && <p className="empty-state" role="status">Loading user vehicles…</p>}
                {myVehiclesError && <p className="empty-state error-state" role="alert">{myVehiclesError}</p>}
                {!myVehiclesLoading && !myVehiclesError && (
                  <VehicleList
                    vehicles={filteredVehicles}
                    ownerAccounts={filteredAccounts.filter((account) => account.vehicleCount > 0)}
                    query={query}
                    expandedVehicleId={expandedVehicleId}
                    deleteBusy={deleteBusy}
                    showOwner
                    userId={session.user.id}
                    fieldSettings={fieldSettings}
                    onToggleExpanded={(vehicleId) => setExpandedVehicleId(
                      expandedVehicleId === vehicleId ? null : vehicleId,
                    )}
                    onEdit={(vehicle) => { setEditingVehicle(vehicle); setShowVehicleForm(true) }}
                    onDelete={(vehicle) => { void handleDeleteVehicle(vehicle) }}
                  />
                )}
              </>
            )}
          </AdminPanel>
        )}

        {session && !adminView && (
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

        {session && showVehicleForm && (!adminView || editingVehicle) && (
          <VehicleForm
            key={editingVehicle?.id ?? 'new-vehicle'}
            initialDraft={editingVehicle ? toVehicleDraft(editingVehicle) : undefined}
            fieldSettings={fieldSettings}
            existingImages={editingVehicle?.signed_images ?? []}
            initialPrimaryImagePath={editingVehicle?.primary_image}
            onSave={handleVehicleSave}
            onCancel={() => { setShowVehicleForm(false); setEditingVehicle(null) }}
          />
        )}

        {session && !adminView && (
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

        {session && !adminView && myVehiclesLoading && (
          <p className="empty-state" role="status">Loading your collection…</p>
        )}
        {(authError || (session && !adminView && myVehiclesError) || (session && adminAccessError) || actionError) && (
          <p className="empty-state error-state" role="alert">
            {authError || myVehiclesError || adminAccessError || actionError}
          </p>
        )}

        {session && !adminView && !myVehiclesLoading && !myVehiclesError && (
          <VehicleList
            vehicles={filteredVehicles}
            query={query}
            expandedVehicleId={expandedVehicleId}
            deleteBusy={deleteBusy}
            showOwner={false}
            userId={session.user.id}
            fieldSettings={fieldSettings}
            onToggleExpanded={(vehicleId) => setExpandedVehicleId(
              expandedVehicleId === vehicleId ? null : vehicleId,
            )}
            onEdit={(vehicle) => { setEditingVehicle(vehicle); setShowVehicleForm(true) }}
            onDelete={(vehicle) => { void handleDeleteVehicle(vehicle) }}
          />
        )}
        {session && !adminView && (
          <footer className="list-footer">
            <span>“The road ahead belongs to those who keep moving.”</span>
          </footer>
        )}
      </section>
    </main>
  )
}

export default App
