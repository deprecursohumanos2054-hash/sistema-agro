import { isBlank } from './format'

// Exporta uma lista como CSV (separador ";" para abrir direto no Excel pt-BR).
export function exportCsv(filename, columns, rows) {
  const header = columns.map((c) => c.label)

  const escape = (cell) => {
    const s = isBlank(cell) ? '' : String(cell)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const lines = [header]
  for (const row of rows) {
    lines.push(columns.map((c) => escape(c.compute ? c.compute(row) : row[c.name])))
  }

  const csv = lines.map((line) => line.map(escape).join(';')).join('\r\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
