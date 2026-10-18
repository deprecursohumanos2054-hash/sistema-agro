-- =====================================================================
-- ERP Agronegócio - Schema Supabase (Postgres)
-- Rode este script no SQL Editor do seu projeto Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cadastros (Clientes / Fornecedores)
-- ---------------------------------------------------------------------
create table if not exists public.cadastros (
  id uuid primary key default gen_random_uuid(),
  tipo text,
  nome text,
  telefone text,
  localidade text,
  data_cadastro text,
  data_compra text,
  kg_comprado numeric,
  valor_compra numeric,
  peso_limpo numeric,
  preco_kg_consumidor numeric,
  observacoes text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Lotes de Suínos / Animais
-- ---------------------------------------------------------------------
create table if not exists public.lotes_animais (
  id uuid primary key default gen_random_uuid(),
  data_compra text,
  quantidade numeric,
  proposito text,
  fornecedor text,
  valor_compra numeric,
  peso_vivo_estimado numeric,
  custos_extras numeric,
  custo_total numeric,
  possiveis_clientes text,
  comprador_final text,
  valor_venda numeric,
  preco_venda_kg numeric,
  lucro numeric,
  status text,
  observacoes text,
  data_entrada text,
  peso_entrada numeric,
  meta_abate numeric,
  dias_estimados numeric,
  gmd_necessario numeric,
  data_venda_abate text,
  perdas_kg numeric,
  preco_kg_consumidor numeric,
  data_limite_pagamento text,
  forma_pagamento text,
  status_pagamento text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Vendas de Suínos (por Kg, para clientes)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Criação de Tilápias
-- ---------------------------------------------------------------------
create table if not exists public.tilapias (
  id uuid primary key default gen_random_uuid(),
  data text,
  tanque text,
  qtd_alevinos numeric,
  custo_racao numeric,
  previsao_despesca text,
  qtd_abatida_kg numeric,
  cliente text,
  valor_venda numeric,
  status text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Plantel e Ovos (Codornas)
-- ---------------------------------------------------------------------
create table if not exists public.codornas (
  id uuid primary key default gen_random_uuid(),
  data_coleta text,
  lote_gaiola text,
  qtd_aves_ativas numeric,
  ovos_produzidos numeric,
  bandejas_montadas numeric,
  custo_racao numeric,
  destino_venda text,
  valor_venda numeric,
  status text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Estoque Geral
-- ---------------------------------------------------------------------
create table if not exists public.estoque (
  id uuid primary key default gen_random_uuid(),
  item text,
  categoria text,
  unidade_medida text,
  estoque_minimo numeric,
  total_entradas numeric,
  total_saidas numeric,
  saldo_atual numeric,
  status text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Fluxo de Caixa
-- ---------------------------------------------------------------------
create table if not exists public.fluxo_caixa (
  id uuid primary key default gen_random_uuid(),
  data text,
  descricao text,
  setor text,
  categoria text, -- 'Entrada' ou 'Saída'
  valor numeric,
  forma_pagamento text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Configurações gerais (chave/valor) - ex.: valor do Kg do suíno
-- ---------------------------------------------------------------------
create table if not exists public.configuracoes (
  chave text primary key,
  valor text
);

insert into public.configuracoes (chave, valor)
values ('valor_kg_suino', '25')
on conflict (chave) do nothing;

-- =====================================================================
-- ATENÇÃO (acesso sem login)
-- Por padrão o Supabase NÃO habilita RLS nessas tabelas, então a chave
-- anon (pública) consegue ler/gravar. Isso atende o uso pessoal, mas
-- QUALQUER pessoa com a URL + anon key teria acesso.
-- Se um dia quiser proteger, habilite RLS + políticas e adicione login.
-- =====================================================================
