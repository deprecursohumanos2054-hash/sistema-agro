-- =====================================================================
-- PERFIS DE ACESSO — ADMINISTRADOR x CONSULTA (SOMENTE LEITURA)
-- Projeto: sistema-agro (schema public)
-- Rode este script no SQL Editor do Supabase.
-- É seguro rodar mais de uma vez.
--
-- ANTES DE RODAR:
--   1. Authentication > Users > Add user
--      - Crie o usuário do ADMINISTRADOR (marque "Auto Confirm User").
--      - Crie o usuário da CONSULTA   (marque "Auto Confirm User").
--   2. Troque os dois e-mails abaixo pelos e-mails que você criou.
--   3. Rode o script e depois saia e entre de novo no sistema.
--
-- O papel fica em app_metadata, que o próprio usuário NÃO consegue alterar.
-- =====================================================================

-- >>> TROQUE PELO E-MAIL DO ADMINISTRADOR <<<
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'ADMIN@EXEMPLO.com';

-- >>> TROQUE PELO E-MAIL DE QUEM SÓ VAI CONSULTAR <<<
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"consulta"}'::jsonb
where email = 'CONSULTA@EXEMPLO.com';

-- Avisa se os e-mails ainda não foram trocados.
do $$
begin
  if not exists (
    select 1 from auth.users
    where raw_app_meta_data ->> 'role' in ('admin', 'consulta')
  ) then
    raise notice 'ATENÇÃO: troque ADMIN@EXEMPLO.com e CONSULTA@EXEMPLO.com pelos e-mails reais e rode de novo.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Identificação do perfil
-- ---------------------------------------------------------------------
create or replace function public.eh_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.eh_consulta()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'consulta'), false);
$$;

revoke all on function public.eh_admin() from public, anon;
revoke all on function public.eh_consulta() from public, anon;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.eh_consulta() to authenticated;

-- Função pública que apenas informa se o modo restrito está ligado.
-- O app usa isso para decidir se mostra a tela de login.
create or replace function public.acesso_restrito_ativo()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select valor = 'true' from public.configuracoes where chave = 'acesso_restrito'),
    false
  );
$$;

revoke all on function public.acesso_restrito_ativo() from public;
grant execute on function public.acesso_restrito_ativo() to anon, authenticated;

-- ---------------------------------------------------------------------
-- RLS: somente o administrador lê e grava nas tabelas do sistema.
-- Quem é "consulta" (ou não tem papel) não acessa estas tabelas.
--
-- IMPORTANTE: só ativa a proteção se as DUAS contas já estiverem com papel
-- configurado. Sem isso, o sistema continua aberto (evita ficar sem acesso).
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  tem_admin boolean;
  tem_consulta boolean;
  tabelas text[] := array[
    'cadastros', 'lotes_animais', 'vendas_suinos', 'tilapias', 'codornas',
    'estoque', 'fluxo_caixa', 'configuracoes'
  ];
begin
  select exists (
    select 1 from auth.users where raw_app_meta_data ->> 'role' = 'admin'
  ) into tem_admin;

  select exists (
    select 1 from auth.users where raw_app_meta_data ->> 'role' = 'consulta'
  ) into tem_consulta;

  if not (tem_admin and tem_consulta) then
    raise notice 'ATENCAO: contas de administrador e consulta nao encontradas. O acesso restrito NAO foi ativado e o sistema continua aberto. Troque os e-mails no topo do script e rode de novo.';
    return;
  end if;

  foreach t in array tabelas loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists "admin_select" on public.%I;', t);
    execute format(
      'create policy "admin_select" on public.%I
         for select to authenticated using (public.eh_admin());',
      t
    );

    execute format('drop policy if exists "admin_insert" on public.%I;', t);
    execute format(
      'create policy "admin_insert" on public.%I
         for insert to authenticated with check (public.eh_admin());',
      t
    );

    execute format('drop policy if exists "admin_update" on public.%I;', t);
    execute format(
      'create policy "admin_update" on public.%I
         for update to authenticated
         using (public.eh_admin()) with check (public.eh_admin());',
      t
    );

    execute format('drop policy if exists "admin_delete" on public.%I;', t);
    execute format(
      'create policy "admin_delete" on public.%I
         for delete to authenticated using (public.eh_admin());',
      t
    );
  end loop;

  -- Liga o modo restrito para o app pedir login.
  insert into public.configuracoes (chave, valor)
  values ('acesso_restrito', 'true')
  on conflict (chave) do update set valor = excluded.valor;

  raise notice 'OK: acesso restrito ativado (admin grava; consulta apenas visualiza).';
end $$;

-- ---------------------------------------------------------------------
-- Consulta restrita (RPC): devolve APENAS as contas em aberto, com o
-- mínimo de dados. Roda como dono do banco, mas exige papel consulta/admin.
-- Nenhuma alteração é possível por aqui.
-- ---------------------------------------------------------------------
create or replace function public.contas_restritas()
returns table (
  cliente text,
  valor_total numeric,
  valor_recebido numeric,
  saldo_devedor numeric,
  vencimento date,
  situacao text,
  dias_atraso integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with base as (
    select
      coalesce(nullif(trim(v.cliente), ''), 'Cliente') as cliente,
      coalesce(v.valor_total, 0) as valor_total,
      coalesce(v.valor_recebido, 0) as valor_recebido,
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
      end as venc
    from public.vendas_suinos v
    where coalesce(v.valor_total, 0) - coalesce(v.valor_recebido, 0) > 0.004
  )
  select
    b.cliente,
    b.valor_total,
    b.valor_recebido,
    round(b.saldo, 2) as saldo_devedor,
    b.venc as vencimento,
    case
      when b.venc is null then 'sem-data'
      when b.venc < current_date then 'vencido'
      when b.venc = current_date then 'vence-hoje'
      else 'a-vencer'
    end as situacao,
    case when b.venc is not null then (current_date - b.venc)::int else null end as dias_atraso
  from base b
  where public.eh_consulta()
  order by b.venc nulls last, b.cliente;
$$;

revoke all on function public.contas_restritas() from public, anon;
grant execute on function public.contas_restritas() to authenticated;

-- ---------------------------------------------------------------------
-- Conferência rápida: deve mostrar os dois perfis configurados.
-- (Não mostra senhas, só e-mail e papel.)
-- ---------------------------------------------------------------------
select
  email,
  raw_app_meta_data ->> 'role' as papel,
  email_confirmed_at is not null as confirmado
from auth.users
where raw_app_meta_data ->> 'role' in ('admin', 'consulta')
order by papel;
