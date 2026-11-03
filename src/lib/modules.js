// Configuração central dos módulos do ERP.
// Cada módulo aponta para uma tabela do Supabase e define as colunas exibidas/editáveis.
// Colunas com "computed" são calculadas na hora (não são gravadas nem editáveis).

import { num } from './format'
import { parseDateBR, addDays, formatDateBR, diasAte } from './date'

const OPCOES_PROPOSITO = ['Abate', 'Reprodução (Macho)', 'Reprodução (Fêmea)']
const OPCOES_STATUS_LOTE = ['Em engorda', 'Pronto p/ abate', 'Abatido', 'Vendido']

// Colunas de engorda (GMD, meta, etc.) só fazem sentido para lotes de abate.
const esconderSeReproducao = (f) => /reprodu/i.test(String(f?.proposito || ''))
const OPCOES_FORMA_PAGAMENTO = ['Dinheiro', 'Pix', 'Transferência', 'Boleto', 'Cartão', 'Cheque']
const OPCOES_STATUS_PAGAMENTO = ['Pago', 'Pendente', 'Atrasado']

// Custos extras do lote (abate/machante, embalagem e frete). Nos lotes antigos,
// em que havia um único campo "Custos Extras", usa esse valor como fallback.
export const custosExtrasLote = (r) => {
  const abate = num(r.custo_abate)
  const embalagem = num(r.custo_embalagem)
  const frete = num(r.custo_frete)
  if (abate || embalagem || frete) return abate + embalagem + frete
  return num(r.custos_extras)
}

// Parte dos custos extras que ainda não foi paga (aparece no Financeiro).
// Nos lotes antigos (campo único "Custos Extras"), o valor continua pendente
// enquanto o lote não estiver marcado como Pago.
export const extrasPendentesLote = (r) => {
  const abate = num(r.custo_abate)
  const embalagem = num(r.custo_embalagem)
  const frete = num(r.custo_frete)
  if (!abate && !embalagem && !frete) {
    return ehPagoStatus(r.status_pagamento) ? 0 : num(r.custos_extras)
  }
  return (
    (r.abate_pago ? 0 : abate) +
    (r.embalagem_pago ? 0 : embalagem) +
    (r.frete_pago ? 0 : frete)
  )
}

export const extrasPagosLote = (r) => custosExtrasLote(r) - extrasPendentesLote(r)

// Custo total do lote = compra (fornecedor) + custos extras.
export const custoTotalLote = (r) => num(r.valor_compra) + custosExtrasLote(r)
const pesoLote = (r) => num(r.peso_vivo_estimado) || num(r.peso_entrada)

// Preço do Kg bruto = Custo Total (compra + extras) ÷ Peso Vivo do lote.
const precoKgBruto = (r) => {
  const vivo = pesoLote(r)
  return vivo ? custoTotalLote(r) / vivo : null
}

// Peso limpo do lote = Peso Vivo − Perdas (vísceras). A cabeça é vendida à parte.
const pesoLimpoLote = (r) => {
  const vivo = pesoLote(r)
  const perdas = num(r.perdas_kg)
  if (vivo && perdas) return vivo - perdas
  return null
}

// Preço do Kg real/líquido = Custo Total ÷ Peso Limpo (após retirar apenas as vísceras).
const precoKgLiquido = (r) => {
  const limpo = pesoLimpoLote(r)
  return limpo ? custoTotalLote(r) / limpo : null
}

const ehPagoStatus = (status) => {
  const s = String(status || '').toLowerCase()
  return s.includes('pago') || s.includes('quitad')
}

// Etiqueta visual do Status de Pagamento (só aparência; o valor gravado não muda):
// Pago = verde, vencido/atrasado = vermelho, Pendente (ainda no prazo) = cor normal.
export const etiquetaStatusPagamento = (status, atrasado = false) => {
  const texto = String(status || '').trim()
  if (ehPagoStatus(texto)) return { texto: 'Pago', classe: 'tag tag-entrada' }
  if (atrasado || /atrasad|vencid/i.test(texto)) {
    return { texto: 'Atrasado', classe: 'tag tag-saida' }
  }
  return { texto: texto || 'Pendente', classe: 'tag' }
}

// Preço médio ponderado pelo peso (mais correto que a média simples).
const precoKgBrutoMedio = (rows) => {
  const custo = rows.reduce((a, r) => a + custoTotalLote(r), 0)
  const peso = rows.reduce((a, r) => a + pesoLote(r), 0)
  return peso ? custo / peso : null
}

const precoKgLiquidoMedio = (rows) => {
  const custo = rows.reduce((a, r) => a + custoTotalLote(r), 0)
  const peso = rows.reduce((a, r) => a + (pesoLimpoLote(r) || 0), 0)
  return peso ? custo / peso : null
}

// Fechamento exibido acima da tabela (respeita busca e filtros ativos).
const resumoLotes = (rows) => {
  const animais = rows.reduce((a, r) => a + num(r.quantidade), 0)
  const compra = rows.reduce((a, r) => a + num(r.valor_compra), 0)
  const extras = rows.reduce((a, r) => a + custosExtrasLote(r), 0)
  const custo = compra + extras
  const vivo = rows.reduce((a, r) => a + pesoLote(r), 0)
  const limpo = rows.reduce((a, r) => a + (pesoLimpoLote(r) || 0), 0)
  const fornecedorAPagar = rows
    .filter((r) => !ehPagoStatus(r.status_pagamento))
    .reduce((a, r) => a + num(r.valor_compra), 0)
  const fornecedorPago = compra - fornecedorAPagar
  const extrasAPagar = rows.reduce((a, r) => a + extrasPendentesLote(r), 0)
  const extrasPagos = extras - extrasAPagar
  return [
    { label: 'Animais', value: animais, tipo: 'num' },
    { label: 'Compra (fornecedor)', value: compra, tipo: 'brl' },
    { label: 'Custos Extras', value: extras, tipo: 'brl' },
    { label: 'Custo Total', value: custo, tipo: 'brl' },
    { label: 'Fornecedor a Pagar', value: fornecedorAPagar, tipo: 'brl' },
    { label: 'Fornecedor Pago', value: fornecedorPago, tipo: 'brl' },
    { label: 'Extras a Pagar', value: extrasAPagar, tipo: 'brl' },
    { label: 'Extras Pagos', value: extrasPagos, tipo: 'brl' },
    { label: 'Peso Vivo', value: vivo, tipo: 'kg' },
    { label: 'Peso Limpo', value: limpo, tipo: 'kg' },
  ]
}

// Venda da cabeça (unidade) e do sarapatel (kg), que antes não entravam na receita.
export const valorCabecas = (r) => {
  const total = num(r.qtd_cabecas) * num(r.preco_cabeca)
  return total > 0 ? total : null
}

export const valorSarapatel = (r) => {
  const total = num(r.kg_sarapatel) * num(r.preco_kg_sarapatel)
  return total > 0 ? total : null
}

// Valor Total da venda = carne (kg × preço) + cabeças (un × preço) + sarapatel (kg × preço).
export const calcularTotalVenda = (valores) => {
  const partes = [
    num(valores.quantidade) * num(valores.preco_kg),
    num(valores.qtd_cabecas) * num(valores.preco_cabeca),
    num(valores.kg_sarapatel) * num(valores.preco_kg_sarapatel),
  ]
  const total = partes.reduce((a, n) => a + n, 0)
  return total > 0 ? Math.round(total * 100) / 100 : null
}

// Valor só da carne (Total − cabeças − sarapatel), usado no preço médio do Kg.
const valorCarne = (r) =>
  Math.max(0, num(r.valor_total) - (valorCabecas(r) || 0) - (valorSarapatel(r) || 0))

// Preço médio do Kg de carne vendido (cabeça e sarapatel ficam fora da conta).
const precoKgVendaMedio = (rows) => {
  const total = rows.reduce((a, r) => a + valorCarne(r), 0)
  const qtd = rows.reduce((a, r) => a + num(r.quantidade), 0)
  return qtd ? total / qtd : null
}

// Fechamento das vendas (bate com o Financeiro: Total − Recebido = A Receber).
const resumoVendas = (rows) => {
  const qtd = rows.reduce((a, r) => a + num(r.quantidade), 0)
  const cabecas = rows.reduce((a, r) => a + num(r.qtd_cabecas), 0)
  const sarapatel = rows.reduce((a, r) => a + num(r.kg_sarapatel), 0)
  const total = rows.reduce((a, r) => a + num(r.valor_total), 0)
  const recebido = rows
    .filter((r) => r.data_pagamento || ehPagoStatus(r.status_pagamento))
    .reduce((a, r) => a + num(r.valor_total), 0)
  const aReceber = total - recebido
  const atrasadas = rows.filter(vendaEmAtraso).length
  const totalCarne = rows.reduce((a, r) => a + valorCarne(r), 0)
  return [
    { label: 'Qtd Vendida', value: qtd, tipo: 'kg' },
    { label: 'Cabeças Vendidas', value: cabecas, tipo: 'num' },
    { label: 'Sarapatel (Kg)', value: sarapatel, tipo: 'kg' },
    { label: 'Total Vendido', value: total, tipo: 'brl' },
    { label: 'Recebido', value: recebido, tipo: 'brl' },
    { label: 'A Receber', value: aReceber, tipo: 'brl' },
    { label: 'Preço Médio Kg (carne)', value: qtd ? totalCarne / qtd : 0, tipo: 'brl' },
    { label: 'Vendas em Atraso', value: atrasadas, tipo: 'num' },
  ]
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

// Vencimento da venda = data da venda + prazo em dias (se informado).
export const vencimentoVenda = (r) => {
  const base = parseDateBR(r.data)
  const temPrazo = r.dias_prazo !== null && r.dias_prazo !== undefined && r.dias_prazo !== ''
  if (base && temPrazo) return formatDateBR(addDays(base, num(r.dias_prazo)))
  return r.data_vencimento || null
}

// Alerta: venda não paga (sem data de pagamento e status != Pago) e vencimento ultrapassado.
export const vendaEmAtraso = (r) => {
  if (r.data_pagamento) return false
  const status = String(r.status_pagamento || '').toLowerCase()
  if (status.includes('pago') || status.includes('quitad')) return false
  const dias = diasAte(vencimentoVenda(r))
  return dias !== null && dias < 0
}

// Lote não pago com a data limite de pagamento ao fornecedor ultrapassada.
export const loteEmAtraso = (l) => {
  if (ehPagoStatus(l.status_pagamento)) return false
  const dias = diasAte(l.data_limite_pagamento)
  return dias !== null && dias < 0
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
    sort: { name: 'nome', dir: 'asc' },
    columns: [
      { name: 'data_cadastro', label: 'Data do Cadastro', type: 'date', help: 'Digite a data em que o cadastro foi feito.' },
      { name: 'nome', label: 'Nome', help: 'Nome do cliente.' },
      { name: 'telefone', label: 'Telefone / WhatsApp', help: 'Telefone ou WhatsApp para contato.' },
      { name: 'localidade', label: 'Localidade / Endereço', help: 'Cidade / endereço do cliente.' },
      { name: 'observacoes', label: 'Observações', help: 'Anotações livres.' },
    ],
  },
  {
    key: 'fornecedores',
    label: 'Fornecedores',
    icon: '🚚',
    table: 'cadastros',
    fixed: { tipo: 'Fornecedor' },
    sort: { name: 'nome', dir: 'asc' },
    columns: [
      { name: 'data_cadastro', label: 'Data do Cadastro', type: 'date', help: 'Digite a data em que o cadastro foi feito.' },
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
    sort: { name: 'data_compra', dir: 'desc' },
    filters: [{ name: 'proposito', label: 'Propósito' }],
    totals: true,
    summary: resumoLotes,
    columns: [
      { name: 'data_compra', label: 'Data da Compra', type: 'date', help: 'Dia em que você comprou o lote.' },
      { name: 'quantidade', label: 'Quantidade', type: 'number', total: 'sum', help: 'Número de cabeças (animais) do lote.' },
      { name: 'proposito', label: 'Propósito', options: OPCOES_PROPOSITO, help: 'Para que serve o lote: Abate/engorda ou Reprodução (matrizes/reprodutores).' },
      {
        name: 'fornecedor',
        label: 'Fornecedor',
        type: 'select',
        optionsFrom: { table: 'cadastros', valueColumn: 'nome', filter: { tipo: 'Fornecedor' } },
        help: 'Escolha um fornecedor já cadastrado (menu Fornecedores).',
      },
      { name: 'valor_compra', label: 'Valor de Compra (R$)', type: 'number', total: 'sum', help: 'Quanto você paga ao fornecedor pelos suínos. Não inclui abate, embalagem nem frete.' },
      { name: 'peso_vivo_estimado', label: 'Peso Vivo Estimado (Kg)', type: 'number', kg: true, total: 'sum', help: 'Peso total estimado dos animais na compra (usado no preço por Kg).' },
      { name: 'custo_abate', label: 'Abate / Machante (R$)', type: 'number', total: 'sum', help: 'Pago ao machante (quem abateu o porco). Despesa à parte, não é dívida com o fornecedor.' },
      { name: 'abate_pago', label: 'Abate já foi pago?', type: 'boolean', somenteFormulario: true, help: 'Marque quando o abate/machante já estiver pago. Se ficar desmarcado, entra no Financeiro como conta a pagar.' },
      { name: 'custo_embalagem', label: 'Embalagem (R$)', type: 'number', total: 'sum', help: 'Compra de embalagem para colocar as carnes. Despesa à parte, não é dívida com o fornecedor.' },
      { name: 'embalagem_pago', label: 'Embalagem já foi paga?', type: 'boolean', somenteFormulario: true, help: 'Marque quando a embalagem já estiver paga. Se ficar desmarcada, entra no Financeiro como conta a pagar.' },
      { name: 'custo_frete', label: 'Frete (R$)', type: 'number', total: 'sum', help: 'Frete do carregamento dos suínos (quando houver). Despesa à parte, não é dívida com o fornecedor.' },
      { name: 'frete_pago', label: 'Frete já foi pago?', type: 'boolean', somenteFormulario: true, help: 'Marque quando o frete já estiver pago. Se ficar desmarcado, entra no Financeiro como conta a pagar.' },
      { name: 'custos_extras_total', label: 'Custos Extras (R$)', compute: custosExtrasLote, total: 'sum', help: 'Automático: Abate + Embalagem + Frete.' },
      { name: 'extras_pendentes', label: 'Extras a Pagar (R$)', compute: extrasPendentesLote, total: 'sum', help: 'Automático: parte dos custos extras que ainda não foi marcada como paga.' },
      { name: 'custo_total', label: 'Custo Total (R$)', compute: custoTotalLote, total: 'sum', help: 'Automático: Valor de Compra (fornecedor) + Custos Extras.' },
      { name: 'status', label: 'Status', options: OPCOES_STATUS_LOTE, help: 'Situação geral do lote.' },
      { name: 'observacoes', label: 'Observações', help: 'Anotações livres.' },
      { name: 'data_entrada', label: 'Data de Entrada', type: 'date', help: 'Quando os animais entraram na sua propriedade.' },
      { name: 'peso_entrada', label: 'Peso Entrada (Kg)', type: 'number', kg: true, total: 'sum', esconderQuando: esconderSeReproducao, help: 'Peso total do lote ao entrar (base para a projeção de engorda).' },
      { name: 'meta_abate', label: 'Meta de Abate (Kg)', type: 'number', kg: true, total: 'sum', esconderQuando: esconderSeReproducao, help: 'Peso total que você quer atingir antes de abater/vender.' },
      { name: 'gmd_necessario', label: 'GMD Necessário (g/dia)', type: 'number', total: 'avg', esconderQuando: esconderSeReproducao, help: 'Ganho Médio Diário por animal, em gramas/dia (ex.: 800 = 0,8 kg/dia).' },
      { name: 'dias_estimados', label: 'Dias p/ Abate (calc.)', compute: diasEstimados, total: 'avg', esconderQuando: esconderSeReproducao, help: 'Automático: (Meta − Peso Entrada) × 1000 ÷ (GMD × Quantidade).' },
      { name: 'data_prevista_abate', label: 'Data Prevista Abate (calc.)', compute: dataPrevistaAbate, esconderQuando: esconderSeReproducao, help: 'Automático: Data de Entrada + Dias p/ Abate.' },
      { name: 'data_venda_abate', label: 'Data de Venda/Abate', type: 'date', help: 'Data em que o lote foi vendido ou abatido.' },
      { name: 'perdas_kg', label: 'Perdas — Vísceras (Kg)', type: 'number', kg: true, total: 'sum', help: 'Peso das vísceras descartadas no abate. A cabeça NÃO entra mais aqui: ela é vendida à parte (menu Vendas de Suínos). Nos lotes antigos, ajuste este valor se a cabeça estava incluída.' },
      { name: 'peso_limpo', label: 'Peso Limpo (Kg)', compute: pesoLimpoLote, kg: true, total: 'sum', help: 'Automático: Peso Vivo − Perdas (vísceras). A cabeça é vendida separadamente e não é descontada.' },
      { name: 'preco_kg_bruto', label: 'Preço Kg Bruto (R$)', compute: precoKgBruto, total: precoKgBrutoMedio, help: 'Automático: Custo Total ÷ Peso Vivo.' },
      { name: 'preco_kg_liquido', label: 'Preço Kg Limpo (R$)', compute: precoKgLiquido, total: precoKgLiquidoMedio, help: 'Automático: Custo Total ÷ Peso Limpo (valor real do Kg).' },
      { name: 'data_limite_pagamento', label: 'Data Limite Pagamento', type: 'date', help: 'Vencimento do pagamento ao fornecedor (aparece no menu Financeiro).' },
      { name: 'forma_pagamento', label: 'Forma de Pagamento', options: OPCOES_FORMA_PAGAMENTO, help: 'Como o pagamento será feito ao fornecedor.' },
      { name: 'status_pagamento', label: 'Status de Pagamento', options: OPCOES_STATUS_PAGAMENTO, badge: (r) => etiquetaStatusPagamento(r.status_pagamento, loteEmAtraso(r)), help: 'Se não for "Pago", entra no Financeiro como conta a pagar.' },
    ],
  },
  {
    key: 'vendas_suinos',
    label: 'Vendas de Suínos',
    icon: '💰',
    table: 'vendas_suinos',
    sort: { name: 'data', dir: 'desc' },
    rowAlert: vendaEmAtraso,
    totals: true,
    summary: resumoVendas,
    columns: [
      { name: 'data', label: 'Data', type: 'date', help: 'Data da venda.' },
      {
        name: 'cliente',
        label: 'Cliente',
        type: 'select',
        optionsFrom: { table: 'cadastros', valueColumn: 'nome', filter: { tipo: 'Cliente' } },
        help: 'Escolha um cliente já cadastrado (menu Clientes).',
      },
      { name: 'quantidade', label: 'Quantidade (Kg)', type: 'number', kg: true, total: 'sum', help: 'Quilogramas de carne vendidos para este cliente (não inclui cabeça nem sarapatel).' },
      { name: 'preco_kg', label: 'Preço por Kg (R$)', type: 'number', total: precoKgVendaMedio, defaultConfigKey: 'valor_kg_suino_venda', help: 'Preço do quilograma de carne cobrado do cliente (vem preenchido com o valor padrão de Configurações; pode alterar).' },
      { name: 'qtd_cabecas', label: 'Qtd de Cabeças (un)', type: 'number', total: 'sum', help: 'Quantas cabeças de porco foram vendidas nesta venda (opcional). Antes não era contabilizado.' },
      { name: 'preco_cabeca', label: 'Preço por Cabeça (R$)', type: 'number', total: 'avg', defaultConfigKey: 'valor_cabeca_porco', defaultConfigPadrao: 25, help: 'Preço de cada cabeça (vem de Configurações; pode alterar nesta venda).' },
      { name: 'valor_cabecas', label: 'Valor Cabeças (R$)', compute: valorCabecas, total: 'sum', help: 'Automático: Qtd de Cabeças × Preço por Cabeça.' },
      { name: 'kg_sarapatel', label: 'Sarapatel (Kg)', type: 'number', kg: true, total: 'sum', help: 'Quilos de sarapatel vendidos nesta venda (opcional). Antes não era contabilizado.' },
      { name: 'preco_kg_sarapatel', label: 'Preço Kg Sarapatel (R$)', type: 'number', total: 'avg', defaultConfigKey: 'valor_kg_sarapatel', defaultConfigPadrao: 20, help: 'Preço do quilo do sarapatel (vem de Configurações; pode alterar nesta venda).' },
      { name: 'valor_sarapatel', label: 'Valor Sarapatel (R$)', compute: valorSarapatel, total: 'sum', help: 'Automático: Sarapatel (Kg) × Preço Kg Sarapatel.' },
      { name: 'valor_total', label: 'Valor Total (R$)', type: 'number', total: 'sum', autoCalcTotal: { campos: ['quantidade', 'preco_kg', 'qtd_cabecas', 'preco_cabeca', 'kg_sarapatel', 'preco_kg_sarapatel'], calcular: calcularTotalVenda }, help: 'Automático: carne (Kg × Preço) + cabeças (un × Preço) + sarapatel (Kg × Preço). Você pode ajustar o valor final se precisar.' },
      { name: 'dias_prazo', label: 'Prazo (dias)', type: 'number', total: 'avg', help: 'Quantidade de dias para pagamento, contados a partir da Data da Venda.' },
      { name: 'data_vencimento', label: 'Data de Vencimento', compute: vencimentoVenda, help: 'Automático: Data da Venda + Prazo (dias). Linha fica vermelha se vencer sem estar "Pago".' },
      { name: 'data_pagamento', label: 'Data de Pagamento', type: 'date', help: 'Digite no dia em que o cliente pagar (pode ser antes, no prazo ou após o vencimento).' },
      { name: 'forma_pagamento', label: 'Forma de Pagamento', options: OPCOES_FORMA_PAGAMENTO, help: 'Como o cliente pagará.' },
      { name: 'status_pagamento', label: 'Status de Pagamento', options: OPCOES_STATUS_PAGAMENTO, badge: (r) => etiquetaStatusPagamento(r.data_pagamento ? 'Pago' : r.status_pagamento, vendaEmAtraso(r)), help: 'Se não for "Pago", entra no Financeiro como conta a receber.' },
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
