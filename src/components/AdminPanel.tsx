import { useState } from 'react'
import { vehicleFieldDefinitions, type VehicleFieldKey, type VehicleFieldSettings, type VehicleFieldSurface } from '../lib/vehicleSettings'
import './AdminPanel.css'

interface AdminPanelProps {
  userCount: number | null
  vehicleCount: number
  dueCount: number
  fieldSettings: VehicleFieldSettings
  settingsLoading: boolean
  settingsError: string | null
  onUpdateFieldSetting: (key: VehicleFieldKey, surface: VehicleFieldSurface, visible: boolean) => Promise<string | null>
}

function AdminPanel({
  userCount,
  vehicleCount,
  dueCount,
  fieldSettings,
  settingsLoading,
  settingsError,
  onUpdateFieldSetting,
}: AdminPanelProps) {
  const [activeSurface, setActiveSurface] = useState<VehicleFieldSurface>('form')
  const [savingField, setSavingField] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const groups = [...new Set(vehicleFieldDefinitions.map((field) => field.group))]
  const surfaceOptions: { key: VehicleFieldSurface; label: string; description: string }[] = [
    { key: 'form', label: 'Add & Edit', description: 'Choose which fields users can enter or update.' },
    { key: 'details', label: 'Details', description: 'Choose which fields appear in vehicle cards and details.' },
    { key: 'share', label: 'Share', description: 'Choose which fields users can include when printing.' },
  ]

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
    <>
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

      <section className="admin-field-settings" aria-labelledby="admin-field-settings-title">
        <header className="admin-field-settings-heading">
          <div>
            <p className="eyebrow">COLLECTION DISPLAY</p>
            <h2 id="admin-field-settings-title">Field visibility</h2>
          </div>
          <p>Set field availability independently for each vehicle workflow.</p>
        </header>
        {settingsError && <p className="admin-settings-message error-state" role="alert">{settingsError}</p>}
        {saveError && <p className="admin-settings-message error-state" role="alert">{saveError}</p>}
        {settingsLoading ? (
          <p className="admin-settings-message" role="status">Loading field settings…</p>
        ) : (
          <>
            <div className="admin-field-tabs" role="tablist" aria-label="Field settings surface">
              {surfaceOptions.map((surface) => (
                <button
                  type="button"
                  role="tab"
                  id={`admin-surface-tab-${surface.key}`}
                  aria-selected={activeSurface === surface.key}
                  aria-controls="admin-field-panel"
                  className="admin-field-tab"
                  key={surface.key}
                  onClick={() => setActiveSurface(surface.key)}
                >
                  {surface.label}
                </button>
              ))}
            </div>
            <section
              className="admin-field-panel"
              id="admin-field-panel"
              role="tabpanel"
              aria-labelledby={`admin-surface-tab-${activeSurface}`}
            >
              <p className="admin-field-panel-description">
                {surfaceOptions.find((surface) => surface.key === activeSurface)?.description}
              </p>
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
                              <span className="visually-hidden">{surfaceOptions.find((surface) => surface.key === activeSurface)?.label}: {field.label}</span>
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
            </section>
          </>
        )}
      </section>
    </>
  )
}

export default AdminPanel
