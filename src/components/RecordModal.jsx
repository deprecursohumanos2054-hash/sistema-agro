import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RecordModal({ module, record, onClose, onSaved }) {
  const isEdit = Boolean(record)

  const [values, setValues] = useState(() =>
    Object.fromEntries(
      module.columns.map((column) => {
        const raw = record ? record[column.name] : ''
        return [column.name, raw === null || raw === undefined ? '' : String(raw)]
      }),
    ),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleChange(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {}
    for (const column of module.columns) {
      const raw = values[column.name]
      if (raw === '' || raw === null) {
        payload[column.name] = null
      } else {
        payload[column.name] = column.type === 'number' ? Number(raw) : raw
      }
    }

    const query = isEdit
      ? supabase.from(module.table).update(payload).eq('id', record.id)
      : supabase.from(module.table).insert(payload)

    const { error: saveError } = await query
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
          {module.columns.map((column) => (
            <div className="form-group" key={column.name}>
              <label htmlFor={`input-${column.name}`}>{column.label}</label>
              <input
                id={`input-${column.name}`}
                className="form-input"
                type={column.type === 'number' ? 'number' : 'text'}
                step={column.type === 'number' ? 'any' : undefined}
                placeholder="Preencha..."
                value={values[column.name]}
                onChange={(e) => handleChange(column.name, e.target.value)}
              />
            </div>
          ))}

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
