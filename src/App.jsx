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
  const [modalOpen, setModalOpen] = useState(false)

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
  }

  return (
    <div className="layout">
      <Sidebar modules={MODULES} active={active} onNavigate={navigate} />

      <main className="main-content">
        <div className="header-title">
          <span>{active === 'dashboard' ? 'Dashboard Inicial' : `Gestão: ${currentModule.label}`}</span>
          {currentModule && (
            <button type="button" className="btn-novo" onClick={() => setModalOpen(true)}>
              + Novo Registro
            </button>
          )}
        </div>

        {active === 'dashboard' ? (
          <Dashboard />
        ) : (
          <>
            <div className={`status-msg ${error ? 'erro' : ''}`}>
              {loading ? 'Carregando...' : error ? `Erro: ${error}` : `${rows.length} registro(s)`}
            </div>
            {!loading && !error && <DataTable columns={currentModule.columns} rows={rows} />}
          </>
        )}

        {modalOpen && currentModule && (
          <RecordModal
            module={currentModule}
            onClose={() => setModalOpen(false)}
            onSaved={() => {
              setModalOpen(false)
              loadRows()
            }}
          />
        )}
      </main>
    </div>
  )
}
