import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num } from '../lib/format'
import { signOut } from '../lib/auth'
import InstallButton from './InstallButton'

function dataBR(iso) {
  if (!iso) return '-'
  const partes = String(iso).slice(0, 10).split('-')
  if (partes.length !== 3) return String(iso)
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

// Texto da coluna "Situação" de cada conta.
function textoSituacao(item) {
  if (item.situacao === 'pago') return 'Pago'
  if (item.situacao === 'sem-data') return 'Sem data de vencimento'
  if (item.situacao === 'vence-hoje') return 'Vence hoje'
  const dias = Math.abs(Number(item.dias_atraso) || 0)
  if (item.situacao === 'vencido') return `${dias} dia(s) de atraso`
  return `Vence em ${dias} dia(s)`
}

function classeSituacao(item) {
  if (item.situacao === 'pago') return 'sit-pago'
  if (item.situacao === 'vencido') return 'sit-atrasado'
  if (item.situacao === 'sem-data') return 'sit-ok'
  return 'sit-hoje'
}

const ABAS = [
  { key: 'vencidos', label: '🔴 Vencidos' },
  { key: 'a-vencer', label: '🟡 A vencer' },
  { key: 'pagos', label: '🟢 Já pagos' },
]

const ORDENS = [
  { key: 'vencimento', label: 'Vencimento (mais próximo)' },
  { key: 'pagamento', label: 'Pagamento (mais recente)' },
  { key: 'valor', label: 'Valor (maior primeiro)' },
  { key: 'nome', label: 'Nome (A-Z)' },
]

const PERIODOS = [
  { key: 'tudo', label: 'Todo o período' },
  { key: 'mes', label: 'Este mês' },
  { key: 'ano', label: 'Este ano' },
]

function ordenar(lista, ordem) {
  const porNome = (a, b) =>
    String(a.descricao || '').localeCompare(String(b.descricao || ''), 'pt-BR')
  return [...lista].sort((a, b) => {
    if (ordem === 'pagamento') {
      const da = a.data_pagamento || ''
      const db = b.data_pagamento || ''
      if (da !== db) {
        if (!da) return 1
        if (!db) return -1
        return db.localeCompare(da)
      }
      return porNome(a, b)
    }
    if (ordem === 'valor') return num(b.valor) - num(a.valor)
    if (ordem === 'nome') return porNome(a, b)
    const va = a.vencimento || ''
    const vb = b.vencimento || ''
    if (va !== vb) {
      if (!va) return 1
      if (!vb) return -1
      return va.localeCompare(vb)
    }
    return porNome(a, b)
  })
}

function hoje() {
  const d = new Date()
  return {
    mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    ano: String(d.getFullYear()),
  }
}

function passaPeriodo(item, periodo) {
  if (periodo === 'tudo') return true
  const data = item.data_pagamento || ''
  if (!data) return false
  const { mes, ano } = hoje()
  return periodo === 'mes' ? data.slice(0, 7) === mes : data.slice(0, 4) === ano
}

function TabelaContas({ itens, aba }) {
  if (!itens.length) return <p className="muted">Nenhuma conta nesta situação.</p>
  const pago = aba === 'pagos'
  return (
    <div className="table-container consulta-tabela">
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Descrição</th>
            <th>Vencimento</th>
            <th>{pago ? 'Pagamento' : 'Último pagamento'}</th>
            <th className="num-col">{pago ? 'Valor pago' : 'Valor'}</th>
            {!pago && <th className="num-col">Pago</th>}
            {!pago && <th className="num-col">Saldo</th>}
            <th>Situação</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, indice) => (
            <tr
              key={`${item.tipo}-${item.descricao}-${item.vencimento}-${indice}`}
              className={item.situacao === 'vencido' ? 'row-alerta' : ''}
            >
              <td>
                <span className={`tag ${item.tipo === 'Pagar' ? 'tag-saida' : 'tag-entrada'}`}>
                  {item.tipo === 'Pagar' ? 'Pagar' : 'Receber'}
                </span>
              </td>
              <td>
                <div className="consulta-cliente">{item.descricao}</div>
                {item.detalhe && <div className="consulta-detalhe">{item.detalhe}</div>}
              </td>
              <td>{item.vencimento ? dataBR(item.vencimento) : '-'}</td>
              <td>{item.data_pagamento ? dataBR(item.data_pagamento) : '-'}</td>
              <td className="num-col">{pago ? brl(item.valor_pago) : brl(item.valor)}</td>
              {!pago && <td className="num-col">{brl(item.valor_pago)}</td>}
              {!pago && (
                <td className={`num-col ${item.situacao === 'vencido' ? 'sit-atrasado' : 'saldo-aberto'}`}>
                  {brl(item.saldo)}
                </td>
              )}
              <td className={classeSituacao(item)}>{textoSituacao(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Tela do usuário de CONSULTA: relatórios somente leitura de contas
// vencidas, a vencer e já pagas (a receber e a pagar).
// Não tem menu, botões de edição nem acesso direto às tabelas do sistema
// (o banco também bloqueia qualquer alteração pelo RLS).
export default function Consulta() {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [itens, setItens] = useState([])
  const [modoAntigo, setModoAntigo] = useState(false)
  const [aba, setAba] = useState('vencidos')
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [periodo, setPeriodo] = useState('tudo')
  const [ordens, setOrdens] = useState({
    vencidos: 'vencimento',
    'a-vencer': 'vencimento',
    pagos: 'pagamento',
  })

  useEffect(() => {
    let ativo = true

    // Se a função nova ainda não existir no banco, usa a antiga (só vendas)
    // para a tela continuar funcionando até o administrador rodar o script.
    async function carregar() {
      const nova = await supabase.rpc('relatorio_contas')
      if (!ativo) return

      if (!nova.error) {
        setItens(Array.isArray(nova.data) ? nova.data : [])
        setModoAntigo(false)
        setErro('')
        setLoading(false)
        return
      }

      const antiga = await supabase.rpc('contas_restritas')
      if (!ativo) return

      if (antiga.error) {
        setErro(
          /function|schema cache|not find/i.test(antiga.error.message)
            ? 'Os relatórios ainda não foram ativados no banco. Peça ao administrador para rodar o script supabase/relatorio-contas.sql no Supabase.'
            : antiga.error.message,
        )
        setItens([])
      } else {
        setItens(
          (Array.isArray(antiga.data) ? antiga.data : []).map((r) => ({
            tipo: 'Receber',
            origem: 'venda',
            descricao: r.cliente,
            detalhe: 'Venda de suínos',
            valor: num(r.valor_total),
            valor_pago: num(r.valor_recebido),
            saldo: num(r.saldo_devedor),
            vencimento: r.vencimento,
            data_pagamento: null,
            situacao: r.situacao,
            dias_atraso: r.dias_atraso,
          })),
        )
        setModoAntigo(true)
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
    return itens.filter((item) => {
      if (tipo !== 'todos' && item.tipo !== tipo) return false
      if (!termo) return true
      return (
        String(item.descricao || '').toLowerCase().includes(termo) ||
        String(item.detalhe || '').toLowerCase().includes(termo)
      )
    })
  }, [itens, busca, tipo])

  const vencidos = filtrados.filter((item) => item.situacao === 'vencido')
  const aVencer = filtrados.filter((item) =>
    ['a-vencer', 'vence-hoje', 'sem-data'].includes(item.situacao),
  )
  const pagos = filtrados.filter(
    (item) => item.situacao === 'pago' && passaPeriodo(item, periodo),
  )

  const soma = (lista, campo) => lista.reduce((total, item) => total + num(item[campo]), 0)
  const totalVencido = soma(vencidos, 'saldo')
  const totalAVencer = soma(aVencer, 'saldo')
  const totalAberto = totalVencido + totalAVencer
  const totalPago = soma(pagos, 'valor_pago')

  const listas = { vencidos, 'a-vencer': aVencer, pagos }
  const lista = ordenar(listas[aba], ordens[aba])

  const totais = {
    vencidos: [
      { label: 'contas', valor: String(vencidos.length) },
      { label: 'saldo', valor: brl(totalVencido) },
    ],
    'a-vencer': [
      { label: 'contas', valor: String(aVencer.length) },
      { label: 'saldo', valor: brl(totalAVencer) },
    ],
    pagos: [
      { label: 'contas', valor: String(pagos.length) },
      { label: 'pago', valor: brl(totalPago) },
    ],
  }[aba]

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
        Relatórios somente leitura: contas vencidas, a vencer e já pagas (a receber e a pagar).
        Você não pode alterar nenhum dado.
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
              <div className="card-value">{brl(totalAberto)}</div>
              <div className="card-sub">{vencidos.length + aVencer.length} conta(s)</div>
            </div>
            <div className="glass-card">
              <div className="card-title">Total já pago</div>
              <div className="card-value positivo">{brl(totalPago)}</div>
              <div className="card-sub">{pagos.length} conta(s) quitada(s)</div>
            </div>
          </div>

          <div className="consulta-abas" role="tablist">
            {ABAS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={aba === item.key}
                className={`consulta-aba ${aba === item.key ? 'ativa' : ''}`}
                onClick={() => setAba(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="consulta-filtros">
            <div className="form-group">
              <label htmlFor="consulta-busca">Buscar</label>
              <input
                id="consulta-busca"
                className="form-input search"
                type="search"
                placeholder="Cliente, fornecedor ou lote..."
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="consulta-tipo">Tipo</label>
              <select
                id="consulta-tipo"
                className="form-input"
                value={tipo}
                onChange={(event) => setTipo(event.target.value)}
              >
                <option value="todos">Todos (receber e pagar)</option>
                <option value="Receber">Só a receber (clientes)</option>
                <option value="Pagar">Só a pagar (fornecedor e extras)</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="consulta-ordem">Ordenar por</label>
              <select
                id="consulta-ordem"
                className="form-input"
                value={ordens[aba]}
                onChange={(event) =>
                  setOrdens((atual) => ({ ...atual, [aba]: event.target.value }))
                }
              >
                {ORDENS.map((opcao) => (
                  <option key={opcao.key} value={opcao.key}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </div>
            {aba === 'pagos' && (
              <div className="form-group">
                <label htmlFor="consulta-periodo">Período do pagamento</label>
                <select
                  id="consulta-periodo"
                  className="form-input"
                  value={periodo}
                  onChange={(event) => setPeriodo(event.target.value)}
                >
                  {PERIODOS.map((opcao) => (
                    <option key={opcao.key} value={opcao.key}>
                      {opcao.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {modoAntigo && (
            <p className="muted consulta-aviso">
              Mostrando apenas contas a receber. Os relatórios completos (a pagar e já pagos)
              aparecem depois que o administrador rodar o script
              <strong> supabase/relatorio-contas.sql</strong> no Supabase.
            </p>
          )}

          <section className="consulta-secao">
            <h2>
              <span>{ABAS.find((item) => item.key === aba)?.label}</span>
              <span className="consulta-totais">
                {totais.map((t) => (
                  <span key={t.label}>
                    {t.label}: <strong>{t.valor}</strong>
                  </span>
                ))}
              </span>
            </h2>
            <TabelaContas itens={lista} aba={aba} />
          </section>
        </>
      )}
    </div>
  )
}
