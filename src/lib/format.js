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

// Telefone: guarda/formatos comuns no Brasil.
// - Remove tudo que não for dígito.
// - Remove o +55/55 do início quando o número tem 12 ou 13 dígitos.
// - Remove o 0 de discagem quando sobra 10 ou 11 dígitos.
export function phoneDigits(value) {
  let digitos = String(value ?? '').replace(/\D/g, '')
  if (!digitos) return ''
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) {
    digitos = digitos.slice(2)
  }
  if (digitos.startsWith('0') && (digitos.length === 11 || digitos.length === 12)) {
    digitos = digitos.slice(1)
  }
  return digitos
}

// "82988720335" => "(82) 98872-0335" | "8232221234" => "(82) 3222-1234".
// Valores fora do padrão voltam como foram digitados.
export function formatPhone(value) {
  if (isBlank(value)) return ''
  const d = phoneDigits(value)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return String(value).trim()
}

// Máscara progressiva usada no formulário: "82988720335" => "(82) 98872-0335".
export function maskPhone(value) {
  const d = phoneDigits(value).slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Número pronto para o link do WhatsApp (precisa do 55 + DDD + número).
export function phoneForWhatsApp(value) {
  const d = phoneDigits(value)
  return d.length === 10 || d.length === 11 ? `55${d}` : ''
}
