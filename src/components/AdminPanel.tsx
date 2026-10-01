import './AdminPanel.css'

interface AdminPanelProps {
  userCount: number | null
  vehicleCount: number
  dueCount: number
}

function AdminPanel({ userCount, vehicleCount, dueCount }: AdminPanelProps) {
  return (
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
  )
}

export default AdminPanel
