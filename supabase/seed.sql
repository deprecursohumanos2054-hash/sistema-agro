-- Gerado automaticamente por scripts/import-sheet.mjs
-- Rode no SQL Editor do Supabase depois de criar as tabelas (schema.sql).

-- lotes_animais (4 linha(s))
insert into public.lotes_animais (data_compra, quantidade, proposito, fornecedor, valor_compra, peso_vivo_estimado, custos_extras, custo_total, possiveis_clientes, comprador_final, valor_venda, preco_venda_kg, lucro, status, observacoes, data_entrada, peso_entrada, meta_abate, dias_estimados, gmd_necessario, data_venda_abate, data_limite_pagamento, forma_pagamento, status_pagamento) values
  ('09/10/2026', 1, 'Abate', NULL, 500, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Pendente/Em separação', 'Abate agendado conforme pedidos', NULL, NULL, NULL, NULL, NULL, '10/10/2026', '46313', NULL, NULL),
  ('09/10/2026', 2, 'Abate', NULL, 1000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Pendente', 'R$ 500,00 cada', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('09/10/2026', 1, 'Reprodução (Macho)', NULL, 400, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Plantel', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('09/10/2026', 1, 'Reprodução (Fêmea)', NULL, 400, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Plantel', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- fluxo_caixa (1 linha(s))
insert into public.fluxo_caixa (data, descricao, setor, categoria, valor, forma_pagamento) values
  ('09/10/2026', 'Compra de 5 suínos (3 abate, 2 reprodução)', NULL, 'Saída', 2300, 'PIX');
