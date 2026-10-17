import { supabase } from './supabase'

// Configurações gerais do sistema (tabela "configuracoes", formato chave/valor).

export const CHAVE_VALOR_KG_VENDA = 'valor_kg_suino_venda'
export const CHAVE_VALOR_KG = 'valor_kg_suino' // chave antiga (migração)
export const VALOR_KG_PADRAO = 25

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

export function setConfig(chave, valor) {
  return supabase.from('configuracoes').upsert({ chave, valor: String(valor) })
}
