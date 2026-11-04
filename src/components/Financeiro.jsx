import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num } from '../lib/format'
import { etiquetaStatusPagamento } from '../lib/modules'
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
  const tabelaRef = useRef(null)

  // Tipo e Descrição ficam congelados à esquerda: mede a largura da 1ª coluna
  // para a Descrição parar exatamente no fim dela.
  useEffect(() => {
    const tabela = tabelaRef.current
    if (!tabela) return
    const medir = () => {
      const primeira = tabela.querySelector('thead th:first-child')
      if (!primeira) return
      tabela.style.setProperty('--largura-data', `${primeira.getBoundingClientRect().width}px`)
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(tabela)
    return () => observador.disconnect()
  }, [contas.length])

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

      // 1) Compra dos suínos = dívida com o fornecedor.
      // 2) Custos extras (abate, embalagem, frete) = despesas à parte: só entram
      //    no Financeiro as parcelas que ainda não foram marcadas como pagas.
      for (const l of lotesRes.data || []) {
        const compra = num(l.valor_compra)
        const lote = `Lote ${num(l.quantidade)} cab${l.proposito ? ` • ${l.proposito}` : ''}`
        const fornecedor = l.fornecedor || 'Fornecedor'

        if (compra > 0) {
          lista.push({
            tipo: 'Pagar',
            origem: 'fornecedor',
            descricao: fornecedor,
            detalhe: `Compra de suínos • ${lote}`,
            valor: compra,
            valorRecebido: 0,
            vencimento: l.data_limite_pagamento,
            dataPagamento: '',
            forma: l.forma_pagamento || '',
            status: l.status_pagamento || '',
            pago: ehPago(l.status_pagamento),
          })
        }

        const extras = [
          { nome: 'Abate', valor: num(l.custo_abate), pago: Boolean(l.abate_pago) },
          { nome: 'Embalagem', valor: num(l.custo_embalagem), pago: Boolean(l.embalagem_pago) },
          { nome: 'Frete', valor: num(l.custo_frete), pago: Boolean(l.frete_pago) },
        ]
        for (const e of extras) {
          if (e.valor <= 0 || e.pago) continue
          lista.push({
            tipo: 'Pagar',
            origem: 'extra',
            descricao: `Custo extra — ${e.nome}`,
            detalhe: `${fornecedor} • ${lote}`,
            valor: e.valor,
            valorRecebido: 0,
            vencimento: null,
            dataPagamento: '',
            forma: '',
            status: 'Pendente',
            pago: false,
          })
        }

        // Lotes antigos, ainda com o campo único "Custos Extras" (antes da migration).
        const temCustosSeparados =
          num(l.custo_abate) || num(l.custo_embalagem) || num(l.custo_frete)
        if (
          !temCustosSeparados &&
          num(l.custos_extras) > 0 &&
          !ehPago(l.status_pagamento)
        ) {
          lista.push({
            tipo: 'Pagar',
            origem: 'extra',
            descricao: 'Custo extra — Abate',
            detalhe: `${fornecedor} • ${lote} (valor antigo)`,
            valor: num(l.custos_extras),
            valorRecebido: 0,
            vencimento: null,
            dataPagamento: '',
            forma: '',
            status: 'Pendente',
            pago: false,
          })
        }
      }

      // Vendas de suínos (contas a receber do cliente).
      if (!vendasRes.error) {
        for (const v of vendasRes.data || []) {
          const valor = num(v.valor_total)
          if (valor <= 0) continue
          const temPrazo =
            v.dias_prazo !== null && v.dias_prazo !== undefined && v.dias_prazo !== ''
          const prazo = temPrazo ? ` • Prazo ${num(v.dias_prazo)} dia(s)` : ''
          const pago = Boolean(v.data_pagamento) || ehPago(v.status_pagamento)
          const partes = []
          if (num(v.quantidade) > 0) {
            partes.push(`${num(v.quantidade)} kg × ${brl(num(v.preco_kg))}`)
          }
          if (num(v.qtd_cabecas) > 0) {
            partes.push(`${num(v.qtd_cabecas)} cabeça(s) × ${brl(num(v.preco_cabeca))}`)
          }
          if (num(v.kg_sarapatel) > 0) {
            partes.push(`sarapatel ${num(v.kg_sarapatel)} kg × ${brl(num(v.preco_kg_sarapatel))}`)
          }
          lista.push({
            tipo: 'Receber',
            descricao: v.cliente || 'Cliente',
            detalhe: `${partes.length ? partes.join(' + ') : 'Venda de suíno'}${prazo}`,
            valor,
            valorRecebido: pago ? valor : 0,
            vencimento: vencimentoVenda(v),
            dataPagamento: v.data_pagamento || '',
            forma: v.forma_pagamento || '',
            status: v.status_pagamento || '',
            pago,
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
  const vendas = contas.filter((c) => c.tipo === 'Receber')
  const totalReceber = vendas.reduce((a, c) => a + c.valor, 0)
  const totalRecebido = vendas.reduce((a, c) => a + c.valorRecebido, 0)
  const saldoReceber = totalReceber - totalRecebido
  const contasPagar = pendentes.filter((c) => c.tipo === 'Pagar')
  // Separa a dívida com o fornecedor dos custos extras (abate, embalagem e frete).
  const pagarFornecedor = contasPagar
    .filter((c) => c.origem !== 'extra')
    .reduce((a, c) => a + c.valor, 0)
  const pagarExtras = contasPagar
    .filter((c) => c.origem === 'extra')
    .reduce((a, c) => a + c.valor, 0)
  const totalPagar = pagarFornecedor + pagarExtras
  const vencidas = pendentes.filter((c) => {
    const d = diasAte(c.vencimento)
    return d !== null && d < 0
  }).length

  return (
    <>
      <div className="card-container">
        <div className="glass-card">
          <div className="card-title">Total a Receber</div>
          <div className="card-value positivo">{loading ? '...' : brl(totalReceber)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Valor Recebido</div>
          <div className="card-value">{loading ? '...' : brl(totalRecebido)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Saldo a Receber (pendente)</div>
          <div className="card-value positivo">{loading ? '...' : brl(saldoReceber)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">A Pagar — Fornecedor (pendente)</div>
          <div className="card-value negativo">{loading ? '...' : brl(pagarFornecedor)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">A Pagar — Extras (pendente)</div>
          <div className="card-value negativo">{loading ? '...' : brl(pagarExtras)}</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Resultado Previsto</div>
          <div className="card-value">{loading ? '...' : brl(saldoReceber - totalPagar)}</div>
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
          <table ref={tabelaRef} className="congelar-coluna congelar-segunda">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Detalhe</th>
                <th>Valor (R$)</th>
                <th>Valor Recebido (R$)</th>
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
                // Pago = verde, vencido = vermelho ("Atrasado") e Pendente (no prazo) = normal.
                const etiqueta = etiquetaStatusPagamento(c.pago ? 'Pago' : c.status, atrasada)
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
                    <td>{c.tipo === 'Receber' ? brl(c.valorRecebido) : '-'}</td>
                    <td>{c.vencimento || '-'}</td>
                    <td>{c.dataPagamento || '-'}</td>
                    <td>{c.forma || '-'}</td>
                    <td>
                      <span className={etiqueta.classe}>{etiqueta.texto}</span>
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
