// Configuração central dos módulos do ERP.
// Cada módulo aponta para uma tabela do Supabase e define as colunas exibidas/editáveis.
// Colunas com "computed" são calculadas na hora (não são gravadas nem editáveis).

import { num } from './format'
import { parseDateBR, addDays, formatDateBR } from './date'

const custoTotalLote = (r) => num(r.valor_compra) + num(r.custos_extras)
const pesoLote = (r) => num(r.peso_vivo_estimado) || num(r.peso_entrada)
const lucroLote = (r) => num(r.valor_venda) - custoTotalLote(r)

// Preço do Kg bruto = Valor da Compra ÷ Peso Vivo do lote.
const precoKgBruto = (r) => {
  const vivo = pesoLote(r)
  return vivo ? num(r.valor_compra) / vivo : null
}

// Peso limpo do lote = Peso Vivo − Perdas (vísceras + cabeça).
const pesoLimpoLote = (r) => {
  const vivo = pesoLote(r)
  const perdas = num(r.perdas_kg)
  if (vivo && perdas) return vivo - perdas
  return null
}

// Preço do Kg real/líquido = Valor da Compra ÷ Peso Limpo (após retirar vísceras e cabeça).
const precoKgLiquido = (r) => {
  const limpo = pesoLimpoLote(r)
  return limpo ? num(r.valor_compra) / limpo : null
}

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
      { name: 'created_at', label: 'Data do Cadastro', compute: (r) => formatDateBR(r.created_at), help: 'Data em que o cadastro foi criado (automática).' },
      { name: 'nome', label: 'Nome', help: 'Nome do cliente.' },
      { name: 'telefone', label: 'Telefone / WhatsApp', help: 'Telefone ou WhatsApp para contato.' },
      { name: 'localidade', label: 'Localidade / Endereço', help: 'Cidade / endereço do cliente.' },
      { name: 'data_compra', label: 'Data de Compra', type: 'date', help: 'Data em que o cliente pediu/comprou os suínos.' },
      { name: 'kg_comprado', label: 'Quantidade Comprada (Kg)', type: 'number', help: 'Quantidade comprada em Kg.' },
      { name: 'valor_compra', label: 'Valor Comprado (R$)', type: 'number', autoCalcQty: 'kg_comprado', autoCalcPrecoChave: 'valor_kg_suino_venda', help: 'Calculado automaticamente: Quantidade (Kg) × Valor do Kg de Venda (ajustável em Configurações).' },
      { name: 'observacoes', label: 'Observações', help: 'Anotações livres.' },
    ],
  },
  {
    key: 'fornecedores',
    label: 'Fornecedores',
    icon: '🚚',
    table: 'cadastros',
    fixed: { tipo: 'Fornecedor' },
    columns: [
      { name: 'created_at', label: 'Data do Cadastro', compute: (r) => formatDateBR(r.created_at), help: 'Data em que o cadastro foi criado (automática).' },
      { name: 'nome', label: 'Nome', help: 'Nome do fornecedor.' },
      { name: 'telefone', label: 'Telefone / WhatsApp', help: 'Telefone ou WhatsApp para contato.' },
      { name: 'localidade', label: 'Localidade / Endereço', help: 'Cidade / endereço do fornecedor.' },
      { name: 'data_compra', label: 'Data de Referência', type: 'date', help: 'Data de referência do fornecedor (opcional).' },
      { name: 'observacoes', label: 'Observações', help: 'Anotações livres.' },
    ],
  },
  {
    key: 'lotes_animais',
    label: 'Lotes Suínos',
    icon: '🐷',
    table: 'lotes_animais',
    columns: [
      { name: 'data_compra', label: 'Data da Compra', type: 'date', help: 'Dia em que você comprou o lote.' },
      { name: 'quantidade', label: 'Quantidade', type: 'number', help: 'Número de cabeças (animais) do lote.' },
      { name: 'proposito', label: 'Propósito (Abate / Reprodução)', help: 'Para que serve o lote: Abate/engorda ou Reprodução (matrizes/reprodutores).' },
      { name: 'fornecedor', label: 'Fornecedor', help: 'De quem você comprou o lote.' },
      { name: 'valor_compra', label: 'Valor de Compra (R$)', type: 'number', help: 'Quanto você pagou pelo lote.' },
      { name: 'peso_vivo_estimado', label: 'Peso Vivo Estimado (Kg)', type: 'number', help: 'Peso total estimado dos animais na compra (usado no preço por Kg).' },
      { name: 'custos_extras', label: 'Custos Extras (Abate/Frete)', type: 'number', help: 'Frete, taxas, abate e outros custos do lote.' },
      { name: 'custo_total', label: 'Custo Total (R$)', compute: custoTotalLote, help: 'Automático: Valor de Compra + Custos Extras.' },
      { name: 'possiveis_clientes', label: 'Possíveis Clientes', help: 'Quem pode comprar o lote.' },
      { name: 'comprador_final', label: 'Comprador Final', help: 'Quem realmente comprou o lote.' },
      { name: 'valor_venda', label: 'Valor de Venda (R$)', type: 'number', help: 'Valor total recebido na venda do lote.' },
      {
        name: 'preco_venda_kg',
        label: 'Preço de Venda por Kg (R$)',
        compute: (r) => (pesoLote(r) ? num(r.valor_venda) / pesoLote(r) : null),
        help: 'Automático: Valor de Venda ÷ peso (estimado ou de entrada).',
      },
      { name: 'lucro', label: 'Lucro (R$)', compute: lucroLote, help: 'Automático: Valor de Venda − Custo Total.' },
      { name: 'status', label: 'Status', help: 'Situação geral do lote (ex.: Em engorda, Pronto p/ abate, Vendido).' },
      { name: 'observacoes', label: 'Observações', help: 'Anotações livres.' },
      { name: 'data_entrada', label: 'Data de Entrada', type: 'date', help: 'Quando os animais entraram na sua propriedade.' },
      { name: 'peso_entrada', label: 'Peso Entrada (Kg)', type: 'number', help: 'Peso total do lote ao entrar (base para a projeção de engorda).' },
      { name: 'meta_abate', label: 'Meta de Abate (Kg)', type: 'number', help: 'Peso total que você quer atingir antes de abater/vender.' },
      { name: 'gmd_necessario', label: 'GMD Necessário (g/dia)', type: 'number', help: 'Ganho Médio Diário por animal, em gramas/dia (ex.: 800 = 0,8 kg/dia).' },
      { name: 'dias_estimados', label: 'Dias p/ Abate (calc.)', compute: diasEstimados, help: 'Automático: (Meta − Peso Entrada) × 1000 ÷ (GMD × Quantidade).' },
      { name: 'data_prevista_abate', label: 'Data Prevista Abate (calc.)', compute: dataPrevistaAbate, help: 'Automático: Data de Entrada + Dias p/ Abate.' },
      { name: 'data_venda_abate', label: 'Data de Venda/Abate', type: 'date', help: 'Data em que o lote foi vendido ou abatido.' },
      { name: 'perdas_kg', label: 'Perdas — Vísceras + Cabeça (Kg)', type: 'number', help: 'Peso descartado no abate (vísceras + cabeça), que não vai para venda.' },
      { name: 'peso_limpo', label: 'Peso Limpo (Kg)', compute: pesoLimpoLote, help: 'Automático: Peso Vivo − Perdas (parte aproveitável).' },
      { name: 'preco_kg_bruto', label: 'Preço Kg Bruto (R$)', compute: precoKgBruto, help: 'Automático: Valor de Compra ÷ Peso Vivo.' },
      { name: 'preco_kg_liquido', label: 'Preço Kg Limpo (R$)', compute: precoKgLiquido, help: 'Automático: Valor de Compra ÷ Peso Limpo (valor real do Kg).' },
      { name: 'preco_kg_consumidor', label: 'Preço do Kg ao Consumidor Final (R$)', type: 'number', help: 'Valor do Kg cobrado do consumidor final (digitado manualmente).' },
      { name: 'data_limite_pagamento', label: 'Data Limite Pagamento', type: 'date', help: 'Vencimento do pagamento (aparece no menu Financeiro).' },
      { name: 'forma_pagamento', label: 'Forma de Pagamento', help: 'Pix, boleto, dinheiro, transferência etc.' },
      { name: 'status_pagamento', label: 'Status de Pagamento', help: 'Ex.: Pago, Pendente, Atrasado. Se não for "Pago", entra no Financeiro como conta a pagar.' },
    ],
  },
  {
    key: 'tilapias',
    label: 'Tilápias',
    icon: '🐟',
    table: 'tilapias',
    columns: [
      { name: 'data', label: 'Data', type: 'date', help: 'Data do registro.' },
      { name: 'tanque', label: 'Identificação do Tanque', help: 'Nome/número do tanque.' },
      { name: 'qtd_alevinos', label: 'Qtd de Alevinos/Peixes', type: 'number', help: 'Quantidade de alevinos/peixes no tanque.' },
      { name: 'custo_racao', label: 'Custo Ração (R$)', type: 'number', help: 'Gasto com ração (R$).' },
      { name: 'previsao_despesca', label: 'Previsão de Despesca', type: 'date', help: 'Data prevista da despesca (retirada dos peixes).' },
      { name: 'qtd_abatida_kg', label: 'Qtd Abatida (Kg)', type: 'number', help: 'Quantidade retirada/abatida em Kg.' },
      { name: 'cliente', label: 'Cliente / Comprador', help: 'Quem comprou os peixes.' },
      { name: 'valor_venda', label: 'Valor da Venda (R$)', type: 'number', help: 'Valor total recebido na venda.' },
      { name: 'status', label: 'Status', help: 'Situação do tanque/criação.' },
    ],
  },
  {
    key: 'codornas',
    label: 'Codornas',
    icon: '🥚',
    table: 'codornas',
    columns: [
      { name: 'data_coleta', label: 'Data da Coleta', type: 'date', help: 'Data da coleta dos ovos.' },
      { name: 'lote_gaiola', label: 'Lote / Gaiola', help: 'Identificação do lote ou gaiola.' },
      { name: 'qtd_aves_ativas', label: 'Qtd de Aves Ativas', type: 'number', help: 'Quantidade de aves em produção.' },
      { name: 'ovos_produzidos', label: 'Ovos Produzidos (Unidade)', type: 'number', help: 'Total de ovos produzidos (unidades).' },
      { name: 'bandejas_montadas', label: 'Bandejas Montadas', type: 'number', help: 'Quantidade de bandejas montadas para venda.' },
      { name: 'custo_racao', label: 'Custo de Ração (R$)', type: 'number', help: 'Gasto com ração (R$).' },
      { name: 'destino_venda', label: 'Destino da Venda', help: 'Para quem os ovos foram vendidos.' },
      { name: 'valor_venda', label: 'Valor da Venda (R$)', type: 'number', help: 'Valor total recebido na venda.' },
      { name: 'status', label: 'Status', help: 'Situação do plantel/produção.' },
    ],
  },
  {
    key: 'estoque',
    label: 'Estoque Geral',
    icon: '📦',
    table: 'estoque',
    rowAlert: (r) => num(r.saldo_atual) < num(r.estoque_minimo),
    columns: [
      { name: 'item', label: 'Item / Produto', help: 'Nome do produto/item.' },
      { name: 'categoria', label: 'Categoria', help: 'Categoria do item (ex.: Nutrição, Sanidade).' },
      { name: 'unidade_medida', label: 'Unidade de Medida (Kg/Saca/Frasco)', help: 'Unidade de medida (Kg, Saca, Frasco...).' },
      { name: 'estoque_minimo', label: 'Estoque Mínimo', type: 'number', help: 'Quantidade mínima; abaixo disso o item fica em alerta (linha vermelha).' },
      { name: 'total_entradas', label: 'Total Entradas', type: 'number', help: 'Total que entrou no estoque.' },
      { name: 'total_saidas', label: 'Total Saídas', type: 'number', help: 'Total que saiu do estoque.' },
      { name: 'saldo_atual', label: 'Saldo Atual', type: 'number', help: 'Saldo atual em estoque.' },
      { name: 'status', label: 'Status (Alerta)', help: 'Situação do item.' },
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
      { name: 'data', label: 'Data', type: 'date', help: 'Data do lançamento.' },
      { name: 'descricao', label: 'Descrição', help: 'Descrição do lançamento (o que foi).' },
      { name: 'setor', label: 'Setor', help: 'Setor (ex.: Nutrição, Sanidade, Administrativo).' },
      { name: 'categoria', label: 'Categoria (Entrada/Saída)', help: 'Digite "Entrada" (dinheiro que entra) ou "Saída" (dinheiro que sai).' },
      { name: 'valor', label: 'Valor (R$)', type: 'number', help: 'Valor em R$.' },
      { name: 'saldo_acumulado', label: 'Saldo Acumulado (R$)', help: 'Automático: soma de entradas − saídas até este lançamento.' },
      { name: 'forma_pagamento', label: 'Forma de Pagamento', help: 'Pix, boleto, dinheiro, transferência etc.' },
    ],
  },
]

export function getModuleByKey(key) {
  return MODULES.find((m) => m.key === key) || null
}

export const MODULE_KEYS = MODULES.map((m) => m.key)
