import { supabase } from './supabase'

// O papel de cada usuário fica em app_metadata, que só o administrador do
// banco consegue alterar (o próprio usuário não consegue mudar).
export const ehAdmin = (session) => session?.user?.app_metadata?.role === 'admin'
export const ehConsulta = (session) => session?.user?.app_metadata?.role === 'consulta'

// O modo restrito é ligado/desligado no banco, na tabela "configuracoes"
// (chave "acesso_restrito"). Enquanto o script não for rodado, a função não
// existe e o sistema continua aberto como antes.
// Para forçar localmente: VITE_REQUIRE_AUTH=false (aberto) ou true (fechado).
export async function acessoRestritoAtivo() {
  const forcar = import.meta.env.VITE_REQUIRE_AUTH
  if (forcar === 'false') return false
  if (forcar === 'true') return true

  const { data, error } = await supabase.rpc('acesso_restrito_ativo')
  if (error) return false
  return data === true
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return data.subscription
}

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signOut() {
  return supabase.auth.signOut()
}
