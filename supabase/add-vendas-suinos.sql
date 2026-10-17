-- Cria a tabela de Vendas de Suínos (venda por Kg para clientes).
-- Rode no SQL Editor do Supabase (uma única vez).

create table if not exists public.vendas_suinos (
  id uuid primary key default gen_random_uuid(),
  data text,
  cliente text,
  quantidade numeric,
  preco_kg numeric,
  valor_total numeric,
  data_vencimento text,
  forma_pagamento text,
  status_pagamento text,
  observacoes text,
  created_at timestamptz default now()
);
