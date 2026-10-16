import { brl, numFmt, isBlank } from '../lib/format'

function formatValue(column, value) {
  if (isBlank(value)) return '-'
  if (/R\$/.test(column.label)) return brl(value)
  if (typeof value === 'number') return numFmt(value)
  return String(value)
}

export default function DataTable({ columns, rows, rowAlert, onEdit, onDelete }) {
  if (!rows.length) {
    return <div className="empty">Nenhum registro encontrado.</div>
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.name}>{c.label}</th>
            ))}
            <th className="actions-col">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={rowAlert && rowAlert(row) ? 'row-alerta' : ''}>
              {columns.map((c) => {
                const value = c.compute ? c.compute(row) : row[c.name]
                return <td key={c.name}>{formatValue(c, value)}</td>
              })}
              <td className="actions-col">
                <button
                  type="button"
                  className="btn-icon"
                  title="Editar"
                  onClick={() => onEdit(row)}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  title="Excluir"
                  onClick={() => onDelete(row)}
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
