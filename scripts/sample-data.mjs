// =====================================================================
// Dados de SIMULAÇÃO para visualizar o sistema com dados de exemplo.
//
// Uso:
//   node --env-file=.env scripts/sample-data.mjs seed    -> insere exemplos
//   node --env-file=.env scripts/sample-data.mjs clear   -> remove exemplos
//
// As linhas de exemplo são marcadas para poderem ser removidas depois
// SEM afetar os dados reais (marcador conforme a tabela).
// =====================================================================

import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (use --env-file=.env).')
  process.exit(1)
}
const supabase = createClient(url, key)

const SIM = 'SIMULACAO'

const cadastros = [
  { tipo: 'Fornecedor', nome: 'Granja Vale Verde', telefone: '(49) 99911-2020', localidade: 'Concórdia - SC', observacoes: SIM },
  { tipo: 'Fornecedor', nome: 'Nutrição Animal Oeste', telefone: '(49) 98822-3030', localidade: 'Chapecó - SC', observacoes: SIM },
  { tipo: 'Cliente', nome: 'Frigorífico Bom Corte', telefone: '(45) 99733-4040', localidade: 'Cascavel - PR', observacoes: SIM },
  { tipo: 'Cliente', nome: 'Mercado Central Ltda', telefone: '(49) 99644-5050', localidade: 'Xanxerê - SC', observacoes: SIM },
]

const lotes = [
  {
    data_compra: '10/04/2026', quantidade: 120, proposito: 'Abate', fornecedor: 'Granja Vale Verde',
    valor_compra: 84000, peso_vivo_estimado: 10800, custos_extras: 3600,
    possiveis_clientes: 'Frigorífico Bom Corte', comprador_final: 'Frigorífico Bom Corte',
    valor_venda: 121500, status: 'Em engorda', observacoes: SIM,
    data_entrada: '12/04/2026', peso_entrada: 10800, meta_abate: 13000, gmd_necessario: 800,
    data_venda_abate: '20/10/2026', data_limite_pagamento: '05/10/2026',
    forma_pagamento: 'Boleto 30 dias', status_pagamento: 'Pendente',
  },
  {
    data_compra: '02/05/2026', quantidade: 80, proposito: 'Abate', fornecedor: 'Granja Vale Verde',
    valor_compra: 56000, peso_vivo_estimado: 7200, custos_extras: 2400,
    possiveis_clientes: 'Frigorífico Bom Corte', comprador_final: '',
    valor_venda: 0, status: 'Em engorda', observacoes: SIM,
    data_entrada: '03/05/2026', peso_entrada: 7200, meta_abate: 9200, gmd_necessario: 750,
    data_limite_pagamento: '25/10/2026', forma_pagamento: 'Boleto 30 dias', status_pagamento: 'A pagar',
  },
  {
    data_compra: '15/05/2026', quantidade: 40, proposito: 'Reprodução', fornecedor: 'Granja Vale Verde',
    valor_compra: 48000, peso_vivo_estimado: 4800, custos_extras: 1500,
    status: 'Matrizes', observacoes: SIM,
    data_entrada: '16/05/2026', peso_entrada: 4800, meta_abate: 0,
    data_limite_pagamento: '10/06/2026', forma_pagamento: 'Pix', status_pagamento: 'Pago',
  },
  {
    data_compra: '20/06/2026', quantidade: 150, proposito: 'Abate', fornecedor: 'Granja Vale Verde',
    valor_compra: 102000, peso_vivo_estimado: 13500, custos_extras: 4200,
    possiveis_clientes: 'Mercado Central Ltda', valor_venda: 148000, status: 'Pronto p/ abate', observacoes: SIM,
    data_entrada: '21/06/2026', peso_entrada: 13500, meta_abate: 16000, gmd_necessario: 900,
    data_venda_abate: '15/11/2026', data_limite_pagamento: '30/10/2026',
    forma_pagamento: 'Boleto 45 dias', status_pagamento: 'Parcelado',
  },
]

const estoque = [
  { item: 'Ração Suíno Engorda', categoria: 'Nutrição', unidade_medida: 'Saca 40kg', estoque_minimo: 100, total_entradas: 800, total_saidas: 780, saldo_atual: 20, status: SIM },
  { item: 'Ração Suíno Creche', categoria: 'Nutrição', unidade_medida: 'Saca 40kg', estoque_minimo: 60, total_entradas: 400, total_saidas: 360, saldo_atual: 40, status: SIM },
  { item: 'Vacina Suína', categoria: 'Sanidade', unidade_medida: 'Frasco', estoque_minimo: 40, total_entradas: 200, total_saidas: 180, saldo_atual: 20, status: SIM },
  { item: 'Vermífugo', categoria: 'Sanidade', unidade_medida: 'Frasco', estoque_minimo: 20, total_entradas: 150, total_saidas: 60, saldo_atual: 90, status: SIM },
  { item: 'Ração Tilápia', categoria: 'Nutrição', unidade_medida: 'Saca 25kg', estoque_minimo: 80, total_entradas: 500, total_saidas: 480, saldo_atual: 20, status: SIM },
  { item: 'Ração Codorna Postura', categoria: 'Nutrição', unidade_medida: 'Saca 20kg', estoque_minimo: 50, total_entradas: 300, total_saidas: 240, saldo_atual: 60, status: SIM },
]

const fluxo = [
  { data: '05/01/2026', descricao: '[SIM] Venda de lote abatido', setor: 'Suínos', categoria: 'Entrada', valor: 118000, forma_pagamento: 'Transferência' },
  { data: '12/01/2026', descricao: '[SIM] Compra de ração', setor: 'Nutrição', categoria: 'Saída', valor: 32000, forma_pagamento: 'Boleto' },
  { data: '02/02/2026', descricao: '[SIM] Venda de ovos (bandejas)', setor: 'Codorna', categoria: 'Entrada', valor: 14500, forma_pagamento: 'Pix' },
  { data: '18/02/2026', descricao: '[SIM] Medicamentos e vacinas', setor: 'Sanidade', categoria: 'Saída', valor: 8600, forma_pagamento: 'Cartão' },
  { data: '10/03/2026', descricao: '[SIM] Venda de tilápias', setor: 'Tilápia', categoria: 'Entrada', valor: 26500, forma_pagamento: 'Pix' },
  { data: '22/03/2026', descricao: '[SIM] Folha de pagamento', setor: 'Administrativo', categoria: 'Saída', valor: 18500, forma_pagamento: 'Transferência' },
  { data: '15/04/2026', descricao: '[SIM] Frete e combustível', setor: 'Administrativo', categoria: 'Saída', valor: 7400, forma_pagamento: 'Débito' },
  { data: '20/05/2026', descricao: '[SIM] Venda de lote abatido', setor: 'Suínos', categoria: 'Entrada', valor: 132000, forma_pagamento: 'Boleto' },
  { data: '28/05/2026', descricao: '[SIM] Compra de ração', setor: 'Nutrição', categoria: 'Saída', valor: 41000, forma_pagamento: 'Boleto' },
  { data: '30/06/2026', descricao: '[SIM] Energia e manutenção', setor: 'Administrativo', categoria: 'Saída', valor: 5200, forma_pagamento: 'Débito' },
]

const tilapias = [
  { data: '01/03/2026', tanque: 'Tanque 01', qtd_alevinos: 2000, custo_racao: 3200, previsao_despesca: '01/08/2026', qtd_abatida_kg: 0, cliente: '', valor_venda: 0, status: SIM },
  { data: '15/02/2026', tanque: 'Tanque 02', qtd_alevinos: 1800, custo_racao: 2900, previsao_despesca: '10/07/2026', qtd_abatida_kg: 480, cliente: 'Mercado Central Ltda', valor_venda: 26500, status: SIM },
]

const codornas = [
  { data_coleta: '30/06/2026', lote_gaiola: 'Gaiola A', qtd_aves_ativas: 500, ovos_produzidos: 420, bandejas_montadas: 14, custo_racao: 1200, destino_venda: 'Mercado Central Ltda', valor_venda: 14500, status: SIM },
]

async function limpar() {
  const passos = [
    ['cadastros', 'observacoes', SIM],
    ['lotes_animais', 'observacoes', SIM],
    ['estoque', 'status', SIM],
    ['tilapias', 'status', SIM],
    ['codornas', 'status', SIM],
  ]
  let total = 0
  for (const [tabela, campo, valor] of passos) {
    const { error, count } = await supabase
      .from(tabela)
      .delete({ count: 'exact' })
      .eq(campo, valor)
    if (error) {
      console.error(`x ${tabela}: ${error.message}`)
      process.exitCode = 1
    } else {
      total += count || 0
      console.log(`ok ${tabela.padEnd(15)} removidas ${count || 0}`)
    }
  }
  const { error, count } = await supabase
    .from('fluxo_caixa')
    .delete({ count: 'exact' })
    .like('descricao', '[SIM]%')
  if (error) {
    console.error(`x fluxo_caixa: ${error.message}`)
    process.exitCode = 1
  } else {
    total += count || 0
    console.log(`ok ${'fluxo_caixa'.padEnd(15)} removidas ${count || 0}`)
  }
  console.log(`\nTotal removido: ${total} registro(s) de simulação.`)
}

async function inserir() {
  const lotesFixos = lotes.map((l) => ({
    ...l,
    custo_total: (l.valor_compra || 0) + (l.custos_extras || 0),
  }))

  const grupos = [
    ['cadastros', cadastros],
    ['lotes_animais', lotesFixos],
    ['estoque', estoque],
    ['fluxo_caixa', fluxo],
    ['tilapias', tilapias],
    ['codornas', codornas],
  ]

  for (const [tabela, linhas] of grupos) {
    const { error } = await supabase.from(tabela).insert(linhas)
    if (error) {
      console.error(`x ${tabela}: ${error.message}`)
      process.exitCode = 1
    } else {
      console.log(`ok ${tabela.padEnd(15)} inseridas ${linhas.length}`)
    }
  }
  console.log('\nDados de simulação inseridos. Abra o sistema e veja o Dashboard/Financeiro.')
  console.log('Para remover depois: node --env-file=.env scripts/sample-data.mjs clear')
}

const modo = process.argv[2] || 'seed'
if (modo === 'clear') {
  await limpar()
} else if (modo === 'seed') {
  await inserir()
} else {
  console.error(`Modo inválido: "${modo}". Use "seed" ou "clear".`)
  process.exit(1)
}
