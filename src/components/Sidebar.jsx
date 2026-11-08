export default function Sidebar({ modules, active, onNavigate, showLogout, onLogout, aberta, onClose }) {
  return (
    <aside className={`sidebar${aberta ? ' aberta' : ''}`}>
      <div className="brand">
        <span>🌱 Agro ERP</span>
        <button
          type="button"
          className="sidebar-close"
          aria-label="Fechar menu"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
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
      <button
        type="button"
        className={`nav-btn ${active === 'acumulado' ? 'active' : ''}`}
        onClick={() => onNavigate('acumulado')}
      >
        📊 Acumulado
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
      <button
        type="button"
        className={`nav-btn ${active === 'configuracoes' ? 'active' : ''}`}
        onClick={() => onNavigate('configuracoes')}
      >
        ⚙️ Configurações
      </button>
      {showLogout && (
        <button type="button" className="nav-btn logout-btn" onClick={onLogout}>
          🚪 Sair
        </button>
      )}
    </aside>
  )
}
