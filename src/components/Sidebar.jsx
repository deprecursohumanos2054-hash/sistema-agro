export default function Sidebar({ modules, active, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand">🌱 Agro ERP</div>
      <button
        type="button"
        className={`nav-btn ${active === 'dashboard' ? 'active' : ''}`}
        onClick={() => onNavigate('dashboard')}
      >
        🏠 Dashboard
      </button>
      {modules.map((m) => (
        <button
          key={m.key}
          type="button"
          className={`nav-btn ${active === m.key ? 'active' : ''}`}
          onClick={() => onNavigate(m.key)}
        >
          {m.icon} {m.label}
        </button>
      ))}
    </aside>
  )
}
