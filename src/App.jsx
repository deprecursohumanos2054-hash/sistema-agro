import { useCallback, useEffect, useState } from 'react'
import { MODULES, getModuleByKey } from './lib/modules'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import DataTable from './components/DataTable'
import RecordModal from './components/RecordModal'

function SetupNotice() {
  return (
    <div className="setup-notice">
      <h1>⚙️ Configuração necessária</h1>
      <p>
        Crie o arquivo <code>.env</code> na raiz do projeto com as credenciais do seu
        projeto Supabase:
      </p>
      <pre>{`VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon`}</pre>
      <p>
        Rode o script <code>supabase/schema.sql</code> no SQL Editor do Supabase e reinicie
        o servidor (<code>npm run dev</code>).
      </p>
    </div>
  )
}

export default function App() {
  const [active, setActive] = useState('dashboard')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const currentModule = getModuleByKey(active)

  const loadRows = useCallback(async () => {
    if (!currentModule) return
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from(currentModule.table)
      .select('*')
      .order('created_at', { ascending: false })
    if (queryError) {
      setError(queryError.message)
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }, [currentModule])

  useEffect(() => {
    if (currentModule) loadRows()
  }, [currentModule, loadRows])

  if (!isSupabaseConfigured) return <SetupNotice />

  function navigate(key) {
    setActive(key)
    setModalOpen(false)
    setEditing(null)
    setSearch('')
  }

  function openNew() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    setModalOpen(true)
  }

  async function handleDelete(row) {
    if (!window.confirm('Tem certeza que deseja excluir este registro?')) return
    const { error: deleteError } = await supabase.from(currentModule.table).delete().eq('id', row.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    loadRows()
  }

  const termo = search.trim().toLowerCase()
  const filteredRows = termo
    ? rows.filter((row) =>
        currentModule.columns.some((c) => String(row[c.name] ?? '').toLowerCase().includes(termo)),
      )
    : rows

  return (
    <div className="layout">
      <Sidebar modules={MODULES} active={active} onNavigate={navigate} />

      <main className="main-content">
        <div className="header-title">
          <span>{active === 'dashboard' ? 'Dashboard Inicial' : `Gestão: ${currentModule.label}`}</span>
          {currentModule && (
            <button type="button" className="btn-novo" onClick={openNew}>
              + Novo Registro
            </button>
          )}
        </div>

        {active === 'dashboard' ? (
          <Dashboard />
        ) : (
          <>
            <div className="toolbar">
              <input
                className="form-input search"
                type="search"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className={`status-msg ${error ? 'erro' : ''}`}>
                {loading ? 'Carregando...' : error ? `Erro: ${error}` : `${filteredRows.length} registro(s)`}
              </div>
            </div>
            {!loading && !error && (
              <DataTable
                columns={currentModule.columns}
                rows={filteredRows}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            )}
          </>
        )}

        {modalOpen && currentModule && (
          <RecordModal
            module={currentModule}
            record={editing}
            onClose={() => {
              setModalOpen(false)
              setEditing(null)
            }}
            onSaved={() => {
              setModalOpen(false)
              setEditing(null)
              loadRows()
            }}
          />
        )}
      </main>
    </div>
  )
}
