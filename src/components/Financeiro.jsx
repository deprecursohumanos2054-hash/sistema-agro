import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num } from '../lib/format'
import { diasAte } from '../lib/date'

function situacao(vencimento) {
  const d = diasAte(vencimento)
  if (d === null) return { texto: 'Sem data', classe: '' }
  if (d < 0) return { texto: `Atrasado ${-d} dia(s)`, classe: 'atrasado' }
  if (d === 0) return { texto: 'Vence hoje', classe: 'hoje' }
  return { texto: `Vence em ${d} dia(s)`, classe: 'ok' }
}

export default function Financeiro() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [contas, setContas] = useState([])

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setLoading(true)
      setError('')
      const { data, error: queryError } = await supabase.from('lotes_animais').select('*')
      if (!ativo) return
      if (queryError) {
        setError(queryError.message)
        setLoading(false)
        return
      }

      const lista = []
      for (const l of data || []) {
        const status = String(l.status_pagamento || '').toLowerCase()
        const pendente = status && !status.includes('pago') && !status.includes('quitad')
        if (!pendente) continue

        const aPagar = num(l.valor_compra) + num(l.custos_extras)
        if (aPagar > 0) {
          lista.push({
            tipo: 'Pagar',
            descricao: l.fornecedor || 'Fornecedor',
            detalhe: `Lote ${num(l.quantidade)} cab • ${l.proposito || 'sem propósito'}`,
            valor: aPagar,
            vencimento: l.data_limite_pagamento,
          })
        }
        if (num(l.valor_venda) > 0) {
          lista.push({
            tipo: 'Receber',
            descricao: l.comprador_final || l.possiveis_clientes || 'Cliente',
            detalhe: `Venda lote ${num(l.quantidade)} cab`,
            valor: num(l.valor_venda),
            vencimento: l.data_venda_abate || l.data_limite_pagamento,
          })
        }
      }

      lista.sort((a, b) => {
        const da = diasAte(a.vencimento)
        const db = diasAte(b.vencimento)
        return (da ?? 9999) - (db ?? 9999)
      })

      setContas(lista)
      setLoading(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [])

  const totalPagar = contas.filter((c) => c.tipo === 'Pagar').reduce((a, c) => a + c.valor, 0)
  const totalReceber = contas.filter((c) => c.tipo === 'Receber').reduce((a, c) => a + c.valor, 0)
  const vencidas = contas.filter((c) => {
    const d = diasAte(c.vencimento)
    return d !== null && d < 0
  }).length

  return (
    <>
      <div className="card-container">
        <div className="glass-card">
          <div className="card-title">A Pagar (pendente)</div>
          <div className="card-value negativo">{loading ? '...' : brl(totalPagar)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">A Receber (previsto)</div>
          <div className="card-value positivo">{loading ? '...' : brl(totalReceber)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Resultado Previsto</div>
          <div className="card-value">{loading ? '...' : brl(totalReceber - totalPagar)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Contas Vencidas</div>
          <div className="card-value">{loading ? '...' : vencidas}</div>
        </div>
      </div>

      {error && <div className="status-msg erro">{error}</div>}

      {!loading && !error && contas.length === 0 && (
        <div className="empty">
          Nenhuma conta pendente. Defina o "Status de Pagamento" dos lotes como algo diferente de
          "Pago" para acompanhar aqui.
        </div>
      )}

      {contas.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Detalhe</th>
                <th>Valor (R$)</th>
                <th>Vencimento</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {contas.map((c, i) => {
                const s = situacao(c.vencimento)
                return (
                  <tr key={i} className={s.classe === 'atrasado' ? 'row-alerta' : ''}>
                    <td>
                      <span className={`tag ${c.tipo === 'Pagar' ? 'tag-saida' : 'tag-entrada'}`}>
                        {c.tipo}
                      </span>
                    </td>
                    <td>{c.descricao}</td>
                    <td className="muted">{c.detalhe}</td>
                    <td>{brl(c.valor)}</td>
                    <td>{c.vencimento || '-'}</td>
                    <td className={`sit-${s.classe}`}>{s.texto}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
