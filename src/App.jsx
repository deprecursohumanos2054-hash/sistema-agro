import { useCallback, useEffect, useState } from 'react'
import { MODULES, getModuleByKey } from './lib/modules'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { exportCsv } from './lib/csv'
import { parseDateBR } from './lib/date'
import { num } from './lib/format'
import { authRequired, getSession, onAuthChange, signOut } from './lib/auth'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Financeiro from './components/Financeiro'
import Configuracoes from './components/Configuracoes'
import Login from './components/Login'
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

function sortRows(list, sort, columns) {
  if (!sort) return list
  const coluna = columns.find((c) => c.name === sort.name)
  if (!coluna) return list
  const dir = sort.dir === 'desc' ? -1 : 1
  const valor = (row) => (coluna.compute ? coluna.compute(row) : row[coluna.name])
  return [...list].sort((a, b) => {
    const va = valor(a)
    const vb = valor(b)
    if (coluna.type === 'date') {
      const da = parseDateBR(va)
      const db = parseDateBR(vb)
      return ((da ? da.getTime() : -Infinity) - (db ? db.getTime() : -Infinity)) * dir
    }
    if (coluna.type === 'number') return (num(va) - num(vb)) * dir
    return String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', { sensitivity: 'base' }) * dir
  })
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!authRequired)
  const [active, setActive] = useState('dashboard')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [sort, setSort] = useState(null)

  const currentModule = getModuleByKey(active)
  const colunasVisiveis = currentModule
    ? currentModule.columns.filter((c) => !c.esconderQuando || !c.esconderQuando(activeFilters))
    : []

  useEffect(() => {
    if (!authRequired) return
    getSession().then((s) => {
      setSession(s)
      setAuthReady(true)
    })
    const sub = onAuthChange((s) => setSession(s))
    return () => sub.unsubscribe()
  }, [])

  const loadRows = useCallback(async () => {
    if (!currentModule) return
    setLoading(true)
    setError('')
    let query = supabase.from(currentModule.table).select('*')
    for (const [coluna, valor] of Object.entries(currentModule.fixed || {})) {
      query = query.eq(coluna, valor)
    }
    const { data, error: queryError } = await query.order('created_at', { ascending: false })
    if (queryError) {
      setError(queryError.message)
      setRows([])
    } else {
      const lista = data || []
      setRows(currentModule.decorate ? currentModule.decorate(lista) : lista)
    }
    setLoading(false)
  }, [currentModule])

  useEffect(() => {
    if (currentModule) loadRows()
  }, [currentModule, loadRows])

  if (!isSupabaseConfigured) return <SetupNotice />
  if (!authReady) return <div className="empty">Verificando sessão...</div>
  if (authRequired && !session) return <Login />

  function navigate(key) {
    setActive(key)
    setModalOpen(false)
    setEditing(null)
    setSearch('')
    setActiveFilters({})
    setSort(getModuleByKey(key)?.sort || null)
  }

  function toggleSort(column) {
    setSort((prev) =>
      prev && prev.name === column.name
        ? { name: column.name, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { name: column.name, dir: 'asc' },
    )
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
  let filteredRows = rows
  if (termo) {
    filteredRows = filteredRows.filter((row) =>
      currentModule.columns.some((c) => String(row[c.name] ?? '').toLowerCase().includes(termo)),
    )
  }
  for (const f of currentModule?.filters || []) {
    const valor = activeFilters[f.name]
    if (valor) filteredRows = filteredRows.filter((r) => String(r[f.name] ?? '') === valor)
  }
  filteredRows = sortRows(filteredRows, sort, currentModule?.columns || [])

  const filterOptions = {}
  for (const f of currentModule?.filters || []) {
    filterOptions[f.name] = [
      ...new Set(rows.map((r) => r[f.name]).filter((v) => v !== null && v !== undefined && v !== '')),
    ].sort()
  }

  const titulo =
    active === 'dashboard'
      ? 'Dashboard Inicial'
      : active === 'financeiro'
        ? 'Financeiro — Contas a Pagar / Receber'
        : active === 'configuracoes'
          ? 'Configurações'
          : `Gestão: ${currentModule.label}`

  return (
    <div className="layout">
      <Sidebar
        modules={MODULES}
        active={active}
        onNavigate={navigate}
        showLogout={authRequired}
        onLogout={signOut}
      />

      <main className="main-content">
        <div className="header-title">
          <span>{titulo}</span>
          {currentModule && (
            <button type="button" className="btn-novo" onClick={openNew}>
              + Novo Registro
            </button>
          )}
        </div>

        {active === 'dashboard' && <Dashboard />}
        {active === 'financeiro' && <Financeiro />}
        {active === 'configuracoes' && <Configuracoes />}

        {currentModule && (
          <>
            <div className="toolbar">
              <input
                className="form-input search"
                type="search"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {(currentModule.filters || []).map((f) => (
                <select
                  key={f.name}
                  className="form-input filter-select"
                  value={activeFilters[f.name] || ''}
                  onChange={(e) =>
                    setActiveFilters((prev) => ({ ...prev, [f.name]: e.target.value }))
                  }
                >
                  <option value="">{f.label}: todos</option>
                  {filterOptions[f.name].map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              ))}
              <button
                type="button"
                className="btn-ghost"
                disabled={!filteredRows.length}
                onClick={() => exportCsv(`${currentModule.key}.csv`, colunasVisiveis, filteredRows)}
              >
                ⬇️ Exportar CSV
              </button>
              <div className={`status-msg ${error ? 'erro' : ''}`}>
                {loading ? 'Carregando...' : error ? `Erro: ${error}` : `${filteredRows.length} registro(s)`}
              </div>
            </div>
            {!loading && !error && (
              <DataTable
                columns={colunasVisiveis}
                rows={filteredRows}
                rowAlert={currentModule.rowAlert}
                sort={sort}
                onSort={toggleSort}
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
