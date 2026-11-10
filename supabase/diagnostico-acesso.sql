-- =====================================================================
-- DIAGNÓSTICO DO ACESSO (não altera nada — só mostra a situação)
-- Rode no SQL Editor do Supabase e me envie o resultado.
-- =====================================================================

-- 1) As duas contas existem? Estão confirmadas? Já têm papel?
select
  email,
  coalesce(raw_app_meta_data ->> 'role', '(sem papel)') as papel,
  email_confirmed_at is not null as confirmado,
  created_at
from auth.users
where lower(email) in (
  'jorgeluizhouse@hotmail.com',
  'jose123j1era@gmail.com'
)
order by email;

-- 2) O modo restrito está ligado?
select
  coalesce(
    (select valor from public.configuracoes where chave = 'acesso_restrito'),
    '(não existe)'
  ) as acesso_restrito;

-- 3) As funções do script existem?
select
  p.proname as funcao
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('eh_admin', 'eh_consulta', 'acesso_restrito_ativo', 'contas_restritas')
order by p.proname;

-- 4) O RLS está ativo nas tabelas do sistema?
select
  tablename as tabela,
  rowsecurity as rls_ativo
from pg_tables
where schemaname = 'public'
  and tablename in (
    'cadastros', 'lotes_animais', 'vendas_suinos', 'tilapias', 'codornas',
    'estoque', 'fluxo_caixa', 'configuracoes'
  )
order by tablename;
