export default function Sidebar({ modules, active, onNavigate, showLogout, onLogout }) {
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
      <button
        type="button"
        className={`nav-btn ${active === 'financeiro' ? 'active' : ''}`}
        onClick={() => onNavigate('financeiro')}
      >
        💵 Financeiro
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
      {showLogout && (
        <button type="button" className="nav-btn logout-btn" onClick={onLogout}>
          🚪 Sair
        </button>
      )}
    </aside>
  )
}
