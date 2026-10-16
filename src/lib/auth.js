import { supabase } from './supabase'

// O login só é exigido quando VITE_REQUIRE_AUTH=true no .env.
// Assim o sistema continua funcionando sem senha por padrão.
export const authRequired = import.meta.env.VITE_REQUIRE_AUTH === 'true'

export async function getSession() {
  if (!authRequired) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthChange(callback) {
  if (!authRequired) return { unsubscribe() {} }
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return data.subscription
}

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signUp(email, password) {
  return supabase.auth.signUp({ email, password })
}

export function signOut() {
  return supabase.auth.signOut()
}
