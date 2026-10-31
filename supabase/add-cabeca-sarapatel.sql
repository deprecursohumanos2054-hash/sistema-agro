-- =====================================================================
-- Venda da Cabeça do Porco (unidade) e do Sarapatel (Kg)
-- Rode este script no SQL Editor do Supabase (projeto sistema-agro).
-- É seguro rodar mais de uma vez (usa IF NOT EXISTS / ON CONFLICT).
-- =====================================================================

alter table public.vendas_suinos
  add column if not exists qtd_cabecas numeric,
  add column if not exists preco_cabeca numeric,
  add column if not exists kg_sarapatel numeric,
  add column if not exists preco_kg_sarapatel numeric;

-- Preços padrão (podem ser alterados no menu Configurações):
--   cabeça  = R$ 25,00 por unidade
--   sarapatel = R$ 20,00 por Kg
insert into public.configuracoes (chave, valor)
values
  ('valor_cabeca_porco', '25'),
  ('valor_kg_sarapatel', '20')
on conflict (chave) do nothing;
