import { useState, type ReactNode } from 'react'
import { vehicleFieldDefinitions, type VehicleFieldKey, type VehicleFieldSettings, type VehicleFieldSurface } from '../lib/vehicleSettings'
import type { AdminSection } from '../types/admin'
import type { AdminAccount } from '../types/admin'
import './AdminPanel.css'

interface AdminPanelProps {
  userCount: number | null
  vehicleCount: number
  dueCount: number
  fieldSettings: VehicleFieldSettings
  settingsLoading: boolean
  settingsError: string | null
  onUpdateFieldSetting: (key: VehicleFieldKey, surface: VehicleFieldSurface, visible: boolean) => Promise<string | null>
  activeSection: AdminSection
  onSelectSection: (section: AdminSection) => void
  accounts: AdminAccount[]
  accountsLoading: boolean
  accountsError: string | null
  children?: ReactNode
}

function AdminPanel({
  userCount,
  vehicleCount,
  dueCount,
  fieldSettings,
  settingsLoading,
  settingsError,
  onUpdateFieldSetting,
  activeSection,
  onSelectSection,
  accounts,
  accountsLoading,
  accountsError,
  children,
}: AdminPanelProps) {
  const [savingField, setSavingField] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [userQuery, setUserQuery] = useState('')
  const groups = [...new Set(vehicleFieldDefinitions.map((field) => field.group))]
  const surfaceOptions: { key: VehicleFieldSurface; label: string; description: string }[] = [
    { key: 'form', label: 'Add & Edit', description: 'Choose which fields users can enter or update.' },
    { key: 'details', label: 'Details', description: 'Choose which fields appear in vehicle cards and details.' },
    { key: 'share', label: 'Share', description: 'Choose which fields users can include when printing.' },
  ]
  const activeSurface = activeSection === 'form' || activeSection === 'details' || activeSection === 'share'
    ? activeSection
    : null
  const activeSurfaceOption = surfaceOptions.find((surface) => surface.key === activeSurface)

  async function updateField(key: VehicleFieldKey, surface: VehicleFieldSurface, visible: boolean) {
    const pendingKey = `${key}:${surface}`
    setSavingField(pendingKey)
    setSaveError(null)
    try {
      setSaveError(await onUpdateFieldSetting(key, surface, visible))
    } catch {
      setSaveError('Could not save this field setting.')
    } finally {
      setSavingField(null)
    }
  }

  return (
    <div className="admin-layout">
      <nav className="admin-section-nav" aria-label="Admin sections">
        <button
          type="button"
          className="admin-section-link"
          aria-current={activeSection === 'overview' ? 'page' : undefined}
          onClick={() => onSelectSection('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className="admin-section-link"
          aria-current={activeSection === 'users' ? 'page' : undefined}
          onClick={() => onSelectSection('users')}
        >
          Users
        </button>
        <button
          type="button"
          className="admin-section-link"
          aria-current={activeSection === 'vehicles' ? 'page' : undefined}
          onClick={() => onSelectSection('vehicles')}
        >
          Vehicles
        </button>
        <span className="admin-nav-section-label">Field visibility</span>
        {surfaceOptions.map((surface) => (
          <button
            type="button"
            className="admin-section-link"
            aria-current={activeSection === surface.key ? 'page' : undefined}
            key={surface.key}
            onClick={() => onSelectSection(surface.key)}
          >
            {surface.label}
          </button>
        ))}
      </nav>

      <div className="admin-section-content">
        {activeSection === 'overview' && (
          <section className="admin-dashboard" aria-labelledby="admin-dashboard-title">
            <div className="admin-dashboard-heading">
              <div>
                <p className="eyebrow">ADMINISTRATION</p>
                <h2 id="admin-dashboard-title">Overview</h2>
              </div>
              <span>All account collections</span>
            </div>
            <div className="admin-metrics">
              <div className="admin-metric">
                <span>Accounts</span>
                <strong>{userCount == null ? '—' : userCount.toLocaleString()}</strong>
              </div>
              <div className="admin-metric">
                <span>Vehicles managed</span>
                <strong>{vehicleCount.toLocaleString()}</strong>
              </div>
              <div className="admin-metric attention-metric">
                <span>Due within 10 days</span>
                <strong>{dueCount.toLocaleString()}</strong>
              </div>
            </div>
          </section>
        )}

        {activeSection === 'vehicles' && (
          <section className="admin-users-vehicles" aria-labelledby="admin-users-vehicles-title">
            <header className="admin-section-heading">
              <div>
                <p className="eyebrow">ACCOUNT COLLECTIONS</p>
                <h2 id="admin-users-vehicles-title">Vehicles</h2>
              </div>
              <span>{userCount == null ? '—' : `${userCount.toLocaleString()} accounts`}</span>
            </header>
            {children}
          </section>
        )}

        {activeSection === 'users' && (
          <section className="admin-users-directory" aria-labelledby="admin-users-directory-title">
            <header className="admin-section-heading">
              <div>
                <p className="eyebrow">ACCOUNT DIRECTORY</p>
                <h2 id="admin-users-directory-title">Users</h2>
              </div>
              <span>{accountsLoading ? 'Loading…' : `${accounts.length.toLocaleString()} accounts`}</span>
            </header>
            {accountsError ? (
              <p className="admin-settings-message error-state" role="alert">{accountsError}</p>
            ) : accountsLoading ? (
              <p className="admin-settings-message" role="status">Loading user accounts…</p>
            ) : (
              <>
                <label className="admin-account-search">
                  <span className="visually-hidden">Search users by username or email</span>
                  <input
                    type="search"
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                    placeholder="Search username or email"
                  />
                  <span>{accounts.filter((account) => `${account.username} ${account.email ?? ''}`.toLowerCase().includes(userQuery.trim().toLowerCase())).length} shown</span>
                </label>
                <div className="admin-account-table" role="table" aria-label="User accounts">
                  <div className="admin-account-row admin-account-header" role="row">
                    <span role="columnheader">Username</span>
                    <span role="columnheader">Email</span>
                    <span role="columnheader">Vehicles</span>
                  </div>
                  {accounts
                    .filter((account) => `${account.username} ${account.email ?? ''}`.toLowerCase().includes(userQuery.trim().toLowerCase()))
                    .map((account) => (
                      <div className="admin-account-row" role="row" key={account.id}>
                        <span className="admin-account-username" role="rowheader">{account.username}</span>
                        <span className="admin-account-email">{account.email || 'Email unavailable'}</span>
                        <span className="admin-account-vehicle-count">{account.vehicleCount}</span>
                      </div>
                    ))}
                  {accounts.length === 0 && (
                    <p className="admin-settings-message">No user accounts found.</p>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {activeSurface && (
          <section className="admin-field-settings" aria-labelledby="admin-field-settings-title">
            <header className="admin-field-settings-heading">
              <div>
                <p className="eyebrow">FIELD VISIBILITY</p>
                <h2 id="admin-field-settings-title">{activeSurfaceOption?.label}</h2>
              </div>
              <p>Set which fields are available in {activeSurfaceOption?.label}.</p>
            </header>
            {settingsError && <p className="admin-settings-message error-state" role="alert">{settingsError}</p>}
            {saveError && <p className="admin-settings-message error-state" role="alert">{saveError}</p>}
            {settingsLoading ? (
              <p className="admin-settings-message" role="status">Loading field settings…</p>
            ) : (
              <div className="admin-field-groups">
                {groups.map((group) => (
                  <section className="admin-field-group" key={group} aria-labelledby={`admin-fields-${activeSurface}-${group}`}>
                    <h3 id={`admin-fields-${activeSurface}-${group}`}>{group}</h3>
                    <div className="admin-field-table" role="table" aria-label={`${group} ${activeSurface} fields`}>
                      <div className="admin-field-row admin-field-header" role="row">
                        <span role="columnheader">Field</span>
                        <span role="columnheader">Available</span>
                      </div>
                      {vehicleFieldDefinitions.filter((field) => field.group === group).map((field) => {
                        const available = activeSurface !== 'form' || field.form
                        const checked = activeSurface === 'form'
                          ? fieldSettings[field.key].show_in_form
                          : activeSurface === 'details'
                            ? fieldSettings[field.key].show_in_details
                            : fieldSettings[field.key].allow_share
                        return (
                          <div className="admin-field-row" role="row" key={field.key}>
                            <span className="admin-field-name" role="rowheader">{field.label}</span>
                            <label className="admin-field-toggle">
                              <span className="visually-hidden">{activeSurfaceOption?.label}: {field.label}</span>
                              {available ? (
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={savingField === `${field.key}:${activeSurface}`}
                                  onChange={(event) => void updateField(field.key, activeSurface, event.target.checked)}
                                />
                              ) : <span className="admin-field-unavailable" aria-label="Not applicable">—</span>}
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

export default AdminPanel
