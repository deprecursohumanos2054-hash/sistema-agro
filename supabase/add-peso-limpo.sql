-- Adiciona Peso Limpo (Kg) em Fornecedores (para calcular o preço real do Kg).
-- Rode no SQL Editor do Supabase (uma única vez).

alter table public.cadastros
  add column if not exists peso_limpo numeric;
