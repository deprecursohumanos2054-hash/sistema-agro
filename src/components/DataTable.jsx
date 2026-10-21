import { brl, numFmt, kgFmt, isBlank } from '../lib/format'

function formatValue(column, value) {
  if (isBlank(value)) return '-'
  if (/R\$/.test(column.label)) return brl(value)
  if (column.kg) return kgFmt(value)
  if (typeof value === 'number') return numFmt(value)
  return String(value)
}

function valorCelula(column, row) {
  return column.compute ? column.compute(row) : row[column.name]
}

function totalColuna(column, rows) {
  if (!column.total) return null
  if (typeof column.total === 'function') return column.total(rows)
  if (column.total === 'count') return rows.length
  const validos = rows
    .map((row) => valorCelula(column, row))
    .filter((v) => !isBlank(v) && Number.isFinite(Number(v)))
    .map(Number)
  if (column.total === 'avg') {
    return validos.length ? validos.reduce((a, n) => a + n, 0) / validos.length : null
  }
  return validos.reduce((a, n) => a + n, 0)
}

export default function DataTable({
  columns,
  rows,
  rowAlert,
  sort,
  onSort,
  onEdit,
  onDelete,
  showTotals,
}) {
  if (!rows.length) {
    return <div className="empty">Nenhum registro encontrado.</div>
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {columns.map((c) => {
              const ativa = sort && sort.name === c.name
              return (
                <th
                  key={c.name}
                  title={c.help || ''}
                  className={`${c.help ? 'has-help ' : ''}${onSort ? 'sortable' : ''}`}
                  onClick={onSort ? () => onSort(c) : undefined}
                >
                  {c.label}
                  {ativa && <span className="sort-arrow">{sort.dir === 'desc' ? '▼' : '▲'}</span>}
                  {c.help && <span className="th-help">?</span>}
                </th>
              )
            })}
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
        {showTotals && (
          <tfoot>
            <tr>
              {columns.map((c, i) => {
                const total = totalColuna(c, rows)
                let texto = '—'
                if (!isBlank(total)) texto = formatValue(c, total)
                else if (i === 0) texto = `TOTAL (${rows.length})`
                return <td key={c.name}>{texto}</td>
              })}
              <td className="actions-col" />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
