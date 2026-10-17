import { useEffect, useState } from 'react'
import {
  setConfig,
  getPrecoKg,
  CHAVE_VALOR_KG_COMPRA,
  CHAVE_VALOR_KG_VENDA,
  VALOR_KG_PADRAO,
} from '../lib/config'

export default function Configuracoes() {
  const [precoCompra, setPrecoCompra] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all([
      getPrecoKg(CHAVE_VALOR_KG_COMPRA),
      getPrecoKg(CHAVE_VALOR_KG_VENDA),
    ]).then(([compra, venda]) => {
      if (!ativo) return
      setPrecoCompra(String(compra ?? VALOR_KG_PADRAO))
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
    const resultados = await Promise.all([
      setConfig(CHAVE_VALOR_KG_COMPRA, precoCompra.replace(',', '.')),
      setConfig(CHAVE_VALOR_KG_VENDA, precoVenda.replace(',', '.')),
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
            <label htmlFor="valor-kg-compra">Valor do Kg — Compra (Fornecedor) (R$)</label>
            <input
              id="valor-kg-compra"
              className="form-input"
              type="text"
              inputMode="decimal"
              placeholder="25,00"
              value={loading ? '' : precoCompra}
              onChange={(e) => setPrecoCompra(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="valor-kg-venda">Valor do Kg — Venda (Cliente) (R$)</label>
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
            O valor de <strong>compra</strong> é usado no menu Fornecedores e o de <strong>venda</strong> no
            menu Clientes, para calcular automaticamente o <strong>Valor Comprado</strong> (Quantidade em Kg
            × Valor do Kg). Podem ser alterados a qualquer momento.
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
