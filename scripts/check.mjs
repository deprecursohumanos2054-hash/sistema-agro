// Health-check simples: testa a conexão e conta registros por tabela.
// Uso: node --env-file=.env scripts/check.mjs
import { createClient } from '@supabase/supabase-js'
import { MODULES } from '../src/lib/modules.js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (use --env-file=.env).')
  process.exit(1)
}

const supabase = createClient(url, key)

for (const module of MODULES) {
  const { data, error, status, statusText } = await supabase
    .from(module.table)
    .select('*')
    .limit(5)

  if (error) {
    console.log(`x ${module.table.padEnd(16)} -> HTTP ${status} ${statusText} | ${error.message}`)
  } else {
    console.log(`ok ${module.table.padEnd(16)} -> HTTP ${status} | ${(data || []).length} linha(s)`)
  }
}
