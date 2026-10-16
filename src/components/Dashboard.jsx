import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num } from '../lib/format'

function agrupar(lista, chave, valor) {
  const mapa = new Map()
  for (const item of lista) {
    const k = item[chave] || 'Sem informação'
    mapa.set(k, (mapa.get(k) || 0) + valor(item))
  }
  return [...mapa.entries()].sort((a, b) => b[1] - a[1])
}

function BarrasHorizontais({ dados, formato }) {
  if (!dados.length) return <p className="muted">Sem dados.</p>
  const max = Math.max(...dados.map(([, v]) => v), 1)
  return (
    <div className="hbars">
      {dados.map(([rotulo, valor]) => (
        <div className="hbar-row" key={rotulo}>
          <span className="hbar-label">{rotulo}</span>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${Math.round((valor / max) * 100)}%` }} />
          </div>
          <span className="hbar-value">{formato ? formato(valor) : valor}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState({ saldo: 0, animais: 0, entradas: 0, saidas: 0, lucro: 0 })
  const [alertas, setAlertas] = useState([])
  const [porSetor, setPorSetor] = useState([])
  const [porFinalidade, setPorFinalidade] = useState([])

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setLoading(true)
      setError('')

      const [caixaRes, lotesRes, estoqueRes] = await Promise.all([
        supabase.from('fluxo_caixa').select('valor, categoria, setor'),
        supabase
          .from('lotes_animais')
          .select('quantidade, proposito, status_pagamento, valor_compra, custos_extras, valor_venda'),
        supabase.from('estoque').select('item, saldo_atual, estoque_minimo'),
      ])

      if (!ativo) return

      const erro = caixaRes.error || lotesRes.error || estoqueRes.error
      if (erro) {
        setError(erro.message)
        setLoading(false)
        return
      }

      const caixa = caixaRes.data || []
      const lotes = lotesRes.data || []
      const estoque = estoqueRes.data || []

      let entradas = 0
      let saidas = 0
      for (const r of caixa) {
        const categoria = String(r.categoria || '').toLowerCase()
        if (categoria.includes('ent')) entradas += num(r.valor)
        else saidas += num(r.valor)
      }

      const animais = lotes.reduce((acc, r) => acc + num(r.quantidade), 0)
      const lucro = lotes.reduce(
        (acc, r) =>
          num(r.valor_venda) > 0
            ? acc + (num(r.valor_venda) - num(r.valor_compra) - num(r.custos_extras))
            : acc,
        0,
      )

      const listaAlertas = estoque
        .filter((r) => num(r.estoque_minimo) > 0 && num(r.saldo_atual) < num(r.estoque_minimo))
        .map((r) => `Estoque baixo: ${r.item} (saldo ${num(r.saldo_atual)} / mínimo ${num(r.estoque_minimo)})`)

      const pagPendentes = lotes.filter((r) => {
        const s = String(r.status_pagamento || '').toLowerCase()
        return s && !s.includes('pago') && !s.includes('quitad')
      }).length
      if (pagPendentes > 0) listaAlertas.push(`${pagPendentes} lote(s) com pagamento pendente`)

      const saidasCaixa = caixa.filter((r) => !String(r.categoria || '').toLowerCase().includes('ent'))

      setMetrics({ saldo: entradas - saidas, animais, entradas, saidas, lucro })
      setAlertas(listaAlertas)
      setPorSetor(agrupar(saidasCaixa, 'setor', (r) => num(r.valor)))
      setPorFinalidade(agrupar(lotes, 'proposito', (r) => num(r.quantidade)))
      setLoading(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [])

  const maxFluxo = Math.max(metrics.entradas, metrics.saidas, 1)
  const ph = (v) => `${Math.round((v / maxFluxo) * 100)}%`

  return (
    <>
      <div className="card-container">
        <div className="glass-card">
          <div className="card-title">Saldo Integrado</div>
          <div className="card-value">{loading ? '...' : brl(metrics.saldo)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Animais Ativos</div>
          <div className="card-value">{loading ? '...' : metrics.animais}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Lucro (lotes vendidos)</div>
          <div className="card-value">{loading ? '...' : brl(metrics.lucro)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Alertas</div>
          <div className="card-value">{loading ? '...' : alertas.length}</div>
        </div>
      </div>

      <div className="panels">
        <div className="glass-card">
          <div className="card-title">Entradas x Saídas</div>
          <div className="bars">
            <div className="bar-wrap">
              <div className="bar bar-entrada" style={{ height: ph(metrics.entradas) }} />
              <span className="bar-label">
                Entradas
                <strong>{brl(metrics.entradas)}</strong>
              </span>
            </div>
            <div className="bar-wrap">
              <div className="bar bar-saida" style={{ height: ph(metrics.saidas) }} />
              <span className="bar-label">
                Saídas
                <strong>{brl(metrics.saidas)}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="card-title">Saídas por Setor</div>
          {loading ? <p className="muted">Carregando...</p> : <BarrasHorizontais dados={porSetor} formato={brl} />}
        </div>

        <div className="glass-card">
          <div className="card-title">Animais por Finalidade</div>
          {loading ? (
            <p className="muted">Carregando...</p>
          ) : (
            <BarrasHorizontais dados={porFinalidade} />
          )}
        </div>

        <div className="glass-card">
          <div className="card-title">Alertas</div>
          {alertas.length === 0 ? (
            <p className="muted">{loading ? 'Carregando...' : 'Nenhum alerta. Tudo em ordem. ✅'}</p>
          ) : (
            <ul className="alert-list">
              {alertas.map((a, i) => (
                <li key={i}>⚠️ {a}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {error && <div className="status-msg erro">{error}</div>}
    </>
  )
}
