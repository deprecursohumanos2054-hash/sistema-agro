-- =====================================================================
-- Pagamento da COMPRA dos Lotes Suínos (fornecedor)
-- Rode este script no SQL Editor do Supabase (projeto sistema-agro).
-- É seguro rodar mais de uma vez (usa IF NOT EXISTS).
--
-- O "Valor de Compra" é o que se paga AO FORNECEDOR. Agora dá para
-- controlar quanto já foi pago, inclusive em pagamentos parciais:
--
--   valor_pago_compra     = quanto já foi pago ao fornecedor (pode ser parcial)
--   data_pagamento_compra = dia do último pagamento ao fornecedor
--
-- O que faltar (Valor de Compra − Valor Pago) continua aparecendo no
-- Financeiro como conta a pagar. Quando o valor pago cobre a compra
-- inteira, a conta é considerada quitada.
--
-- Lotes antigos não precisam de ajuste: quando "Valor Já Pago" estiver
-- em branco, o sistema continua usando o Status de Pagamento
-- ("Pago" = compra quitada).
-- =====================================================================

alter table public.lotes_animais
  add column if not exists valor_pago_compra numeric,
  add column if not exists data_pagamento_compra text;

-- Confere o resultado (opcional):
-- select id, fornecedor, valor_compra, valor_pago_compra, data_pagamento_compra, status_pagamento
-- from public.lotes_animais
-- order by data_compra desc
-- limit 20;
