-- Adiciona a Data de Pagamento (digitada quando o cliente pagar) nas Vendas de Suínos.
-- Rode no SQL Editor do Supabase (uma única vez).

alter table public.vendas_suinos
  add column if not exists data_pagamento text;
