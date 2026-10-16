-- Adiciona Quantidade Comprada (Kg) e Valor Comprado (R$) em Clientes.
-- Rode no SQL Editor do Supabase (uma única vez).

alter table public.cadastros
  add column if not exists kg_comprado numeric,
  add column if not exists valor_compra numeric;
