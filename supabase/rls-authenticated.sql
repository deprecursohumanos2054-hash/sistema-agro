-- =====================================================================
-- PROTEÇÃO COM LOGIN (opcional)
-- ---------------------------------------------------------------------
-- Rode este script SOMENTE se quiser exigir login no sistema.
-- Ele liga o RLS em todas as tabelas e permite acesso total apenas a
-- usuários AUTENTICADOS. Depois, no Vercel, defina a variável
--   VITE_REQUIRE_AUTH = true
-- e faça o "Redeploy". Enquanto não fizer isso, o sistema segue sem login.
--
-- IMPORTANTE: crie o usuário em Authentication > Users (no painel do
-- Supabase) ou pela tela "Criar conta" do próprio sistema.
-- =====================================================================

do $$
declare
  t text;
  tabelas text[] := array[
    'cadastros', 'lotes_animais', 'tilapias', 'codornas', 'estoque', 'fluxo_caixa'
  ];
begin
  foreach t in array tabelas loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "authenticated_all" on public.%I;', t);
    execute format(
      'create policy "authenticated_all" on public.%I
         for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- Para voltar a funcionar SEM login (uso pessoal aberto), rode:
--   alter table public.<tabela> disable row level security;
