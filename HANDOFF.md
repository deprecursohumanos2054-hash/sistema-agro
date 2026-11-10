# HANDOFF — Agro ERP

Atualizado em **08/11/2026** para continuar o trabalho em uma nova sessão
dentro do projeto **Agro ERP**.

## O que é

ERP do agronegócio (foco em suínos), com cadastros, vendas, lotes,
financeiro, estoque e dashboard.

- **Pasta:** `C:\Users\jorge\Open_Code\agro-web`
- **Produção:** https://sistema-agro-24yr.vercel.app
- **Repositório:** `deprecursohumanos2054-hash/sistema-agro` (branch `main`)
- **Deploy:** automático na Vercel a cada push na `main`
- **Supabase:** projeto `sistema-agro` (`tcqalundrcviyapihbxs`), schema **`public`**
  (o Rota Certa usa o mesmo projeto, mas no schema `transporte`)
- **Stack:** React + Vite + Supabase (cliente anon)

## O que já está pronto

- **Lotes Suínos**
  - Compra separada dos custos extras: `valor_compra` é só a dívida com o fornecedor.
  - Custos extras em três campos: `custo_abate` (machante), `custo_embalagem` e
    `custo_frete`, cada um com flag de pago (`abate_pago`, `embalagem_pago`,
    `frete_pago`).
  - Colunas calculadas: Custos Extras, Extras a Pagar e Custo Total.
  - Fechamento acima da tabela: Compra (fornecedor), Custos Extras, Custo Total,
    Fornecedor a Pagar/Pago e Extras a Pagar/Pagos.
  - Perdas são só vísceras; a cabeça é vendida à parte (commit `f294d4a`).
- **Financeiro**
  - Conta do fornecedor = somente `valor_compra`.
  - Custos extras pendentes entram como linhas separadas
    “Custo extra — Abate / Embalagem / Frete”, sem vencimento.
  - Lotes antigos com o campo único `custos_extras` aparecem como
    “Custo extra — Abate (valor antigo)” enquanto não forem migrados.
  - Cards separados: “A Pagar — Fornecedor (pendente)” e
    “A Pagar — Extras (pendente)”. O Resultado Previsto usa a soma dos dois.
- **Dashboard**
  - Mesma separação: “A Pagar — Fornecedor (pendente)” e
    “A Pagar — Extras (pendente)”.
  - Pago = compra paga + extras pagos (valor antigo é tratado conforme o status do lote).
  - Saldo Integrado = entradas (vendas recebidas + entradas manuais do Fluxo
    de Caixa) − saídas (compras/extras pagos + saídas manuais). A conta aparece
    embaixo do valor e o gráfico “Entradas x Saídas” usa os mesmos totais.
    Contas pendentes ficam de fora.
  - O lançamento manual de R$ 2.300,00 de 09/10 (“Compra de 5 suínos”) foi
    removido do Fluxo de Caixa: duplicava a compra dos lotes daquele dia.
    Despesas manuais novas (ração, remédio etc.) entram no saldo normalmente.
  - Corrigido o erro `lotesPendentes is not defined` que travava o carregamento
    em “...” e impedia os cartões e alertas de aparecerem.
- **Acumulado**
  - Página nova no menu (📊 Acumulado): compras, despesas e lucro **mensal e
    acumulado**.
  - Lucro do mês = receitas − compras de suínos (abate) − despesas. Receitas =
    vendas pela data da venda + entradas manuais do Fluxo de Caixa; despesas =
    custos extras dos lotes + saídas manuais.
  - Casais de reprodução ficam em coluna/card separados (“Investimento em
    Reprodução”) e **não entram no lucro**: são investimento no plantel. Só viram
    despesa quando vendidos/abatidos (ou via depreciação); venda de reprodutor
    deve ser lançada como entrada no Fluxo de Caixa.
  - Meses com lucro negativo aparecem em vermelho com o selo “Prejuízo” e são
    contados no card “Lucro Acumulado”.
  - Outubro/2026 (único mês com movimento) fechou com **prejuízo de R$ 107,10**
    (receitas R$ 3.777,65 − abate R$ 3.500,00 − despesas R$ 384,75).
- **Proteção se faltar alguma coluna no banco (lotes)**
  - Salvar/editar um lote **sem** custo extra preenchido continua funcionando
    mesmo se as colunas novas ainda não existirem (são descartadas do envio).
  - Só bloqueia quando há valor novo a perder (abate, embalagem ou frete
    preenchidos), mostrando qual script rodar.
- **Vendas de Suínos**
  - Cabeça do porco (un) e sarapatel (kg) somam ao valor total (commit `451e09b`).
  - Preço médio do kg considera só a carne.
  - **Recebimento parcial / adiantamento**: o campo `valor_recebido` guarda o
    total já pago e o botão **💰 Receber / dar baixa** (em cada linha) lança um
    adiantamento e mostra o novo saldo devedor. Ex.: venda de R$ 75,00 com
    R$ 38,00 adiantados fica com **Saldo Devedor de R$ 37,00**.
  - Colunas novas na tabela: **Valor Recebido (R$)** e **Saldo Devedor (R$)**.
  - O **Saldo Devedor** muda de cor conforme a situação: **vermelho** quando
    vencido, **âmbar** quando vence hoje, **branco em negrito** quando ainda está
    no prazo e **verde** quando já está quitado.
  - Quando o saldo zera, a célula mostra **“Quitado”** em vez de R$ 0,00.
  - Quando está vencido, além do valor vermelho aparece a etiqueta **“Vencido”**
    ao lado (classe `.tag-saida`), deixando o atraso explícito na tabela.
  - O Financeiro mostra o valor recebido e “Falta R$ …” no detalhe; a venda só
    fica “Pago” quando o saldo devedor chega a zero.
  - O Dashboard passou a somar os recebimentos parciais em “Recebido” e em
    “A Receber (pendente)”.
- **Status de pagamento**
  - Pago = verde; vencido/atrasado = vermelho (“Atrasado”); pendente no prazo = normal.
  - A cor é só visual: o dado gravado não muda (commit `cb89487`).
- **Tabelas**
  - Cabeçalho congelado, coluna Data + 2ª coluna (Cliente/Nome) fixas,
    Ações fixas à direita e rodapé congelado (commits `29b23f5`, `2a3b26d`, `220b395`).
- **Acesso pelo celular (PWA)**
  - Uma única URL para computador e celular:
    **https://sistema-agro-24yr.vercel.app** (não depende do computador ligado).
  - O sistema é **instalável** como aplicativo: `manifest.webmanifest`,
    service worker (`public/sw.js`) e ícones PNG próprios.
  - **Android/Chrome:** menu ⋮ → “Instalar aplicativo” (ou “Adicionar à tela inicial”).
  - **iPhone/Safari:** Compartilhar → “Adicionar à Tela de Início”.
  - Também é possível abrir pelo link enviado no WhatsApp para você mesmo.
  - Layout responsivo (até 820px): menu vira gaveta (☰), cards em 2 colunas,
    resumo em faixa deslizante, tabela rola para o lado com aviso na tela e
    formulários ocupam a largura toda com botões fixos embaixo.
  - O service worker guarda a tela para abrir sem internet, mas **os dados
    precisam de internet** (vêm do Supabase).
  - Os ícones são gerados por `node scripts/make-icons.mjs` (sem dependências).
- **Perfis de acesso: administrador x consulta (somente leitura)**
  - O papel de cada usuário fica em `app_metadata.role` no Supabase Auth:
    `admin` (acesso total) e `consulta` (só visualiza saldos).
  - O administrador continua usando todas as telas normalmente.
  - Quem é `consulta` vê apenas a tela **Consulta**: totais **vencidos**,
    **a vencer** (inclui vence hoje) e **sem data**, com busca por cliente.
    Não há menu, botões de edição, exclusão nem “dar baixa”.
  - A proteção é feita **no banco** (RLS), não só na tela: as tabelas do
    sistema só aceitam leitura/gravação de `admin`; o perfil `consulta` só
    consegue ler a RPC `contas_restritas()`.
  - O modo restrito é ligado pela chave `configuracoes.acesso_restrito = 'true'`.
    O script `supabase/rls-consulta-admin.sql` só ativa isso quando as **duas**
    contas (`admin` e `consulta`) já existem com papel — assim ninguém fica
    trancado fora.
  - Enquanto o script não roda, `acesso_restrito_ativo()` não existe e o app
    continua abrindo sem login (modo aberto, como antes).
  - **Ativação (feita pelo administrador no Supabase):**
    1. Authentication → Users → *Add user*: crie a conta do administrador e a
       da consulta, marcando **Auto Confirm User**.
    2. Troque os dois e-mails de exemplo no topo de
       `supabase/rls-consulta-admin.sql`.
    3. Rode o script no SQL Editor. No fim ele lista os dois perfis.
    4. Saia e entre de novo no app; o administrador cai no sistema completo e
       a consulta na tela somente leitura.
  - Recomendado: desligar o cadastro público (Authentication → Providers → Email
    → *Allow new users to sign up* desmarcado).
  - Localmente dá para forçar o comportamento com `VITE_REQUIRE_AUTH=false`
    (aberto) ou `true` (fechado) no `.env`.

## ✅ Migration do recebimento parcial aplicada

Rodada em novembro/2026 no SQL Editor do projeto `sistema-agro` (script
`supabase/add-recebimento-parcial.sql`). O `npm run db:check` está todo `ok`.

Teste real: a venda da **Quele** (R$ 75,00) recebeu **R$ 38,00** de adiantamento
em 06/11/2026. O sistema mostra **Valor Recebido R$ 38,00** e **Saldo Devedor
R$ 37,00**, com a venda ainda **Pendente** (só fica Pago quando o saldo zera).

## ✅ Migration dos custos extras aplicada

Rodada em 04/11/2026 no SQL Editor do projeto `sistema-agro` (script
`supabase/add-custos-extras.sql`). Na época o `npm run db:check` passou sem
pendências; hoje só a migration de recebimento parcial está pendente.
O valor antigo de `custos_extras` foi migrado para `custo_abate`, marcado como
pago quando o lote já estava Pago.

O lote do Pedro de 31/10 (R$ 1.200,00 de compra + R$ 175,00 de abate) teve o
abate marcado como pago em 04/11/2026. O Financeiro e o Dashboard mostram:
**A Pagar — Fornecedor R$ 1.200,00** e **A Pagar — Extras R$ 0,00**.

Se surgirem lotes antigos com o campo único `custos_extras`, o app os exibe como
“(valor antigo)” até serem reclassificados nos campos novos (Abate, Embalagem,
Frete) e terem o “já foi pago?” marcado.

## Como retomar

```powershell
cd C:\Users\jorge\Open_Code\agro-web
npm run dev       # Vite (normalmente http://localhost:5173)
npm run lint      # oxlint
npm run build     # build de produção
npm run db:check  # conexão, contagem por tabela e migrations pendentes
```

- Só existe um aviso de lint pré-existente em `src/App.jsx` (`set-state-in-effect`).
- Testar no navegador e conferir o bundle novo em produção antes de considerar concluído.
- Push na `main` publica automaticamente na Vercel.

## Arquivos-chave

| Arquivo | Para quê |
|---|---|
| `src/lib/modules.js` | Definição dos módulos, colunas, cálculos e resumos |
| `src/components/RecordModal.jsx` | Formulário (inclui campos `boolean` de “já pago?” e guarda de migration) |
| `src/components/Financeiro.jsx` | Contas a pagar/receber; separa fornecedor e extras |
| `src/components/ReceberModal.jsx` | Baixa parcial / adiantamento de uma venda (botão 💰) |
| `src/components/Acumulado.jsx` | Compras, despesas e lucro mensal/acumulado (com reprodução separada) |
| `src/components/Dashboard.jsx` | Totais de compra, extras, a pagar e pago |
| `src/App.jsx` | Filtra colunas `somenteFormulario` e monta a tela |
| `src/components/DataTable.jsx` | Tabela com etiquetas (`badge`), totais e colunas fixas |
| `scripts/check.mjs` | `npm run db:check`: testa tabelas e aponta migrations pendentes |
| `scripts/make-icons.mjs` | Gera os ícones PNG do PWA (sem dependências) |
| `public/manifest.webmanifest` | Manifesto do app instalável (nome, ícones, cores) |
| `public/sw.js` | Service worker: instalação e abertura offline |
| `src/main.jsx` | Registra o service worker em produção |
| `src/lib/auth.js` | Sessão, papéis (`admin`/`consulta`) e modo restrito dinâmico |
| `src/components/Login.jsx` | Tela de login (sem cadastro público) |
| `src/components/Consulta.jsx` | Dashboard somente leitura (vencido / a vencer / sem data) |
| `src/components/InstallButton.jsx` | Botão “📲 Instalar aplicativo” + instruções |
| `supabase/rls-consulta-admin.sql` | Papéis, RLS, RPC `contas_restritas` e ativação do modo restrito |
| `supabase/schema.sql` | Schema completo |
| `supabase/add-custos-extras.sql` | Migration dos custos extras (já aplicada) |
| `supabase/add-recebimento-parcial.sql` | Migration do recebimento parcial (já aplicada) |
| `supabase/add-cabeca-sarapatel.sql` | Migration já aplicada de cabeça/sarapatel |

## Cuidados

- Não criar outro projeto Supabase: Agro usa o schema `public`; Rota Certa usa `transporte`.
- Não há `service_role`; DDL é feito pelo usuário no SQL Editor.
- Ao editar arquivos com acentos, usar as ferramentas do editor
  (`Set-Content` do PowerShell já corrompeu acentos).
- O OpenCode Desktop já está com este projeto renomeado para **Agro ERP**;
  o Rota Certa está em `C:\Users\jorge\Projetos\transporte-app`.
