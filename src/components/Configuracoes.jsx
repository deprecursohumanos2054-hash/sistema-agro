import { useEffect, useState } from 'react'
import { setConfig, getPrecoKg, CHAVE_VALOR_KG_VENDA, VALOR_KG_PADRAO } from '../lib/config'

export default function Configuracoes() {
  const [precoVenda, setPrecoVenda] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    getPrecoKg(CHAVE_VALOR_KG_VENDA).then((venda) => {
      if (!ativo) return
      setPrecoVenda(String(venda ?? VALOR_KG_PADRAO))
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
    const { error } = await setConfig(CHAVE_VALOR_KG_VENDA, precoVenda.replace(',', '.'))
    if (error) {
      setErro(error.message)
      return
    }
    setMsg('Valor salvo com sucesso!')
  }

  return (
    <>
      <div className="glass-card" style={{ maxWidth: 520 }}>
        <div className="card-title">Configurações do Sistema</div>
        <form onSubmit={salvar}>
          <div className="form-group">
            <label htmlFor="valor-kg-venda">Valor do Kg — Venda ao Cliente (R$)</label>
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
          <p className="muted">
            Esse valor é o <strong>preço padrão do Kg</strong> sugerido ao lançar uma venda no menu
            <strong> Vendas de Suínos</strong>. Você pode alterar o preço em cada venda. No menu
            <strong> Lotes Suínos</strong> o preço do Kg é calculado (Custo Total ÷ Peso), então não é
            configurável aqui.
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
