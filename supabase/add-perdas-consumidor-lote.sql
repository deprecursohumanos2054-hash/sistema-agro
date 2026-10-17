-- Adiciona Perdas (vísceras + cabeça) e Preço do Kg ao Consumidor Final em Lotes Suínos.
-- O preço do Kg bruto e do Kg limpo são calculados no sistema (não precisam de coluna).
-- Rode no SQL Editor do Supabase (uma única vez).

alter table public.lotes_animais
  add column if not exists perdas_kg numeric,
  add column if not exists preco_kg_consumidor numeric;
