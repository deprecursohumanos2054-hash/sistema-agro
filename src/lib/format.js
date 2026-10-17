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

// Kg com precisão de gramas (3 casas): 15,75 => "15,750".
export function kgFmt(value) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(num(value))
}

export function isBlank(value) {
  return value === null || value === undefined || value === ''
}
