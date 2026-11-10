-- =====================================================================
-- DESFAZER O ACESSO RESTRITO (uso apenas em emergência)
-- Rode no SQL Editor do Supabase somente se algo der errado depois de
-- aplicar o supabase/rls-consulta-admin.sql.
--
-- O que este script faz:
--   1. Desliga a exigência de login (volta ao modo aberto).
--   2. Remove as políticas e desativa o RLS das tabelas do sistema.
--   3. Remove as funções de perfil e a consulta restrita.
--
-- Os usuários criados no Authentication NÃO são apagados.
-- Depois de rodar, abra o sistema e saia/entre de novo.
-- =====================================================================

-- 1) Desliga o modo restrito primeiro (para o app voltar a abrir).
insert into public.configuracoes (chave, valor)
values ('acesso_restrito', 'false')
on conflict (chave) do update set valor = 'false';

-- 2) Remove políticas e desativa o RLS.
do $$
declare
  t text;
  tabelas text[] := array[
    'cadastros', 'lotes_animais', 'vendas_suinos', 'tilapias', 'codornas',
    'estoque', 'fluxo_caixa', 'configuracoes'
  ];
begin
  foreach t in array tabelas loop
    execute format('drop policy if exists "admin_select" on public.%I;', t);
    execute format('drop policy if exists "admin_insert" on public.%I;', t);
    execute format('drop policy if exists "admin_update" on public.%I;', t);
    execute format('drop policy if exists "admin_delete" on public.%I;', t);
    execute format('alter table public.%I disable row level security;', t);
  end loop;
end $$;

-- 3) Remove as funções criadas pelo script de acesso restrito.
drop function if exists public.contas_restritas();
drop function if exists public.acesso_restrito_ativo();
drop function if exists public.eh_consulta();
drop function if exists public.eh_admin();

select 'Acesso restrito desativado. O sistema voltou ao modo aberto.' as resultado;
