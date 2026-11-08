import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num } from '../lib/format'
import { hojeBR } from '../lib/date'
import { saldoDevedorVenda, valorRecebidoVenda } from '../lib/modules'

const OPCOES_FORMA = ['Dinheiro', 'Pix', 'Transferência', 'Boleto', 'Cartão', 'Cheque']

// Vai inserindo as barras automaticamente: "08112026" => "08/11/2026".
function maskDate(value) {
  const d = String(value).replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

const centavos = (v) => Math.round(v * 100) / 100

// Lança um recebimento parcial (adiantamento/baixa) numa venda já existente.
// Soma o valor ao que o cliente já pagou e mantém o saldo devedor atualizado.
export default function ReceberModal({ venda, onClose, onSaved }) {
  const total = num(venda.valor_total)
  const recebido = valorRecebidoVenda(venda)
  const saldo = saldoDevedorVenda(venda)

  const [valor, setValor] = useState(saldo > 0 ? String(centavos(saldo)) : '')
  const [data, setData] = useState(() => hojeBR())
  const [forma, setForma] = useState(venda.forma_pagamento || 'Dinheiro')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (saldo <= 0) {
      setError('Esta venda já está quitada: não há saldo devedor.')
      return
    }

    const pagoAgora = centavos(num(valor))
    if (pagoAgora <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    if (pagoAgora > centavos(saldo)) {
      setError(`O valor recebido não pode ser maior que o saldo devedor (${brl(saldo)}).`)
      return
    }

    setSaving(true)
    setError('')

    const novoRecebido = centavos(recebido + pagoAgora)
    const quitou = novoRecebido >= centavos(total)
    const { error: saveError } = await supabase
      .from('vendas_suinos')
      .update({
        valor_recebido: novoRecebido,
        data_pagamento: data || null,
        forma_pagamento: forma || null,
        status_pagamento: quitou ? 'Pago' : 'Pendente',
      })
      .eq('id', venda.id)

    setSaving(false)

    if (saveError) {
      setError(
        /column|schema cache/i.test(saveError.message)
          ? 'O banco ainda não tem o campo de recebimento parcial. Rode o script supabase/add-recebimento-parcial.sql no SQL Editor do Supabase e tente de novo.'
          : saveError.message,
      )
      return
    }

    onSaved()
  }

  const restante = centavos(saldo - num(valor))

  return (
    <div className="modal" onMouseDown={onClose}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">Receber / Dar Baixa — {venda.cliente || 'Cliente'}</div>
        <form onSubmit={handleSubmit}>
          <div className="recibo-resumo">
            <div>
              <span>Valor total da venda</span>
              <strong>{brl(total)}</strong>
            </div>
            <div>
              <span>Já recebido</span>
              <strong>{brl(recebido)}</strong>
            </div>
            <div>
              <span>Saldo devedor atual</span>
              <strong>{brl(saldo)}</strong>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="receber-valor">Valor recebido agora (R$)</label>
            <span className="field-help">
              Pode ser um adiantamento: o restante continua como saldo devedor.
            </span>
            <input
              id="receber-valor"
              className="form-input"
              type="number"
              step="any"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="receber-data">Data do recebimento</label>
            <input
              id="receber-data"
              className="form-input"
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="dd/mm/aaaa"
              value={data}
              onChange={(e) => setData(maskDate(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="receber-forma">Forma de pagamento</label>
            <select
              id="receber-forma"
              className="form-input"
              value={forma}
              onChange={(e) => setForma(e.target.value)}
            >
              <option value="">Selecione...</option>
              {OPCOES_FORMA.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>

          {!error && valor !== '' && num(valor) > 0 && num(valor) <= saldo && (
            <p className="muted">
              Depois desta baixa, o saldo devedor fica em <strong>{brl(restante)}</strong>.
            </p>
          )}

          {error && <div className="form-error">Erro ao receber: {error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-novo" disabled={saving}>
              {saving ? 'Salvando...' : 'Confirmar Recebimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
