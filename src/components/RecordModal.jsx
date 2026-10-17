import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { num, brl } from '../lib/format'
import { getPrecoKg, CHAVE_VALOR_KG_VENDA } from '../lib/config'

// Vai inserindo as barras automaticamente: "16102026" => "16/10/2026".
function maskDate(value) {
  const d = String(value).replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

export default function RecordModal({ module, record, onClose, onSaved }) {
  const isEdit = Boolean(record)
  const editableColumns = module.columns.filter((c) => !c.compute)

  const [values, setValues] = useState(() =>
    Object.fromEntries(
      editableColumns.map((column) => {
        const raw = record ? record[column.name] : ''
        return [column.name, raw === null || raw === undefined ? '' : String(raw)]
      }),
    ),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [precos, setPrecos] = useState({})
  const [opcoes, setOpcoes] = useState({})

  const colunasAuto = editableColumns.filter((c) => c.autoCalcQty)
  const colunasProduto = editableColumns.filter((c) => c.autoCalcProduto)
  const colunasSelect = editableColumns.filter((c) => c.optionsFrom)
  const temAutoCalculo = colunasAuto.length > 0
  const chavePreco = (c) => c.autoCalcPrecoChave || CHAVE_VALOR_KG_VENDA
  const chavesPreco = [...new Set(colunasAuto.map(chavePreco))].join(',')
  const chavesSelect = colunasSelect.map((c) => c.name).join(',')

  useEffect(() => {
    if (!chavesPreco) return
    Promise.all(
      chavesPreco.split(',').map((k) => getPrecoKg(k).then((v) => [k, num(v)])),
    ).then((pares) => setPrecos(Object.fromEntries(pares)))
  }, [chavesPreco])

  useEffect(() => {
    if (!chavesSelect) return
    let ativo = true
    Promise.all(
      colunasSelect.map(async (c) => {
        const { table, valueColumn, filter } = c.optionsFrom
        let q = supabase.from(table).select(valueColumn)
        for (const [k, v] of Object.entries(filter || {})) q = q.eq(k, v)
        const { data } = await q.order(valueColumn, { ascending: true })
        const lista = [...new Set((data || []).map((row) => row[valueColumn]).filter(Boolean))]
        return [c.name, lista]
      }),
    ).then((pares) => {
      if (ativo) setOpcoes(Object.fromEntries(pares))
    })
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chavesSelect])

  function handleChange(name, value) {
    setValues((prev) => {
      const next = { ...prev, [name]: value }
      for (const coluna of colunasAuto) {
        if (coluna.autoCalcQty === name) {
          const preco = precos[chavePreco(coluna)]
          const qtd = num(value)
          next[coluna.name] = qtd && preco ? String(Math.round(qtd * preco * 100) / 100) : ''
        }
      }
      for (const coluna of colunasProduto) {
        const { qtd, preco } = coluna.autoCalcProduto
        if (name === qtd || name === preco) {
          const q = num(next[qtd])
          const p = num(next[preco])
          next[coluna.name] = q && p ? String(Math.round(q * p * 100) / 100) : ''
        }
      }
      return next
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = { ...(module.fixed || {}) }
    for (const column of editableColumns) {
      const raw = values[column.name]
      if (raw === '' || raw === null) {
        payload[column.name] = null
      } else {
        payload[column.name] = column.type === 'number' ? Number(raw) : raw
      }
    }

    const executar = () =>
      isEdit
        ? supabase.from(module.table).update(payload).eq('id', record.id)
        : supabase.from(module.table).insert(payload)

    let { error: saveError } = await executar()

    // Se alguma coluna ainda não existir no banco, tenta de novo sem ela.
    if (saveError && /column|schema cache/i.test(saveError.message)) {
      const faltando = Object.keys(payload).filter((coluna) => saveError.message.includes(coluna))
      if (faltando.length) {
        for (const coluna of faltando) delete payload[coluna]
        ;({ error: saveError } = await executar())
      }
    }

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    onSaved()
  }

  return (
    <div className="modal" onMouseDown={onClose}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {isEdit ? 'Editar Registro' : 'Novo Registro'} - {module.label}
        </div>
        <form onSubmit={handleSubmit}>
          {editableColumns
            .filter((column) => !column.esconderQuando || !column.esconderQuando(values))
            .map((column) => {
            const isNumber = column.type === 'number'
            const isDate = column.type === 'date'
            const isSelect = Boolean(column.options || column.optionsFrom)
            const listaOpcoes = column.options || opcoes[column.name] || []
            return (
              <div className="form-group" key={column.name}>
                <label htmlFor={`input-${column.name}`}>{column.label}</label>
                {column.help && <span className="field-help">{column.help}</span>}
                {isSelect ? (
                  <select
                    id={`input-${column.name}`}
                    className="form-input"
                    value={values[column.name]}
                    onChange={(e) => handleChange(column.name, e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {listaOpcoes.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                    {values[column.name] && !listaOpcoes.includes(values[column.name]) && (
                      <option value={values[column.name]}>{values[column.name]} (não cadastrado)</option>
                    )}
                  </select>
                ) : (
                  <input
                    id={`input-${column.name}`}
                    className="form-input"
                    type={isNumber ? 'number' : 'text'}
                    step={isNumber ? 'any' : undefined}
                    inputMode={isDate ? 'numeric' : undefined}
                    maxLength={isDate ? 10 : undefined}
                    placeholder={isDate ? 'dd/mm/aaaa' : 'Preencha...'}
                    value={values[column.name]}
                    onChange={(e) =>
                      handleChange(column.name, isDate ? maskDate(e.target.value) : e.target.value)
                    }
                  />
                )}
              </div>
            )
          })}

          {temAutoCalculo &&
            colunasAuto.map((c) => {
              const chave = chavePreco(c)
              const preco = precos[chave]
              if (preco == null) return null
              return (
                <p className="muted" key={chave}>
                  Valor do Kg (venda): <strong>{brl(preco)}</strong> — o Valor é calculado
                  automaticamente (altere em Configurações).
                </p>
              )
            })}

          {error && <div className="form-error">Erro ao salvar: {error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-novo" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
