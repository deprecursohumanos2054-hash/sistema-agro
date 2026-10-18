// Configuração central dos módulos do ERP.
// Cada módulo aponta para uma tabela do Supabase e define as colunas exibidas/editáveis.
// Colunas com "computed" são calculadas na hora (não são gravadas nem editáveis).

import { num } from './format'
import { parseDateBR, addDays, formatDateBR } from './date'

const OPCOES_PROPOSITO = ['Abate', 'Reprodução (Macho)', 'Reprodução (Fêmea)']
const OPCOES_STATUS_LOTE = ['Em engorda', 'Pronto p/ abate', 'Abatido', 'Vendido']

// Colunas de engorda (GMD, meta, etc.) só fazem sentido para lotes de abate.
const esconderSeReproducao = (f) => /reprodu/i.test(String(f?.proposito || ''))
const OPCOES_FORMA_PAGAMENTO = ['Dinheiro', 'Pix', 'Transferência', 'Boleto', 'Cartão', 'Cheque']
const OPCOES_STATUS_PAGAMENTO = ['Pago', 'Pendente', 'Atrasado']

const custoTotalLote = (r) => num(r.valor_compra) + num(r.custos_extras)
const pesoLote = (r) => num(r.peso_vivo_estimado) || num(r.peso_entrada)

// Preço do Kg bruto = Custo Total (compra + extras) ÷ Peso Vivo do lote.
const precoKgBruto = (r) => {
  const vivo = pesoLote(r)
  return vivo ? custoTotalLote(r) / vivo : null
}

// Peso limpo do lote = Peso Vivo − Perdas (vísceras + cabeça).
const pesoLimpoLote = (r) => {
  const vivo = pesoLote(r)
  const perdas = num(r.perdas_kg)
  if (vivo && perdas) return vivo - perdas
  return null
}

// Preço do Kg real/líquido = Custo Total ÷ Peso Limpo (após retirar vísceras e cabeça).
const precoKgLiquido = (r) => {
  const limpo = pesoLimpoLote(r)
  return limpo ? custoTotalLote(r) / limpo : null
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
      { name: 'kg_comprado', label: 'Quantidade Comprada (Kg)', type: 'number', kg: true, help: 'Quantidade comprada em Kg.' },
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
    filters: [{ name: 'proposito', label: 'Propósito' }],
    columns: [
      { name: 'data_compra', label: 'Data da Compra', type: 'date', help: 'Dia em que você comprou o lote.' },
      { name: 'quantidade', label: 'Quantidade', type: 'number', help: 'Número de cabeças (animais) do lote.' },
      { name: 'proposito', label: 'Propósito', options: OPCOES_PROPOSITO, help: 'Para que serve o lote: Abate/engorda ou Reprodução (matrizes/reprodutores).' },
      {
        name: 'fornecedor',
        label: 'Fornecedor',
        type: 'select',
        optionsFrom: { table: 'cadastros', valueColumn: 'nome', filter: { tipo: 'Fornecedor' } },
        help: 'Escolha um fornecedor já cadastrado (menu Fornecedores).',
      },
      { name: 'valor_compra', label: 'Valor de Compra (R$)', type: 'number', help: 'Quanto você pagou pelo lote.' },
      { name: 'peso_vivo_estimado', label: 'Peso Vivo Estimado (Kg)', type: 'number', kg: true, help: 'Peso total estimado dos animais na compra (usado no preço por Kg).' },
      { name: 'custos_extras', label: 'Custos Extras (Abate/Frete)', type: 'number', help: 'Frete, taxas, abate e outros custos do lote.' },
      { name: 'custo_total', label: 'Custo Total (R$)', compute: custoTotalLote, help: 'Automático: Valor de Compra + Custos Extras.' },
      { name: 'status', label: 'Status', options: OPCOES_STATUS_LOTE, help: 'Situação geral do lote.' },
      { name: 'observacoes', label: 'Observações', help: 'Anotações livres.' },
      { name: 'data_entrada', label: 'Data de Entrada', type: 'date', help: 'Quando os animais entraram na sua propriedade.' },
      { name: 'peso_entrada', label: 'Peso Entrada (Kg)', type: 'number', kg: true, esconderQuando: esconderSeReproducao, help: 'Peso total do lote ao entrar (base para a projeção de engorda).' },
      { name: 'meta_abate', label: 'Meta de Abate (Kg)', type: 'number', kg: true, esconderQuando: esconderSeReproducao, help: 'Peso total que você quer atingir antes de abater/vender.' },
      { name: 'gmd_necessario', label: 'GMD Necessário (g/dia)', type: 'number', esconderQuando: esconderSeReproducao, help: 'Ganho Médio Diário por animal, em gramas/dia (ex.: 800 = 0,8 kg/dia).' },
      { name: 'dias_estimados', label: 'Dias p/ Abate (calc.)', compute: diasEstimados, esconderQuando: esconderSeReproducao, help: 'Automático: (Meta − Peso Entrada) × 1000 ÷ (GMD × Quantidade).' },
      { name: 'data_prevista_abate', label: 'Data Prevista Abate (calc.)', compute: dataPrevistaAbate, esconderQuando: esconderSeReproducao, help: 'Automático: Data de Entrada + Dias p/ Abate.' },
      { name: 'data_venda_abate', label: 'Data de Venda/Abate', type: 'date', help: 'Data em que o lote foi vendido ou abatido.' },
      { name: 'perdas_kg', label: 'Perdas — Vísceras + Cabeça (Kg)', type: 'number', kg: true, help: 'Peso descartado no abate (vísceras + cabeça), que não vai para venda.' },
      { name: 'peso_limpo', label: 'Peso Limpo (Kg)', compute: pesoLimpoLote, kg: true, help: 'Automático: Peso Vivo − Perdas (parte aproveitável).' },
      { name: 'preco_kg_bruto', label: 'Preço Kg Bruto (R$)', compute: precoKgBruto, help: 'Automático: Custo Total ÷ Peso Vivo.' },
      { name: 'preco_kg_liquido', label: 'Preço Kg Limpo (R$)', compute: precoKgLiquido, help: 'Automático: Custo Total ÷ Peso Limpo (valor real do Kg).' },
      { name: 'data_limite_pagamento', label: 'Data Limite Pagamento', type: 'date', help: 'Vencimento do pagamento ao fornecedor (aparece no menu Financeiro).' },
      { name: 'forma_pagamento', label: 'Forma de Pagamento', options: OPCOES_FORMA_PAGAMENTO, help: 'Como o pagamento será feito ao fornecedor.' },
      { name: 'status_pagamento', label: 'Status de Pagamento', options: OPCOES_STATUS_PAGAMENTO, help: 'Se não for "Pago", entra no Financeiro como conta a pagar.' },
    ],
  },
  {
    key: 'vendas_suinos',
    label: 'Vendas de Suínos',
    icon: '💰',
    table: 'vendas_suinos',
    columns: [
      { name: 'data', label: 'Data', type: 'date', help: 'Data da venda.' },
      {
        name: 'cliente',
        label: 'Cliente',
        type: 'select',
        optionsFrom: { table: 'cadastros', valueColumn: 'nome', filter: { tipo: 'Cliente' } },
        help: 'Escolha um cliente já cadastrado (menu Clientes).',
      },
      { name: 'quantidade', label: 'Quantidade (Kg)', type: 'number', kg: true, help: 'Quilogramas vendidos para este cliente.' },
      { name: 'preco_kg', label: 'Preço por Kg (R$)', type: 'number', help: 'Preço do quilograma cobrado do cliente.' },
      { name: 'valor_total', label: 'Valor Total (R$)', type: 'number', autoCalcProduto: { qtd: 'quantidade', preco: 'preco_kg' }, help: 'Automático: Quantidade (Kg) × Preço por Kg.' },
      { name: 'data_vencimento', label: 'Data de Vencimento', type: 'date', help: 'Vencimento do recebimento (aparece no Financeiro).' },
      { name: 'forma_pagamento', label: 'Forma de Pagamento', options: OPCOES_FORMA_PAGAMENTO, help: 'Como o cliente pagará.' },
      { name: 'status_pagamento', label: 'Status de Pagamento', options: OPCOES_STATUS_PAGAMENTO, help: 'Se não for "Pago", entra no Financeiro como conta a receber.' },
      { name: 'observacoes', label: 'Observações', help: 'Anotações livres.' },
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
      { name: 'qtd_abatida_kg', label: 'Qtd Abatida (Kg)', type: 'number', kg: true, help: 'Quantidade retirada/abatida em Kg.' },
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
