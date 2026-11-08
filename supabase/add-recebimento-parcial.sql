-- =====================================================================
-- Recebimento parcial das Vendas de Suínos (adiantamento / baixa)
-- Rode este script no SQL Editor do Supabase (projeto sistema-agro).
-- É seguro rodar mais de uma vez (usa IF NOT EXISTS).
--
-- Antes, a venda era só "Pago" ou "Pendente" (tudo ou nada).
-- Agora o campo "valor_recebido" guarda o total já pago pelo cliente.
-- O saldo devedor é calculado como: valor_total - valor_recebido.
-- =====================================================================

alter table public.vendas_suinos
  add column if not exists valor_recebido numeric default 0;

-- Vendas antigas já marcadas como pagas passam a ter o valor total recebido,
-- para o Financeiro e o Dashboard continuarem batendo (nada muda para elas).
update public.vendas_suinos
set valor_recebido = coalesce(valor_total, 0)
where coalesce(valor_recebido, 0) = 0
  and coalesce(valor_total, 0) > 0
  and (
    (data_pagamento is not null and data_pagamento <> '')
    or status_pagamento ilike 'pago'
    or status_pagamento ilike 'quitad'
  );
