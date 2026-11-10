import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl } from '../lib/format'
import { signOut } from '../lib/auth'
import InstallButton from './InstallButton'

function dataBR(iso) {
  if (!iso) return 'Sem data'
  const partes = String(iso).slice(0, 10).split('-')
  if (partes.length !== 3) return String(iso)
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function textoPrazo(item) {
  if (item.situacao === 'sem-data') return 'Sem data de vencimento'
  if (item.situacao === 'vencido') {
    const dias = Math.abs(Number(item.dias_atraso) || 0)
    return `${dias} dia(s) de atraso`
  }
  if (item.situacao === 'vence-hoje') return 'Vence hoje'
  const dias = Math.abs(Number(item.dias_atraso) || 0)
  return `Vence em ${dias} dia(s)`
}

function TabelaContas({ itens }) {
  if (!itens.length) return <p className="muted">Nenhuma conta nesta situação.</p>
  return (
    <div className="table-container consulta-tabela">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Vencimento</th>
            <th>Situação</th>
            <th>Saldo Devedor</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, indice) => (
            <tr key={`${item.cliente}-${item.vencimento}-${indice}`}>
              <td className="consulta-cliente">{item.cliente}</td>
              <td>{dataBR(item.vencimento)}</td>
              <td className={item.situacao === 'vencido' ? 'sit-atrasado' : 'sit-hoje'}>
                {textoPrazo(item)}
              </td>
              <td className={item.situacao === 'vencido' ? 'sit-atrasado' : 'saldo-aberto'}>
                {brl(item.saldo_devedor)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Tela do usuário de CONSULTA: só mostra saldos a vencer e vencidos.
// Não tem menu, botões de edição nem acesso às tabelas do sistema (o banco
// também bloqueia qualquer alteração pelo RLS).
export default function Consulta() {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [itens, setItens] = useState([])
  const [busca, setBusca] = useState('')

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const { data, error } = await supabase.rpc('contas_restritas')
      if (!ativo) return
      if (error) {
        setErro(
          /function|schema cache|not find/i.test(error.message)
            ? 'A consulta ainda não foi ativada no banco. Peça ao administrador para rodar o script supabase/rls-consulta-admin.sql no Supabase.'
            : error.message,
        )
        setItens([])
      } else {
        setItens(Array.isArray(data) ? data : [])
        setErro('')
      }
      setLoading(false)
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return itens
    return itens.filter((item) => String(item.cliente || '').toLowerCase().includes(termo))
  }, [itens, busca])

  const vencidos = filtrados.filter((item) => item.situacao === 'vencido')
  const aVencer = filtrados.filter(
    (item) => item.situacao === 'a-vencer' || item.situacao === 'vence-hoje',
  )
  const semData = filtrados.filter((item) => item.situacao === 'sem-data')

  const totalVencido = vencidos.reduce((soma, item) => soma + Number(item.saldo_devedor || 0), 0)
  const totalAVencer = aVencer.reduce((soma, item) => soma + Number(item.saldo_devedor || 0), 0)
  const totalGeral = totalVencido + totalAVencer +
    semData.reduce((soma, item) => soma + Number(item.saldo_devedor || 0), 0)

  return (
    <div className="consulta-page">
      <header className="consulta-topo">
        <div className="consulta-marca">
          <span>🌱 Agro ERP</span>
          <span className="consulta-badge">Consulta</span>
        </div>
        <div className="consulta-acoes">
          <InstallButton variante="ghost" />
          <button type="button" className="btn-ghost" onClick={() => signOut()}>
            🚪 Sair
          </button>
        </div>
      </header>

      <p className="muted consulta-aviso">
        Visualização somente leitura das contas a vencer e vencidas. Você não pode alterar
        nenhum dado.
      </p>

      {loading && <div className="empty">Carregando...</div>}
      {!loading && erro && <div className="empty">Erro: {erro}</div>}

      {!loading && !erro && (
        <>
          <div className="consulta-cards">
            <div className="glass-card">
              <div className="card-title">Total vencido</div>
              <div className="card-value negativo">{brl(totalVencido)}</div>
              <div className="card-sub">{vencidos.length} conta(s) em atraso</div>
            </div>
            <div className="glass-card">
              <div className="card-title">Total a vencer</div>
              <div className="card-value sit-hoje">{brl(totalAVencer)}</div>
              <div className="card-sub">{aVencer.length} conta(s) no prazo</div>
            </div>
            <div className="glass-card">
              <div className="card-title">Total em aberto</div>
              <div className="card-value">{brl(totalGeral)}</div>
              <div className="card-sub">{filtrados.length} conta(s)</div>
            </div>
          </div>

          <div className="consulta-busca">
            <input
              className="form-input search"
              type="search"
              placeholder="Buscar cliente..."
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </div>

          <section className="consulta-secao">
            <h2>
              <span>🔴 Vencido</span>
              <span className="sit-atrasado">{brl(totalVencido)}</span>
            </h2>
            <TabelaContas itens={vencidos} />
          </section>

          <section className="consulta-secao">
            <h2>
              <span>🟡 A vencer</span>
              <span className="sit-hoje">{brl(totalAVencer)}</span>
            </h2>
            <TabelaContas itens={aVencer} />
          </section>

          {semData.length > 0 && (
            <section className="consulta-secao">
              <h2>
                <span>⚪ Sem data de vencimento</span>
                <span>{brl(semData.reduce((s, i) => s + Number(i.saldo_devedor || 0), 0))}</span>
              </h2>
              <TabelaContas itens={semData} />
            </section>
          )}
        </>
      )}
    </div>
  )
}
