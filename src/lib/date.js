// Utilitários de data em formato brasileiro (dd/mm/aaaa).

export function parseDateBR(value) {
  if (!value) return null
  const s = String(value).trim()
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDateBR(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getFullYear()}`
}

export function addDays(date, days) {
  const d = new Date(date.getTime())
  d.setDate(d.getDate() + days)
  return d
}

export function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

// Diferença em dias entre hoje e uma data "dd/mm/aaaa" (negativo = atrasado).
export function diasAte(value) {
  const d = parseDateBR(value) || (value ? new Date(value) : null)
  if (!d || Number.isNaN(d.getTime())) return null
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - hoje.getTime()) / 86400000)
}
