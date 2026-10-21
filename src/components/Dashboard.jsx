import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num } from '../lib/format'
import { diasAte } from '../lib/date'
import { custoTotalLote, vendaEmAtraso } from '../lib/modules'

const ehPago = (status) => {
  const s = String(status || '').toLowerCase()
  return s.includes('pago') || s.includes('quitad')
}

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
  const [metrics, setMetrics] = useState({
    saldo: 0,
    recebido: 0,
    pago: 0,
    aReceber: 0,
    aPagar: 0,
    lucro: 0,
    animais: 0,
  })
  const [alertas, setAlertas] = useState([])
  const [porSetor, setPorSetor] = useState([])
  const [porFinalidade, setPorFinalidade] = useState([])

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setLoading(true)
      setError('')

      const [caixaRes, lotesRes, vendasRes, estoqueRes] = await Promise.all([
        supabase.from('fluxo_caixa').select('valor, categoria, setor'),
        supabase.from('lotes_animais').select('*'),
        supabase.from('vendas_suinos').select('*'),
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
      const vendas = vendasRes.error ? [] : vendasRes.data || []
      const estoque = estoqueRes.data || []

      // Vendas de suínos (contas a receber).
      const totalVendido = vendas.reduce((a, v) => a + num(v.valor_total), 0)
      const recebido = vendas.reduce(
        (a, v) => a + (v.data_pagamento || ehPago(v.status_pagamento) ? num(v.valor_total) : 0),
        0,
      )
      const aReceber = totalVendido - recebido

      // Lotes suínos (contas a pagar).
      const lotesPendentes = lotes.filter(
        (l) => !ehPago(l.status_pagamento) && custoTotalLote(l) > 0,
      )
      const aPagar = lotesPendentes.reduce((a, l) => a + custoTotalLote(l), 0)
      const pago = lotes
        .filter((l) => ehPago(l.status_pagamento))
        .reduce((a, l) => a + custoTotalLote(l), 0)

      // Lucro = total vendido − custo dos lotes vendidos/abatidos.
      const lotesVendidos = lotes.filter(
        (l) => /vendid|abatid/i.test(String(l.status || '')) || l.data_venda_abate,
      )
      const baseCusto = lotesVendidos.length
        ? lotesVendidos
        : lotes.filter((l) => /abate/i.test(String(l.proposito || '')))
      const custoVendido = baseCusto.reduce((a, l) => a + custoTotalLote(l), 0)
      const lucro = totalVendido > 0 ? totalVendido - custoVendido : 0

      // Animais ativos = lotes que ainda não foram vendidos/abatidos.
      const animais = lotes
        .filter((l) => !/vendid|abatid/i.test(String(l.status || '')))
        .reduce((a, l) => a + num(l.quantidade), 0)

      // Alertas: estoque baixo, vendas em atraso e contas a pagar.
      const listaAlertas = estoque
        .filter((r) => num(r.estoque_minimo) > 0 && num(r.saldo_atual) < num(r.estoque_minimo))
        .map(
          (r) =>
            `Estoque baixo: ${r.item} (saldo ${num(r.saldo_atual)} / mínimo ${num(r.estoque_minimo)})`,
        )

      const vendasAtrasadas = vendas.filter(vendaEmAtraso).length
      if (vendasAtrasadas > 0) listaAlertas.push(`${vendasAtrasadas} venda(s) em atraso`)

      const lotesVencidos = lotesPendentes.filter((l) => {
        const d = diasAte(l.data_limite_pagamento)
        return d !== null && d < 0
      })
      if (lotesVencidos.length > 0) {
        listaAlertas.push(`${lotesVencidos.length} conta(s) a pagar vencida(s)`)
      } else if (lotesPendentes.length > 0) {
        listaAlertas.push(`${lotesPendentes.length} lote(s) com pagamento pendente`)
      }

      const saidasCaixa = caixa.filter(
        (r) => !String(r.categoria || '').toLowerCase().includes('ent'),
      )

      setMetrics({ saldo: recebido - pago, recebido, pago, aReceber, aPagar, lucro, animais })
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

  const maxFluxo = Math.max(metrics.recebido, metrics.pago, 1)
  const ph = (v) => `${Math.round((v / maxFluxo) * 100)}%`

  return (
    <>
      <div className="card-container">
        <div className="glass-card">
          <div className="card-title">Saldo Integrado</div>
          <div className="card-value">{loading ? '...' : brl(metrics.saldo)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">A Receber (pendente)</div>
          <div className="card-value positivo">{loading ? '...' : brl(metrics.aReceber)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">A Pagar (pendente)</div>
          <div className="card-value negativo">{loading ? '...' : brl(metrics.aPagar)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Lucro (lotes vendidos)</div>
          <div className="card-value">{loading ? '...' : brl(metrics.lucro)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Animais Ativos</div>
          <div className="card-value">{loading ? '...' : metrics.animais}</div>
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
              <div className="bar bar-entrada" style={{ height: ph(metrics.recebido) }} />
              <span className="bar-label">
                Recebido
                <strong>{brl(metrics.recebido)}</strong>
              </span>
            </div>
            <div className="bar-wrap">
              <div className="bar bar-saida" style={{ height: ph(metrics.pago) }} />
              <span className="bar-label">
                Pago
                <strong>{brl(metrics.pago)}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="card-title">Saídas por Setor</div>
          {loading ? (
            <p className="muted">Carregando...</p>
          ) : (
            <BarrasHorizontais dados={porSetor} formato={brl} />
          )}
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
