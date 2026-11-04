import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num } from '../lib/format'
import { custosExtrasLote } from '../lib/modules'
import { parseDateBR } from '../lib/date'

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function mesDe(data) {
  const d = parseDateBR(data)
  if (!d) return { chave: 'sem-data', rotulo: 'Sem data' }
  const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return { chave, rotulo: `${MESES_CURTOS[d.getMonth()]}/${d.getFullYear()}` }
}

const ehReproducao = (l) => /reprodu/i.test(String(l.proposito || ''))
const ehEntradaCaixa = (r) => String(r.categoria || '').toLowerCase().includes('ent')

export default function Acumulado() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lotes, setLotes] = useState([])
  const [vendas, setVendas] = useState([])
  const [caixa, setCaixa] = useState([])

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setLoading(true)
      setError('')
      const [lotesRes, vendasRes, caixaRes] = await Promise.all([
        supabase.from('lotes_animais').select('*'),
        supabase.from('vendas_suinos').select('data, valor_total'),
        supabase.from('fluxo_caixa').select('data, categoria, valor'),
      ])
      if (!ativo) return
      const erro = lotesRes.error || vendasRes.error || caixaRes.error
      if (erro) {
        setError(erro.message)
        setLoading(false)
        return
      }
      setLotes(lotesRes.data || [])
      setVendas(vendasRes.data || [])
      setCaixa(caixaRes.data || [])
      setLoading(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [])

  const resumo = useMemo(() => {
    const mapa = new Map()
    const bucket = (data) => {
      const { chave, rotulo } = mesDe(data)
      if (!mapa.has(chave)) {
        mapa.set(chave, {
          chave,
          rotulo,
          compraAbate: 0,
          compraRepro: 0,
          despesas: 0,
          receitas: 0,
        })
      }
      return mapa.get(chave)
    }

    // Compras de suínos e custos extras entram no mês da compra.
    for (const lote of lotes) {
      const b = bucket(lote.data_compra)
      if (ehReproducao(lote)) {
        b.compraRepro += num(lote.valor_compra)
      } else {
        b.compraAbate += num(lote.valor_compra)
      }
      b.despesas += custosExtrasLote(lote)
    }

    // Vendas entram no mês da venda (recebidas ou não).
    for (const venda of vendas) {
      bucket(venda.data).receitas += num(venda.valor_total)
    }

    // Lançamentos manuais do Fluxo de Caixa entram como receita ou despesa.
    for (const lancamento of caixa) {
      const b = bucket(lancamento.data)
      if (ehEntradaCaixa(lancamento)) b.receitas += num(lancamento.valor)
      else b.despesas += num(lancamento.valor)
    }

    const meses = [...mapa.values()]
      .sort((a, b) => a.chave.localeCompare(b.chave))
      .reduce((lista, b) => {
        const anterior = lista.length ? lista[lista.length - 1].acumulado : 0
        const lucro = b.receitas - b.compraAbate - b.despesas
        return [...lista, { ...b, lucro, acumulado: anterior + lucro }]
      }, [])
    const acumulado = meses.length ? meses[meses.length - 1].acumulado : 0

    const totais = meses.reduce(
      (a, m) => ({
        compraAbate: a.compraAbate + m.compraAbate,
        compraRepro: a.compraRepro + m.compraRepro,
        despesas: a.despesas + m.despesas,
        receitas: a.receitas + m.receitas,
        lucro: a.lucro + m.lucro,
      }),
      { compraAbate: 0, compraRepro: 0, despesas: 0, receitas: 0, lucro: 0 },
    )

    return {
      meses,
      totais,
      acumulado,
      mesesComPrejuizo: meses.filter((m) => m.lucro < 0).length,
    }
  }, [lotes, vendas, caixa])

  const sinalLucro = resumo.acumulado < 0 ? 'negativo' : 'positivo'

  return (
    <>
      <div className="card-container">
        <div className="glass-card">
          <div className="card-title">Lucro Acumulado</div>
          <div className={`card-value ${sinalLucro}`}>
            {loading ? '...' : brl(resumo.acumulado)}
          </div>
          {!loading && resumo.meses.length > 0 && (
            <div className="card-sub">
              {resumo.meses.length} mês(es) • {resumo.mesesComPrejuizo} com prejuízo
            </div>
          )}
        </div>
        <div className="glass-card">
          <div className="card-title">Receitas Acumuladas</div>
          <div className="card-value">{loading ? '...' : brl(resumo.totais.receitas)}</div>
          <div className="card-sub">Vendas de suínos + entradas do caixa</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Suínos Comprados (abate)</div>
          <div className="card-value">{loading ? '...' : brl(resumo.totais.compraAbate)}</div>
          <div className="card-sub">Não inclui casais de reprodução</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Despesas Acumuladas</div>
          <div className="card-value">{loading ? '...' : brl(resumo.totais.despesas)}</div>
          <div className="card-sub">Abate, embalagem, frete + saídas do caixa</div>
        </div>
        <div className="glass-card">
          <div className="card-title">Investimento em Reprodução</div>
          <div className="card-value">{loading ? '...' : brl(resumo.totais.compraRepro)}</div>
          <div className="card-sub">Plantel — fica fora do lucro</div>
        </div>
      </div>

      {error && <div className="status-msg erro">{error}</div>}

      <div className="report-note muted">
        <strong>Lucro do mês</strong> = receitas − compras de suínos (abate) − despesas. As
        vendas contam no mês da venda, recebidas ou não. Compras e despesas contam no mês da
        compra. Contas pendentes mudam o caixa (Financeiro), não o lucro. Os casais de
        reprodução são investimento no plantel: só viram despesa quando vendidos/abatidos (ou
        via depreciação); se vender um reprodutor, lance a entrada no Fluxo de Caixa.
      </div>

      {!loading && !error && resumo.meses.length === 0 && (
        <div className="empty">Nenhuma compra, venda ou despesa encontrada.</div>
      )}

      {resumo.meses.length > 0 && (
        <div className="table-container">
          <table className="tabela-acumulado">
            <thead>
              <tr>
                <th>Mês</th>
                <th title="Compras de suínos para abate (não inclui reprodução)">Compra abate</th>
                <th title="Casais de reprodução — investimento no plantel, fora do lucro">Compra repro</th>
                <th>Despesas</th>
                <th>Receitas</th>
                <th>Lucro mês</th>
                <th>Lucro acum.</th>
              </tr>
            </thead>
            <tbody>
              {resumo.meses.map((m) => (
                <tr key={m.chave} className={m.lucro < 0 ? 'row-alerta' : ''}>
                  <td>
                    {m.rotulo}
                    {m.lucro < 0 && (
                      <span className="tag tag-saida" style={{ marginLeft: 8 }}>
                        Prejuízo
                      </span>
                    )}
                  </td>
                  <td>{brl(m.compraAbate)}</td>
                  <td>{brl(m.compraRepro)}</td>
                  <td>{brl(m.despesas)}</td>
                  <td>{brl(m.receitas)}</td>
                  <td className={m.lucro < 0 ? 'sit-atrasado' : 'sit-pago'}>{brl(m.lucro)}</td>
                  <td className={m.acumulado < 0 ? 'sit-atrasado' : 'sit-pago'}>
                    {brl(m.acumulado)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>TOTAL ({resumo.meses.length})</td>
                <td>{brl(resumo.totais.compraAbate)}</td>
                <td>{brl(resumo.totais.compraRepro)}</td>
                <td>{brl(resumo.totais.despesas)}</td>
                <td>{brl(resumo.totais.receitas)}</td>
                <td className={resumo.totais.lucro < 0 ? 'sit-atrasado' : 'sit-pago'}>
                  {brl(resumo.totais.lucro)}
                </td>
                <td className={resumo.acumulado < 0 ? 'sit-atrasado' : 'sit-pago'}>
                  {brl(resumo.acumulado)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  )
}
