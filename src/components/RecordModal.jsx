import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RecordModal({ module, onClose, onSaved }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(module.columns.map((c) => [c.name, ''])),
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

    const { error: insertError } = await supabase.from(module.table).insert(payload)
    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }
    onSaved()
  }

  return (
    <div className="modal" onMouseDown={onClose}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">Novo Registro - {module.label}</div>
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
