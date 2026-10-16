// =====================================================================
// Migração: Google Sheets (ERP original) -> Supabase
//
// Modos de uso:
//   node --env-file=.env scripts/import-sheet.mjs            -> insere no Supabase
//   node scripts/import-sheet.mjs --sql supabase/seed.sql    -> gera arquivo .sql
//
// O script lê os dados direto da planilha pública via endpoint gviz
// (não precisa baixar CSV nem autenticar no Google).
// =====================================================================

import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { MODULES } from '../src/lib/modules.js'

const SHEET_ID = '1i1ntSb70IbIaxePWL3ON0ki6EPOIf3DFo5PlNoyacJc'

// Layout de cada aba:
//   sheet     -> nome exato da aba
//   headerRow -> índice (0-based) da linha de cabeçalho; dados começam depois
//   map       -> índices de origem, na MESMA ordem das colunas do módulo
const LAYOUT = {
  cadastros: { sheet: '👥 Cadastros', headerRow: 0, map: [0, 1, 2, 3, 4] },
  lotes_animais: {
    sheet: '🐷 Lotes e Animais',
    headerRow: 0,
    map: Array.from({ length: 24 }, (_, i) => i),
  },
  tilapias: { sheet: '🐟 Criação de Tilápias', headerRow: 0, map: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  codornas: { sheet: '🥚 Plantel e Ovos (Codornas)', headerRow: 0, map: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  estoque: { sheet: '📦 Estoque Geral', headerRow: 0, map: [0, 1, 2, 3, 4, 5, 6, 7] },
  // Fluxo de Caixa: linha 1 título, 2-3 resumo, 4 cabeçalho. Coluna A vazia,
  // valor cai na coluna F (índice 5) — mapa ajustado ao layout real da aba.
  fluxo_caixa: { sheet: 'Fluxo de Caixa', headerRow: 3, map: [1, 2, 3, 4, 5, 7] },
}

async function fetchSheet(name) {
  const url =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
    `?tqx=out:json&headers=0&sheet=${encodeURIComponent(name)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha ao baixar a aba "${name}" (HTTP ${res.status})`)
  const text = await res.text()
  const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
  return json.table.rows.map((r) =>
    r.c.map((cell) => (cell ? { v: cell.v, f: cell.f } : null)),
  )
}

function buildRows(module, grid) {
  const { headerRow, map } = LAYOUT[module.key]
  const rows = []

  for (let r = headerRow + 1; r < grid.length; r++) {
    const source = grid[r]
    const isEmpty = map.every((idx) => {
      const cell = source[idx]
      return !cell || cell.v === null || cell.v === ''
    })
    if (isEmpty) continue

    const record = {}
    module.columns.forEach((column, i) => {
      const cell = source[map[i]]
      if (!cell || cell.v === null || cell.v === '') {
        record[column.name] = null
      } else if (column.type === 'number') {
        const n = Number(cell.v)
        record[column.name] = Number.isNaN(n) ? null : n
      } else {
        record[column.name] = cell.f != null ? cell.f : String(cell.v)
      }
    })
    rows.push(record)
  }
  return rows
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  return `'${String(value).replace(/'/g, "''")}'`
}

function toInsertSql(table, columns, rows) {
  const cols = columns.map((c) => c.name).join(', ')
  const values = rows
    .map((row) => `  (${columns.map((c) => sqlLiteral(row[c.name])).join(', ')})`)
    .join(',\n')
  return `insert into public.${table} (${cols}) values\n${values};`
}

async function main() {
  const args = process.argv.slice(2)
  const sqlIndex = args.indexOf('--sql')
  const sqlOut = sqlIndex !== -1 ? args[sqlIndex + 1] || 'supabase/seed.sql' : null

  let supabase = null
  if (!sqlOut) {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    if (!url || !key) {
      console.error(
        'Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.\n' +
          'Rode com: node --env-file=.env scripts/import-sheet.mjs\n' +
          'Ou gere só o SQL: node scripts/import-sheet.mjs --sql supabase/seed.sql',
      )
      process.exit(1)
    }
    supabase = createClient(url, key)
  }

  const sqlBlocks = []
  let total = 0

  for (const module of MODULES) {
    const { sheet } = LAYOUT[module.key]
    process.stdout.write(`> ${module.table}: lendo "${sheet}"... `)
    const grid = await fetchSheet(sheet)
    const rows = buildRows(module, grid)
    total += rows.length
    console.log(`${rows.length} linha(s)`)

    if (rows.length === 0) continue

    if (sqlOut) {
      sqlBlocks.push(`-- ${module.table} (${rows.length} linha(s))\n${toInsertSql(module.table, module.columns, rows)}`)
    } else {
      const { error } = await supabase.from(module.table).insert(rows)
      if (error) {
        console.error(`  ERRO ao inserir em ${module.table}: ${error.message}`)
        process.exitCode = 1
      } else {
        console.log(`  ok: ${rows.length} inserida(s) em ${module.table}`)
      }
    }
  }

  if (sqlOut && sqlBlocks.length > 0) {
    const header =
      '-- Gerado automaticamente por scripts/import-sheet.mjs\n' +
      '-- Rode no SQL Editor do Supabase depois de criar as tabelas (schema.sql).\n\n'
    writeFileSync(sqlOut, header + sqlBlocks.join('\n\n') + '\n', 'utf8')
    console.log(`SQL gerado em: ${sqlOut} (${total} linha(s) no total)`)
  } else if (sqlOut) {
    console.log('Nenhuma linha para migrar.')
  } else {
    console.log(`Migração concluída: ${total} linha(s).`)
  }
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})
