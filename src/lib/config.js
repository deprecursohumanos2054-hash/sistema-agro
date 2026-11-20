import { supabase } from './supabase'

// Configurações gerais do sistema (tabela "configuracoes", formato chave/valor).

export const CHAVE_VALOR_KG_VENDA = 'valor_kg_suino_venda'
export const CHAVE_VALOR_KG = 'valor_kg_suino' // chave antiga (migração)
export const VALOR_KG_PADRAO = 25

export const CHAVE_VALOR_CABECA = 'valor_cabeca_porco'
export const CHAVE_VALOR_KG_SARAPATEL = 'valor_kg_sarapatel'
export const VALOR_CABECA_PADRAO = 25
export const VALOR_KG_SARAPATEL_PADRAO = 20

// WhatsApp que recebem o resumo dos relatórios (ficam no banco, não no código).
export const CHAVE_WHATSAPP_ADMIN = 'whatsapp_admin'
export const CHAVE_WHATSAPP_CONSULTA = 'whatsapp_consulta'

// Lembretes automáticos pelo Telegram (token e chat IDs ficam no banco).
export const CHAVE_TELEGRAM_TOKEN = 'telegram_bot_token'
export const CHAVE_TELEGRAM_CHATS = 'telegram_chat_ids'
export const CHAVE_TELEGRAM_DIAS = 'telegram_dias_aviso'
export const TELEGRAM_DIAS_PADRAO = 15

export function somenteDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '')
}

// Número pronto para o link wa.me (com o 55 do Brasil).
export function telefoneWhatsApp(valor) {
  const digitos = somenteDigitos(valor)
  if (!digitos) return ''
  if (digitos.startsWith('55') && digitos.length >= 12) return digitos
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`
  return digitos
}

// Mostra (82) 99110-9849 a partir dos dígitos salvos.
export function formatarTelefoneWhatsApp(valor) {
  const digitos = somenteDigitos(valor)
  const semPais = digitos.startsWith('55') && digitos.length > 11 ? digitos.slice(2) : digitos
  if (semPais.length === 11) {
    return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 7)}-${semPais.slice(7)}`
  }
  if (semPais.length === 10) {
    return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 6)}-${semPais.slice(6)}`
  }
  return valor || ''
}

export async function getConfig(chave, padrao = null) {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', chave)
    .maybeSingle()
  if (error || !data) return padrao
  return data.valor
}

// Lê o preço do Kg da chave nova; se não existir, tenta a chave antiga e por fim o padrão.
export async function getPrecoKg(chave) {
  const valor = await getConfig(chave, null)
  if (valor != null) return valor
  const antigo = await getConfig(CHAVE_VALOR_KG, null)
  return antigo != null ? antigo : VALOR_KG_PADRAO
}

// Valor padrão de uma configuração específica (cabeça do porco, sarapatel...).
export async function getValorPadrao(chave, padrao = null) {
  const valor = await getConfig(chave, null)
  return valor != null ? valor : padrao
}

export function setConfig(chave, valor) {
  return supabase.from('configuracoes').upsert({ chave, valor: String(valor) })
}
