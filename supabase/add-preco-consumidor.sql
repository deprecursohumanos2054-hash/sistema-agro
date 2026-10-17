-- Adiciona o Preço do Kg ao Consumidor Final (digitado manualmente) em Fornecedores.
-- Rode no SQL Editor do Supabase (uma única vez).

alter table public.cadastros
  add column if not exists preco_kg_consumidor numeric;
