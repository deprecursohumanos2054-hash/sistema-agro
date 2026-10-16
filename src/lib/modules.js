// Configuração central dos módulos do ERP.
// Cada módulo aponta para uma tabela do Supabase e define as colunas exibidas/editáveis.
// Colunas com "computed" são calculadas na hora (não são gravadas nem editáveis).

import { num } from './format'
import { parseDateBR, addDays, formatDateBR } from './date'

const custoTotalLote = (r) => num(r.valor_compra) + num(r.custos_extras)
const pesoLote = (r) => num(r.peso_vivo_estimado) || num(r.peso_entrada)
const lucroLote = (r) => num(r.valor_venda) - custoTotalLote(r)

// Dias necessários para atingir a meta, usando o GMD informado (g/dia).
// O GMD é por animal, então o ganho de peso é dividido pela quantidade.
const diasEstimados = (r) => {
  const entrada = num(r.peso_entrada)
  const meta = num(r.meta_abate)
  const gmd = num(r.gmd_necessario)
  const qtd = num(r.quantidade) || 1
  if (entrada > 0 && meta > entrada && gmd > 0) {
    return Math.ceil(((meta - entrada) * 1000) / (gmd * qtd))
  }
  return null
}

// Data prevista de abate = data de entrada + dias estimados.
const dataPrevistaAbate = (r) => {
  const base = parseDateBR(r.data_entrada) || parseDateBR(r.data_compra)
  const dias = diasEstimados(r)
  if (base && dias > 0) return formatDateBR(addDays(base, dias))
  return null
}

// Saldo acumulado do fluxo de caixa (calculado em ordem cronológica).
const decorarFluxo = (rows) => {
  const cronologico = [...rows].sort((a, b) => {
    const da = parseDateBR(a.data)
    const db = parseDateBR(b.data)
    return (da ? da.getTime() : 0) - (db ? db.getTime() : 0)
  })
  let saldo = 0
  for (const r of cronologico) {
    const cat = String(r.categoria || '').toLowerCase()
    saldo += cat.includes('ent') ? num(r.valor) : -num(r.valor)
    r.saldo_acumulado = saldo
  }
  return rows
}

export const MODULES = [
  {
    key: 'clientes',
    label: 'Clientes',
    icon: '🧑‍🌾',
    table: 'cadastros',
    fixed: { tipo: 'Cliente' },
    columns: [
      { name: 'created_at', label: 'Data do Cadastro', compute: (r) => formatDateBR(r.created_at) },
      { name: 'nome', label: 'Nome' },
      { name: 'telefone', label: 'Telefone / WhatsApp' },
      { name: 'localidade', label: 'Localidade / Endereço' },
      { name: 'data_compra', label: 'Data de Compra', type: 'date' },
      { name: 'observacoes', label: 'Observações' },
    ],
  },
  {
    key: 'fornecedores',
    label: 'Fornecedores',
    icon: '🚚',
    table: 'cadastros',
    fixed: { tipo: 'Fornecedor' },
    columns: [
      { name: 'created_at', label: 'Data do Cadastro', compute: (r) => formatDateBR(r.created_at) },
      { name: 'nome', label: 'Nome' },
      { name: 'telefone', label: 'Telefone / WhatsApp' },
      { name: 'localidade', label: 'Localidade / Endereço' },
      { name: 'data_compra', label: 'Data de Compra', type: 'date' },
      { name: 'observacoes', label: 'Observações' },
    ],
  },
  {
    key: 'lotes_animais',
    label: 'Lotes Suínos',
    icon: '🐷',
    table: 'lotes_animais',
    columns: [
      { name: 'data_compra', label: 'Data da Compra', type: 'date' },
      { name: 'quantidade', label: 'Quantidade', type: 'number' },
      { name: 'proposito', label: 'Propósito (Abate / Reprodução)' },
      { name: 'fornecedor', label: 'Fornecedor' },
      { name: 'valor_compra', label: 'Valor de Compra (R$)', type: 'number' },
      { name: 'peso_vivo_estimado', label: 'Peso Vivo Estimado (Kg)', type: 'number' },
      { name: 'custos_extras', label: 'Custos Extras (Abate/Frete)', type: 'number' },
      { name: 'custo_total', label: 'Custo Total (R$)', compute: custoTotalLote },
      { name: 'possiveis_clientes', label: 'Possíveis Clientes' },
      { name: 'comprador_final', label: 'Comprador Final' },
      { name: 'valor_venda', label: 'Valor de Venda (R$)', type: 'number' },
      {
        name: 'preco_venda_kg',
        label: 'Preço de Venda por Kg (R$)',
        compute: (r) => (pesoLote(r) ? num(r.valor_venda) / pesoLote(r) : null),
      },
      { name: 'lucro', label: 'Lucro (R$)', compute: lucroLote },
      { name: 'status', label: 'Status' },
      { name: 'observacoes', label: 'Observações' },
      { name: 'data_entrada', label: 'Data de Entrada', type: 'date' },
      { name: 'peso_entrada', label: 'Peso Entrada (Kg)', type: 'number' },
      { name: 'meta_abate', label: 'Meta de Abate (Kg)', type: 'number' },
      { name: 'gmd_necessario', label: 'GMD Necessário (g/dia)', type: 'number' },
      { name: 'dias_estimados', label: 'Dias p/ Abate (calc.)', compute: diasEstimados },
      { name: 'data_prevista_abate', label: 'Data Prevista Abate (calc.)', compute: dataPrevistaAbate },
      { name: 'data_venda_abate', label: 'Data de Venda/Abate', type: 'date' },
      { name: 'data_limite_pagamento', label: 'Data Limite Pagamento', type: 'date' },
      { name: 'forma_pagamento', label: 'Forma de Pagamento' },
      { name: 'status_pagamento', label: 'Status de Pagamento' },
    ],
  },
  {
    key: 'tilapias',
    label: 'Tilápias',
    icon: '🐟',
    table: 'tilapias',
    columns: [
      { name: 'data', label: 'Data', type: 'date' },
      { name: 'tanque', label: 'Identificação do Tanque' },
      { name: 'qtd_alevinos', label: 'Qtd de Alevinos/Peixes', type: 'number' },
      { name: 'custo_racao', label: 'Custo Ração (R$)', type: 'number' },
      { name: 'previsao_despesca', label: 'Previsão de Despesca', type: 'date' },
      { name: 'qtd_abatida_kg', label: 'Qtd Abatida (Kg)', type: 'number' },
      { name: 'cliente', label: 'Cliente / Comprador' },
      { name: 'valor_venda', label: 'Valor da Venda (R$)', type: 'number' },
      { name: 'status', label: 'Status' },
    ],
  },
  {
    key: 'codornas',
    label: 'Codornas',
    icon: '🥚',
    table: 'codornas',
    columns: [
      { name: 'data_coleta', label: 'Data da Coleta', type: 'date' },
      { name: 'lote_gaiola', label: 'Lote / Gaiola' },
      { name: 'qtd_aves_ativas', label: 'Qtd de Aves Ativas', type: 'number' },
      { name: 'ovos_produzidos', label: 'Ovos Produzidos (Unidade)', type: 'number' },
      { name: 'bandejas_montadas', label: 'Bandejas Montadas', type: 'number' },
      { name: 'custo_racao', label: 'Custo de Ração (R$)', type: 'number' },
      { name: 'destino_venda', label: 'Destino da Venda' },
      { name: 'valor_venda', label: 'Valor da Venda (R$)', type: 'number' },
      { name: 'status', label: 'Status' },
    ],
  },
  {
    key: 'estoque',
    label: 'Estoque Geral',
    icon: '📦',
    table: 'estoque',
    rowAlert: (r) => num(r.saldo_atual) < num(r.estoque_minimo),
    columns: [
      { name: 'item', label: 'Item / Produto' },
      { name: 'categoria', label: 'Categoria' },
      { name: 'unidade_medida', label: 'Unidade de Medida (Kg/Saca/Frasco)' },
      { name: 'estoque_minimo', label: 'Estoque Mínimo', type: 'number' },
      { name: 'total_entradas', label: 'Total Entradas', type: 'number' },
      { name: 'total_saidas', label: 'Total Saídas', type: 'number' },
      { name: 'saldo_atual', label: 'Saldo Atual', type: 'number' },
      { name: 'status', label: 'Status (Alerta)' },
    ],
  },
  {
    key: 'fluxo_caixa',
    label: 'Fluxo de Caixa',
    icon: '💰',
    table: 'fluxo_caixa',
    decorate: decorarFluxo,
    filters: [{ name: 'setor', label: 'Setor' }],
    columns: [
      { name: 'data', label: 'Data', type: 'date' },
      { name: 'descricao', label: 'Descrição' },
      { name: 'setor', label: 'Setor' },
      { name: 'categoria', label: 'Categoria (Entrada/Saída)' },
      { name: 'valor', label: 'Valor (R$)', type: 'number' },
      { name: 'saldo_acumulado', label: 'Saldo Acumulado (R$)' },
      { name: 'forma_pagamento', label: 'Forma de Pagamento' },
    ],
  },
]

export function getModuleByKey(key) {
  return MODULES.find((m) => m.key === key) || null
}

export const MODULE_KEYS = MODULES.map((m) => m.key)
