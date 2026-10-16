-- Valor do Kg do suíno configurável + colunas de compra em Clientes.
-- Rode no SQL Editor do Supabase (uma única vez).

alter table public.cadastros
  add column if not exists kg_comprado numeric,
  add column if not exists valor_compra numeric;

create table if not exists public.configuracoes (
  chave text primary key,
  valor text
);

insert into public.configuracoes (chave, valor)
values ('valor_kg_suino', '25')
on conflict (chave) do nothing;
