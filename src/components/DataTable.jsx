function formatCell(value) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export default function DataTable({ columns, rows, onEdit, onDelete }) {
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
            <tr key={row.id}>
              {columns.map((c) => (
                <td key={c.name}>{formatCell(row[c.name])}</td>
              ))}
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
