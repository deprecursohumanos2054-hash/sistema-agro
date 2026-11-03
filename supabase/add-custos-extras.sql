-- =====================================================================
-- Custos Extras do Lote separados: Abate (machante), Embalagem e Frete
-- Rode este script no SQL Editor do Supabase (projeto sistema-agro).
-- É seguro rodar mais de uma vez (usa IF NOT EXISTS).
--
-- O Valor de Compra continua sendo o que se paga AO FORNECEDOR.
-- Abate, Embalagem e Frete são despesas à parte, cada uma com seu
-- indicador de "já pago". O que estiver pendente aparece no Financeiro
-- como conta a pagar separada da conta do fornecedor.
-- =====================================================================

alter table public.lotes_animais
  add column if not exists custo_abate numeric,
  add column if not exists custo_embalagem numeric,
  add column if not exists custo_frete numeric,
  add column if not exists abate_pago boolean default false,
  add column if not exists embalagem_pago boolean default false,
  add column if not exists frete_pago boolean default false;

-- Migra o valor antigo (campo único "Custos Extras") para Abate (machante).
-- Mantém pendente quando o lote ainda não foi pago ao fornecedor; se o lote
-- já estava Pago, considera o custo extra também pago. Assim nenhum valor
-- some do Financeiro. Se a embalagem/frete estiverem embutidos nesse valor,
-- reclassifique no menu Lotes Suínos.
update public.lotes_animais
set
  custo_abate = custos_extras,
  abate_pago = coalesce(status_pagamento ilike 'pago', false)
where custos_extras is not null
  and custos_extras <> 0
  and coalesce(custo_abate, 0) = 0
  and coalesce(custo_embalagem, 0) = 0
  and coalesce(custo_frete, 0) = 0;
