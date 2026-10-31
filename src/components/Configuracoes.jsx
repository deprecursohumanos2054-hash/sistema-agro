import { useEffect, useState } from 'react'
import {
  setConfig,
  getPrecoKg,
  getValorPadrao,
  CHAVE_VALOR_KG_VENDA,
  CHAVE_VALOR_CABECA,
  CHAVE_VALOR_KG_SARAPATEL,
  VALOR_KG_PADRAO,
  VALOR_CABECA_PADRAO,
  VALOR_KG_SARAPATEL_PADRAO,
} from '../lib/config'

export default function Configuracoes() {
  const [precoVenda, setPrecoVenda] = useState('')
  const [precoCabeca, setPrecoCabeca] = useState('')
  const [precoSarapatel, setPrecoSarapatel] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all([
      getPrecoKg(CHAVE_VALOR_KG_VENDA),
      getValorPadrao(CHAVE_VALOR_CABECA, VALOR_CABECA_PADRAO),
      getValorPadrao(CHAVE_VALOR_KG_SARAPATEL, VALOR_KG_SARAPATEL_PADRAO),
    ]).then(([venda, cabeca, sarapatel]) => {
      if (!ativo) return
      setPrecoVenda(String(venda ?? VALOR_KG_PADRAO))
      setPrecoCabeca(String(cabeca ?? VALOR_CABECA_PADRAO))
      setPrecoSarapatel(String(sarapatel ?? VALOR_KG_SARAPATEL_PADRAO))
      setLoading(false)
    })
    return () => {
      ativo = false
    }
  }, [])

  async function salvar(event) {
    event.preventDefault()
    setMsg('')
    setErro('')
    const resultados = await Promise.all([
      setConfig(CHAVE_VALOR_KG_VENDA, precoVenda.replace(',', '.')),
      setConfig(CHAVE_VALOR_CABECA, precoCabeca.replace(',', '.')),
      setConfig(CHAVE_VALOR_KG_SARAPATEL, precoSarapatel.replace(',', '.')),
    ])
    const falha = resultados.find((r) => r.error)
    if (falha) {
      setErro(falha.error.message)
      return
    }
    setMsg('Valores salvos com sucesso!')
  }

  return (
    <>
      <div className="glass-card" style={{ maxWidth: 520 }}>
        <div className="card-title">Configurações do Sistema</div>
        <form onSubmit={salvar}>
          <div className="form-group">
            <label htmlFor="valor-kg-venda">Valor do Kg — Carne ao Cliente (R$)</label>
            <input
              id="valor-kg-venda"
              className="form-input"
              type="text"
              inputMode="decimal"
              placeholder="25,00"
              value={loading ? '' : precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="valor-cabeca">Venda da Cabeça do Porco (R$ por unidade)</label>
            <input
              id="valor-cabeca"
              className="form-input"
              type="text"
              inputMode="decimal"
              placeholder="25,00"
              value={loading ? '' : precoCabeca}
              onChange={(e) => setPrecoCabeca(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="valor-kg-sarapatel">Sarapatel do Porco (R$ por Kg)</label>
            <input
              id="valor-kg-sarapatel"
              className="form-input"
              type="text"
              inputMode="decimal"
              placeholder="20,00"
              value={loading ? '' : precoSarapatel}
              onChange={(e) => setPrecoSarapatel(e.target.value)}
            />
          </div>

          <p className="muted">
            Esses valores são os <strong>preços padrão</strong> sugeridos ao lançar uma venda no menu
            <strong> Vendas de Suínos</strong>. Você pode alterar o preço em cada venda. No menu
            <strong> Lotes Suínos</strong> o preço do Kg é calculado (Custo Total ÷ Peso), então não é
            configurável aqui.
          </p>
          <p className="muted">
            A <strong>cabeça</strong> é vendida por unidade e o <strong>sarapatel</strong> por Kg. Os
            dois entram no Valor Total da venda e aparecem no Financeiro/Dashboard como receita.
          </p>
          {msg && <div className="status-msg">{msg}</div>}
          {erro && <div className="status-msg erro">Erro: {erro}</div>}
          <div className="modal-actions">
            <button type="submit" className="btn-novo" disabled={loading}>
              Salvar
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
