import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num } from '../lib/format'
import { hojeBR } from '../lib/date'
import { compraPendenteLote, pagoCompraLote } from '../lib/modules'

const OPCOES_FORMA = ['Dinheiro', 'Pix', 'Transferência', 'Boleto', 'Cartão', 'Cheque']

// Vai inserindo as barras automaticamente: "08112026" => "08/11/2026".
function maskDate(value) {
  const d = String(value).replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

const centavos = (v) => Math.round(v * 100) / 100

// Lança um pagamento (total ou parcial) da compra do lote ao fornecedor.
// Soma o valor ao que já foi pago e mantém o saldo a pagar atualizado.
export default function PagarModal({ lote, onClose, onSaved }) {
  const total = num(lote.valor_compra)
  const pago = pagoCompraLote(lote)
  const saldo = compraPendenteLote(lote)

  const [valor, setValor] = useState(saldo > 0 ? String(centavos(saldo)) : '')
  const [data, setData] = useState(() => hojeBR())
  const [forma, setForma] = useState(lote.forma_pagamento || 'Dinheiro')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (saldo <= 0) {
      setError('Esta compra já está quitada: não há saldo a pagar.')
      return
    }

    const pagoAgora = centavos(num(valor))
    if (pagoAgora <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    if (pagoAgora > centavos(saldo)) {
      setError(`O valor pago não pode ser maior que o saldo a pagar (${brl(saldo)}).`)
      return
    }

    setSaving(true)
    setError('')

    const novoPago = centavos(pago + pagoAgora)
    const quitou = novoPago >= centavos(total)
    const { error: saveError } = await supabase
      .from('lotes_animais')
      .update({
        valor_pago_compra: novoPago,
        data_pagamento_compra: data || null,
        forma_pagamento: forma || null,
        status_pagamento: quitou ? 'Pago' : 'Pendente',
      })
      .eq('id', lote.id)

    setSaving(false)

    if (saveError) {
      setError(
        /column|schema cache/i.test(saveError.message)
          ? 'O banco ainda não tem os campos de pagamento da compra. Rode o script supabase/add-pagamento-compra.sql no SQL Editor do Supabase e tente de novo.'
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
        <div className="modal-header">
          Pagar Fornecedor — {lote.fornecedor || 'Fornecedor'}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="recibo-resumo">
            <div>
              <span>Valor da compra</span>
              <strong>{brl(total)}</strong>
            </div>
            <div>
              <span>Já pago</span>
              <strong>{brl(pago)}</strong>
            </div>
            <div>
              <span>Saldo a pagar</span>
              <strong>{brl(saldo)}</strong>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="pagar-valor">Valor pago agora (R$)</label>
            <span className="field-help">
              Pode ser parcial: o restante continua como conta a pagar no Financeiro.
            </span>
            <input
              id="pagar-valor"
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
            <label htmlFor="pagar-data">Data do pagamento</label>
            <input
              id="pagar-data"
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
            <label htmlFor="pagar-forma">Forma de pagamento</label>
            <select
              id="pagar-forma"
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
              Depois deste pagamento, o saldo a pagar fica em <strong>{brl(restante)}</strong>.
            </p>
          )}

          {error && <div className="form-error">Erro ao pagar: {error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-novo" disabled={saving}>
              {saving ? 'Salvando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
