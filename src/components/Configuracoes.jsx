import { useEffect, useState } from 'react'
import { getConfig, setConfig, CHAVE_VALOR_KG, VALOR_KG_PADRAO } from '../lib/config'

export default function Configuracoes() {
  const [precoKg, setPrecoKg] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    getConfig(CHAVE_VALOR_KG, VALOR_KG_PADRAO).then((v) => {
      if (!ativo) return
      setPrecoKg(String(v ?? VALOR_KG_PADRAO))
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
    const { error } = await setConfig(CHAVE_VALOR_KG, precoKg.replace(',', '.'))
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
            <label htmlFor="valor-kg">Valor do Kg do Suíno (R$)</label>
            <input
              id="valor-kg"
              className="form-input"
              type="text"
              inputMode="decimal"
              placeholder="25,00"
              value={loading ? '' : precoKg}
              onChange={(e) => setPrecoKg(e.target.value)}
            />
          </div>
          <p className="muted">
            Esse valor é usado para calcular automaticamente o <strong>Valor Comprado</strong> em
            Clientes (Quantidade em Kg × Valor do Kg). Pode ser alterado a qualquer momento.
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
