-- Adiciona o Prazo (dias) nas Vendas de Suínos (para calcular o vencimento automático).
-- Rode no SQL Editor do Supabase (uma única vez).

alter table public.vendas_suinos
  add column if not exists dias_prazo numeric;
