// Health-check do banco: conexão, contagem por tabela e migrations pendentes.
// Uso: npm run db:check   (lê VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY do .env)

const url = String(process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const key = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (use npm run db:check).')
  process.exit(1)
}

const headers = { apikey: key, Authorization: `Bearer ${key}` }

const TABELAS = [
  { nome: 'cadastros', chave: 'id' },
  { nome: 'lotes_animais', chave: 'id' },
  { nome: 'vendas_suinos', chave: 'id' },
  { nome: 'tilapias', chave: 'id' },
  { nome: 'codornas', chave: 'id' },
  { nome: 'estoque', chave: 'id' },
  { nome: 'fluxo_caixa', chave: 'id' },
  { nome: 'configuracoes', chave: 'chave' },
]

// Colunas que cada script em supabase/ adiciona. Se faltar alguma, o script
// correspondente ainda não foi rodado no SQL Editor do Supabase.
const MIGRATIONS = [
  {
    arquivo: 'supabase/add-custos-extras.sql',
    tabela: 'lotes_animais',
    colunas: [
      'custo_abate',
      'custo_embalagem',
      'custo_frete',
      'abate_pago',
      'embalagem_pago',
      'frete_pago',
    ],
  },
  {
    arquivo: 'supabase/add-cabeca-sarapatel.sql',
    tabela: 'vendas_suinos',
    colunas: ['qtd_cabecas', 'preco_cabeca', 'kg_sarapatel', 'preco_kg_sarapatel'],
  },
  {
    arquivo: 'supabase/add-perdas-consumidor-lote.sql',
    tabela: 'lotes_animais',
    colunas: ['perdas_kg', 'preco_kg_consumidor'],
  },
  {
    arquivo: 'supabase/add-dias-prazo-venda.sql',
    tabela: 'vendas_suinos',
    colunas: ['dias_prazo'],
  },
  {
    arquivo: 'supabase/add-data-pagamento-venda.sql',
    tabela: 'vendas_suinos',
    colunas: ['data_pagamento'],
  },
  {
    arquivo: 'supabase/add-peso-limpo.sql',
    tabela: 'cadastros',
    colunas: ['peso_limpo'],
  },
  {
    arquivo: 'supabase/add-preco-consumidor.sql',
    tabela: 'cadastros',
    colunas: ['preco_kg_consumidor'],
  },
  {
    arquivo: 'supabase/add-data-cadastro.sql',
    tabela: 'cadastros',
    colunas: ['data_cadastro'],
  },
  {
    arquivo: 'supabase/add-data-compra.sql',
    tabela: 'cadastros',
    colunas: ['data_compra'],
  },
  {
    arquivo: 'supabase/add-campos-compra-cliente.sql',
    tabela: 'cadastros',
    colunas: ['kg_comprado', 'valor_compra'],
  },
  {
    arquivo: 'supabase/add-recebimento-parcial.sql',
    tabela: 'vendas_suinos',
    colunas: ['valor_recebido'],
  },
]

async function selecionar(tabela, colunas) {
  const select = colunas.join(',') || '*'
  const resposta = await fetch(`${url}/rest/v1/${tabela}?select=${select}&limit=1`, {
    headers: { ...headers, Prefer: 'count=exact' },
  })
  const corpo = await resposta.json().catch(() => null)
  return {
    ok: resposta.ok,
    status: resposta.status,
    erro: corpo?.message || resposta.statusText,
    total: corpo?.length ?? 0,
    intervalo: resposta.headers.get('content-range'),
  }
}

console.log(`Banco: ${url}\n`)

let falhas = 0

console.log('Tabelas:')
for (const { nome, chave } of TABELAS) {
  const r = await selecionar(nome, [chave])
  if (r.ok) {
    const total = String(r.intervalo || '').split('/')[1] || '?'
    console.log(`  ok ${nome.padEnd(16)} ${total} registro(s)`)
  } else {
    falhas += 1
    console.log(`  x  ${nome.padEnd(16)} HTTP ${r.status} | ${r.erro}`)
  }
}

console.log('\nMigrations:')
for (const migration of MIGRATIONS) {
  const r = await selecionar(migration.tabela, migration.colunas)
  if (r.ok) {
    console.log(`  ok ${migration.arquivo}`)
    continue
  }
  if (/column|schema cache/i.test(r.erro || '')) {
    falhas += 1
    const faltando = migration.colunas.filter((coluna) => r.erro.includes(coluna))
    console.log(
      `  x  ${migration.arquivo}` +
        (faltando.length ? ` -> falta: ${faltando.join(', ')}` : ''),
    )
  } else {
    falhas += 1
    console.log(`  x  ${migration.arquivo} -> HTTP ${r.status} | ${r.erro}`)
  }
}

if (falhas) {
  console.log('\nResolva os itens com "x" acima (migrations são rodadas no SQL Editor do Supabase).')
  process.exit(1)
}

console.log('\nTudo certo: banco conectado e migrations aplicadas.')
