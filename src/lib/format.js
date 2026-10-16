export function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function brl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num(value))
}

export function numFmt(value) {
  return new Intl.NumberFormat('pt-BR').format(num(value))
}

export function isBlank(value) {
  return value === null || value === undefined || value === ''
}
