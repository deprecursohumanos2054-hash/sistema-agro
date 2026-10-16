import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num } from '../lib/format'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState({ saldo: 0, animais: 0, entradas: 0, saidas: 0, lucro: 0 })
  const [alertas, setAlertas] = useState([])

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setLoading(true)
      setError('')

      const [caixaRes, lotesRes, estoqueRes] = await Promise.all([
        supabase.from('fluxo_caixa').select('valor, categoria'),
        supabase
          .from('lotes_animais')
          .select('quantidade, status_pagamento, valor_compra, custos_extras, valor_venda'),
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
        (acc, r) => acc + (num(r.valor_venda) - num(r.valor_compra) - num(r.custos_extras)),
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

      setMetrics({ saldo: entradas - saidas, animais, entradas, saidas, lucro })
      setAlertas(listaAlertas)
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
          <div className="card-value">{loading ? 'Carregando...' : brl(metrics.saldo)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Animais Ativos</div>
          <div className="card-value">{loading ? 'Carregando...' : metrics.animais}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Lucro Estimado (lotes)</div>
          <div className="card-value">{loading ? 'Carregando...' : brl(metrics.lucro)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Alertas</div>
          <div className="card-value">{loading ? 'Carregando...' : alertas.length}</div>
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
