function formatCell(value) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export default function DataTable({ columns, rows }) {
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
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((c) => (
                <td key={c.name}>{formatCell(row[c.name])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
