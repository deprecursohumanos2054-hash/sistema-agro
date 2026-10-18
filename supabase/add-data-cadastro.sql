-- Adiciona a "Data do Cadastro" digitável em Clientes/Fornecedores.
-- Rode no SQL Editor do Supabase (uma única vez).

alter table public.cadastros
  add column if not exists data_cadastro text;
