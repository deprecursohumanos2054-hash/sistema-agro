import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num } from '../lib/format'
import { diasAte, parseDateBR, addDays, formatDateBR } from '../lib/date'

function vencimentoVenda(v) {
  const base = parseDateBR(v.data)
  const temPrazo = v.dias_prazo !== null && v.dias_prazo !== undefined && v.dias_prazo !== ''
  if (base && temPrazo) return formatDateBR(addDays(base, Number(v.dias_prazo) || 0))
  return v.data_vencimento || v.data
}

function situacao(vencimento) {
  const d = diasAte(vencimento)
  if (d === null) return { texto: 'Sem data', classe: '' }
  if (d < 0) return { texto: `Atrasado ${-d} dia(s)`, classe: 'atrasado' }
  if (d === 0) return { texto: 'Vence hoje', classe: 'hoje' }
  return { texto: `Vence em ${d} dia(s)`, classe: 'ok' }
}

function ehPago(status) {
  const s = String(status || '').toLowerCase()
  return s.includes('pago') || s.includes('quitad')
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
      const [lotesRes, vendasRes] = await Promise.all([
        supabase.from('lotes_animais').select('*'),
        supabase.from('vendas_suinos').select('*'),
      ])
      if (!ativo) return
      if (lotesRes.error) {
        setError(lotesRes.error.message)
        setLoading(false)
        return
      }

      const lista = []

      // Compras de lotes (contas a pagar ao fornecedor).
      for (const l of lotesRes.data || []) {
        const aPagar = num(l.valor_compra) + num(l.custos_extras)
        if (aPagar <= 0) continue
        lista.push({
          tipo: 'Pagar',
          descricao: l.fornecedor || 'Fornecedor',
          detalhe: `Lote ${num(l.quantidade)} cab${l.proposito ? ` • ${l.proposito}` : ''}`,
          valor: aPagar,
          vencimento: l.data_limite_pagamento,
          dataPagamento: '',
          forma: l.forma_pagamento || '',
          status: l.status_pagamento || '',
          pago: ehPago(l.status_pagamento),
        })
      }

      // Vendas de suínos (contas a receber do cliente).
      if (!vendasRes.error) {
        for (const v of vendasRes.data || []) {
          const valor = num(v.valor_total)
          if (valor <= 0) continue
          const temPrazo =
            v.dias_prazo !== null && v.dias_prazo !== undefined && v.dias_prazo !== ''
          const prazo = temPrazo ? ` • Prazo ${num(v.dias_prazo)} dia(s)` : ''
          lista.push({
            tipo: 'Receber',
            descricao: v.cliente || 'Cliente',
            detalhe: `${num(v.quantidade)} kg × ${brl(num(v.preco_kg))}${prazo}`,
            valor,
            vencimento: vencimentoVenda(v),
            dataPagamento: v.data_pagamento || '',
            forma: v.forma_pagamento || '',
            status: v.status_pagamento || '',
            pago: Boolean(v.data_pagamento) || ehPago(v.status_pagamento),
          })
        }
      }

      // Pendentes primeiro, depois por vencimento mais próximo.
      lista.sort((a, b) => {
        if (a.pago !== b.pago) return a.pago ? 1 : -1
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

  const pendentes = contas.filter((c) => !c.pago)
  const totalPagar = pendentes
    .filter((c) => c.tipo === 'Pagar')
    .reduce((a, c) => a + c.valor, 0)
  const totalReceber = pendentes
    .filter((c) => c.tipo === 'Receber')
    .reduce((a, c) => a + c.valor, 0)
  const vencidas = pendentes.filter((c) => {
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
          <div className="card-title">A Receber (pendente)</div>
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
          Nenhuma conta encontrada. As compras dos Lotes Suínos entram como "A Pagar" e as Vendas
          de Suínos como "A Receber".
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
                <th>Data de Pagamento</th>
                <th>Forma</th>
                <th>Status</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {contas.map((c, i) => {
                const s = c.pago ? { texto: 'Pago', classe: 'pago' } : situacao(c.vencimento)
                const atrasada = !c.pago && s.classe === 'atrasado'
                const statusTexto = c.pago ? 'Pago' : c.status || 'Pendente'
                const statusClasse = c.pago ? 'tag tag-entrada' : atrasada ? 'tag tag-saida' : 'tag'
                return (
                  <tr key={i} className={atrasada ? 'row-alerta' : ''}>
                    <td>
                      <span className={`tag ${c.tipo === 'Pagar' ? 'tag-saida' : 'tag-entrada'}`}>
                        {c.tipo}
                      </span>
                    </td>
                    <td>{c.descricao}</td>
                    <td className="muted">{c.detalhe}</td>
                    <td>{brl(c.valor)}</td>
                    <td>{c.vencimento || '-'}</td>
                    <td>{c.dataPagamento || '-'}</td>
                    <td>{c.forma || '-'}</td>
                    <td>
                      <span className={statusClasse}>{statusTexto}</span>
                    </td>
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
