-- =====================================================================
-- LEMBRETES AUTOMÁTICOS PELO TELEGRAM (grátis)
-- Rode este script no SQL Editor do Supabase (projeto sistema-agro).
-- É seguro rodar mais de uma vez.
--
-- ANTES DE RODAR, no painel do Supabase:
--   1. Database -> Extensions
--   2. Ative "pg_cron" e "pg_net" (procure na lista e ligue)
--
-- Depois cadastre em Configurações (no sistema):
--   - Token do bot do Telegram (BotFather)
--   - Chat IDs do Luiz e do José, separados por vírgula
--   - Quantos dias de antecedência avisar (padrão 15)
--
-- O resumo é enviado todos os dias às 08:00 (horário de Brasília).
-- O Telegram só entrega mensagem para quem já apertou "Start" no bot.
-- =====================================================================

-- Formata valores como "R$ 1.542,00" (sem depender do idioma do banco).
create or replace function public.formatar_reais_tg(valor numeric)
returns text
language sql
immutable
as $$
  select 'R$ ' || replace(to_char(coalesce(valor, 0), 'FM999999999990D00'), '.', ',');
$$;

-- Monta o texto do lembrete: contas de clientes em atraso + as que vão
-- vencer nos próximos dias (configurável em Configurações).
create or replace function public.montar_lembrete_telegram()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with cfg as (
    select coalesce(
      (select nullif(trim(valor), '')::int
         from public.configuracoes
        where chave = 'telegram_dias_aviso'),
      15
    ) as dias
  ),
  hoje as (
    select (now() at time zone 'America/Sao_Paulo')::date as d
  ),
  abertas as (
    select
      coalesce(nullif(trim(v.cliente), ''), 'Cliente') as cliente,
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
  ),
  contas as (
    select a.*, (a.venc - h.d) as dias
    from abertas a
    cross join hoje h
    where a.venc is not null
  ),
  atraso as (
    select * from contas where dias < 0
  ),
  proximas as (
    select * from contas
    where dias >= 0 and dias <= (select dias from cfg)
  ),
  linhas_atraso as (
    select string_agg(
      '• ' || cliente || ' — ' || public.formatar_reais_tg(saldo) ||
      ' — ' || (-dias) || ' dia(s) de atraso (venc. ' ||
      to_char(venc, 'DD/MM/YYYY') || ')',
      E'\n'
    ) as texto
    from (select * from atraso order by venc limit 25) x
  ),
  linhas_proximas as (
    select string_agg(
      '• ' || cliente || ' — ' || public.formatar_reais_tg(saldo) ||
      ' — ' || case when dias = 0 then 'vence hoje' else dias || ' dia(s)' end ||
      ' (venc. ' || to_char(venc, 'DD/MM/YYYY') || ')',
      E'\n'
    ) as texto
    from (select * from proximas order by venc limit 25) x
  )
  select
    '🌱 Agro ERP — vencimentos' || E'\n' ||
    to_char((select d from hoje), 'DD/MM/YYYY') ||
    case
      when (select count(*) from atraso) > 0 then
        E'\n\n🔴 Em atraso (' || (select count(*) from atraso) || ') — ' ||
        public.formatar_reais_tg((select sum(saldo) from atraso)) || E'\n' ||
        (select texto from linhas_atraso) ||
        case
          when (select count(*) from atraso) > 25
            then E'\n… e mais ' || ((select count(*) from atraso) - 25) || ' conta(s)'
          else ''
        end
      else ''
    end ||
    case
      when (select count(*) from proximas) > 0 then
        E'\n\n🟡 A vencer até ' ||
        to_char((select d from hoje) + (select dias from cfg), 'DD/MM/YYYY') ||
        ' (' || (select count(*) from proximas) || ') — ' ||
        public.formatar_reais_tg((select sum(saldo) from proximas)) || E'\n' ||
        (select texto from linhas_proximas) ||
        case
          when (select count(*) from proximas) > 25
            then E'\n… e mais ' || ((select count(*) from proximas) - 25) || ' conta(s)'
          else ''
        end
      else ''
    end ||
    case
      when (select count(*) from atraso) = 0 and (select count(*) from proximas) = 0
        then E'\nNenhuma conta de cliente vencendo no período. 👍'
      else ''
    end ||
    E'\n\nTotal em aberto: ' || public.formatar_reais_tg((select sum(saldo) from contas));
$$;

-- Envia o resumo para todos os chat IDs cadastrados (via pg_net).
-- Retorna um texto explicando o que aconteceu (usado pelo botão de teste).
create or replace function public.enviar_lembrete_telegram()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  token text;
  chats text;
  chat text;
  texto text;
  enviados int := 0;
begin
  select nullif(trim(valor), '') into token
    from public.configuracoes where chave = 'telegram_bot_token';

  select nullif(trim(valor), '') into chats
    from public.configuracoes where chave = 'telegram_chat_ids';

  if token is null then
    return 'Token do bot não cadastrado em Configurações.';
  end if;

  if chats is null then
    return 'Chat ID não cadastrado em Configurações.';
  end if;

  texto := public.montar_lembrete_telegram();

  foreach chat in array string_to_array(chats, ',') loop
    chat := trim(chat);
    if chat <> '' then
      perform net.http_post(
        url := 'https://api.telegram.org/bot' || token || '/sendMessage',
        body := jsonb_build_object(
          'chat_id', chat,
          'text', texto,
          'disable_web_page_preview', true
        ),
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 10000
      );
      enviados := enviados + 1;
    end if;
  end loop;

  if enviados = 0 then
    return 'Nenhum Chat ID válido em Configurações.';
  end if;

  return 'Pedido de envio feito para ' || enviados || ' contato(s). Confira o Telegram em alguns segundos.';
end;
$$;

-- Somente o administrador pode disparar o teste pelo app.
-- (O agendador do Postgres chama a função acima direto, sem essa trava.)
create or replace function public.testar_telegram()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.eh_admin() then
    raise exception 'Apenas o administrador pode enviar o teste.';
  end if;
  return public.enviar_lembrete_telegram();
end;
$$;

revoke all on function public.formatar_reais_tg(numeric) from public, anon;
revoke all on function public.montar_lembrete_telegram() from public, anon;
revoke all on function public.enviar_lembrete_telegram() from public, anon, authenticated;
grant execute on function public.formatar_reais_tg(numeric) to authenticated;
revoke all on function public.testar_telegram() from public, anon;
grant execute on function public.testar_telegram() to authenticated;

-- Agenda diário às 08:00 de Brasília (11:00 UTC).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'lembrete-telegram-diario') then
    perform cron.unschedule('lembrete-telegram-diario');
  end if;
end $$;

select cron.schedule(
  'lembrete-telegram-diario',
  '0 11 * * *',
  $$select public.enviar_lembrete_telegram();$$
);

-- Conferência: mostra o agendamento criado.
select jobid, jobname, schedule, active
from cron.job
where jobname = 'lembrete-telegram-diario';
