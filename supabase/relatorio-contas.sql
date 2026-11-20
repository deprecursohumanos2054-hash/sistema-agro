-- =====================================================================
-- RELATÓRIOS DE CONTAS (somente leitura) — Vencidos, A vencer e Pagos
-- Rode este script no SQL Editor do Supabase (projeto sistema-agro).
-- É seguro rodar mais de uma vez (usa CREATE OR REPLACE).
--
-- Cria a função public.relatorio_contas(), usada pela tela de Consulta
-- (usuário NÃO administrador). Ela devolve, numa lista só:
--   - Contas a RECEBER (vendas de suínos)
--   - Contas a PAGAR (compra dos lotes ao fornecedor)
--   - Custos extras pagos/pendentes (abate, embalagem e frete)
--
-- Quem pode ver: usuários com papel "consulta" ou "admin"
-- (app_metadata.role). Os dados são somente leitura: não existe função
-- de alteração. O RLS continua bloqueando o acesso direto às tabelas.
--
-- Situações devolvidas: vencido, vence-hoje, a-vencer, sem-data e pago.
-- "data_pagamento" é o último recebimento/pagamento (inclusive parcial).
-- =====================================================================

create or replace function public.relatorio_contas()
returns table (
  tipo text,
  origem text,
  descricao text,
  detalhe text,
  valor numeric,
  valor_pago numeric,
  saldo numeric,
  vencimento date,
  data_pagamento date,
  situacao text,
  dias_atraso integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with lotes_base as (
    select
      l.fornecedor,
      l.quantidade,
      l.proposito,
      coalesce(l.valor_compra, 0) as valor_compra,
      coalesce(l.custos_extras, 0) as custos_extras,
      coalesce(l.custo_abate, 0) as custo_abate,
      coalesce(l.custo_embalagem, 0) as custo_embalagem,
      coalesce(l.custo_frete, 0) as custo_frete,
      coalesce(l.abate_pago, false) as abate_pago,
      coalesce(l.embalagem_pago, false) as embalagem_pago,
      coalesce(l.frete_pago, false) as frete_pago,
      coalesce(l.status_pagamento, '') as status_pagamento,
      (
        coalesce(l.status_pagamento, '') ilike '%pago%'
        or coalesce(l.status_pagamento, '') ilike '%quitad%'
      ) as status_pago,
      l.data_limite_pagamento,
      coalesce(
        nullif(to_jsonb(l) ->> 'valor_pago_compra', '')::numeric,
        case
          when coalesce(l.status_pagamento, '') ilike '%pago%'
            or coalesce(l.status_pagamento, '') ilike '%quitad%'
          then coalesce(l.valor_compra, 0)
          else 0
        end
      ) as valor_pago,
      -- Lido como JSON para este script poder rodar mesmo antes da migration
      -- supabase/add-pagamento-compra.sql (a coluna pode ainda não existir).
      to_jsonb(l) ->> 'data_pagamento_compra' as data_pagamento_compra
    from public.lotes_animais l
  ),

  vendas as (
    select
      'Receber'::text as tipo,
      'venda'::text as origem,
      coalesce(nullif(trim(v.cliente), ''), 'Cliente') as descricao,
      'Venda de suínos' ||
        case
          when coalesce(v.qtd_cabecas, 0) > 0
            then ' • ' || v.qtd_cabecas::text || ' cabeça(s)'
          else ''
        end as detalhe,
      coalesce(v.valor_total, 0) as valor,
      coalesce(v.valor_recebido, 0) as valor_pago,
      greatest(coalesce(v.valor_total, 0) - coalesce(v.valor_recebido, 0), 0) as saldo,
      case
        when v.data ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$'
             and v.dias_prazo is not null
          then to_date(v.data, 'DD/MM/YYYY') + v.dias_prazo::int
        when v.data_vencimento ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$'
          then to_date(v.data_vencimento, 'DD/MM/YYYY')
        when v.data ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$'
          then to_date(v.data, 'DD/MM/YYYY')
        else null
      end as venc,
      case
        when v.data_pagamento ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$'
          then to_date(v.data_pagamento, 'DD/MM/YYYY')
        else null
      end as pagto
    from public.vendas_suinos v
    where coalesce(v.valor_total, 0) > 0
  ),

  lotes as (
    select
      'Pagar'::text as tipo,
      'fornecedor'::text as origem,
      coalesce(nullif(trim(b.fornecedor), ''), 'Fornecedor') as descricao,
      'Compra de suínos • Lote ' || coalesce(b.quantidade::text, '?') || ' cab' ||
        case
          when coalesce(b.proposito, '') <> '' then ' • ' || b.proposito
          else ''
        end as detalhe,
      b.valor_compra as valor,
      b.valor_pago as valor_pago,
      greatest(b.valor_compra - b.valor_pago, 0) as saldo,
      case
        when b.data_limite_pagamento ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$'
          then to_date(b.data_limite_pagamento, 'DD/MM/YYYY')
        else null
      end as venc,
      case
        when b.data_pagamento_compra ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$'
          then to_date(b.data_pagamento_compra, 'DD/MM/YYYY')
        else null
      end as pagto
    from lotes_base b
    where b.valor_compra > 0
  ),

  extras as (
    select
      'Pagar'::text as tipo,
      'extra'::text as origem,
      'Custo extra — ' || e.nome as descricao,
      coalesce(nullif(trim(b.fornecedor), ''), 'Fornecedor') || ' • Lote ' ||
        coalesce(b.quantidade::text, '?') || ' cab' as detalhe,
      e.valor as valor,
      case when e.pago then e.valor else 0 end as valor_pago,
      case when e.pago then 0 else e.valor end as saldo,
      null::date as venc,
      null::date as pagto
    from lotes_base b
    cross join lateral (
      values
        ('Abate', b.custo_abate, b.abate_pago),
        ('Embalagem', b.custo_embalagem, b.embalagem_pago),
        ('Frete', b.custo_frete, b.frete_pago)
    ) as e(nome, valor, pago)
    where e.valor > 0
  ),

  legado as (
    select
      'Pagar'::text as tipo,
      'extra'::text as origem,
      'Custo extra — Abate (valor antigo)'::text as descricao,
      coalesce(nullif(trim(b.fornecedor), ''), 'Fornecedor') || ' • Lote ' ||
        coalesce(b.quantidade::text, '?') || ' cab (valor antigo)' as detalhe,
      b.custos_extras as valor,
      case when b.status_pago then b.custos_extras else 0 end as valor_pago,
      case when b.status_pago then 0 else b.custos_extras end as saldo,
      null::date as venc,
      null::date as pagto
    from lotes_base b
    where b.custo_abate = 0
      and b.custo_embalagem = 0
      and b.custo_frete = 0
      and b.custos_extras > 0
  ),

  uniao as (
    select * from vendas
    union all
    select * from lotes
    union all
    select * from extras
    union all
    select * from legado
  )

  select
    u.tipo,
    u.origem,
    u.descricao,
    u.detalhe,
    round(u.valor, 2) as valor,
    round(u.valor_pago, 2) as valor_pago,
    round(u.saldo, 2) as saldo,
    u.venc as vencimento,
    u.pagto as data_pagamento,
    case
      when u.saldo <= 0.004 then 'pago'
      when u.venc is null then 'sem-data'
      when u.venc < current_date then 'vencido'
      when u.venc = current_date then 'vence-hoje'
      else 'a-vencer'
    end as situacao,
    case
      when u.saldo > 0.004 and u.venc is not null
        then (current_date - u.venc)::int
      else null
    end as dias_atraso
  from uniao u
  where public.eh_consulta() or public.eh_admin()
  order by u.venc nulls last, u.descricao;
$$;

-- Somente usuários logados (papel consulta/admin) podem executar.
revoke all on function public.relatorio_contas() from public, anon;
grant execute on function public.relatorio_contas() to authenticated;

-- Conferência rápida (opcional): conta as linhas por situação.
-- select situacao, count(*) as contas, sum(saldo) as saldo
-- from public.relatorio_contas()
-- group by situacao
-- order by situacao;
