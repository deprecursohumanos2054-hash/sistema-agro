# HANDOFF — Agro ERP

Atualizado em **04/11/2026** para continuar o trabalho em uma nova sessão
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
- **Dashboard**
  - A Pagar = compra pendente + extras pendentes.
  - Pago = compra paga + extras pagos (valor antigo é tratado conforme o status do lote).
  - Corrigido o erro `lotesPendentes is not defined` que travava o carregamento
    em “...” e impedia os cartões e alertas de aparecerem.
- **Lotes antes da migration**
  - Salvar/editar um lote **sem** custo extra preenchido continua funcionando
    mesmo sem as colunas novas no banco (elas são descartadas do envio).
  - Só bloqueia quando há valor novo a perder (abate, embalagem ou frete
    preenchidos), mostrando qual script rodar.
- **Vendas de Suínos**
  - Cabeça do porco (un) e sarapatel (kg) somam ao valor total (commit `451e09b`).
  - Preço médio do kg considera só a carne.
- **Status de pagamento**
  - Pago = verde; vencido/atrasado = vermelho (“Atrasado”); pendente no prazo = normal.
  - A cor é só visual: o dado gravado não muda (commit `cb89487`).
- **Tabelas**
  - Cabeçalho congelado, coluna Data + 2ª coluna (Cliente/Nome) fixas,
    Ações fixas à direita e rodapé congelado (commits `29b23f5`, `2a3b26d`, `220b395`).

## ⚠️ Pendente importante: rodar a migration

A separação dos custos extras está publicada no app (commit `1e073e1`), mas o
banco **ainda não tem as colunas novas** (`custo_abate`, `custo_embalagem`,
`custo_frete`, `abate_pago`, `embalagem_pago`, `frete_pago`).

Enquanto o script não for rodado, ao salvar um lote **com** custo extra
preenchido o app avisa que falta a migration. Salvar sem custos extras funciona
normal. Passo a passo:

1. Supabase do projeto `sistema-agro` → **SQL Editor** → **New query**.
2. Colar o conteúdo de `supabase/add-custos-extras.sql`.
3. **Run** e depois **Ctrl + F5** no Agro.
4. Conferir com `npm run db:check` (deve ficar sem nenhum “x”).

O script migra o valor antigo de `custos_extras` para `custo_abate` e marca como
pago quando o lote já estava Pago; se o lote estava Pendente, o extra continua
pendente. O lote do Pedro de 31/10 (R$ 1.200,00 + R$ 175,00) fica com o extra de
R$ 175,00 pendente — se já foi pago ao machante, basta marcar “Abate já foi pago?”.
Se parte desse valor for embalagem/frete, reclassificar nos campos certos.

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
| `src/components/Dashboard.jsx` | Totais de compra, extras, a pagar e pago |
| `src/App.jsx` | Filtra colunas `somenteFormulario` e monta a tela |
| `src/components/DataTable.jsx` | Tabela com etiquetas (`badge`), totais e colunas fixas |
| `scripts/check.mjs` | `npm run db:check`: testa tabelas e aponta migrations pendentes |
| `supabase/schema.sql` | Schema completo |
| `supabase/add-custos-extras.sql` | Migration dos custos extras (pendente de rodar) |
| `supabase/add-cabeca-sarapatel.sql` | Migration já aplicada de cabeça/sarapatel |

## Cuidados

- Não criar outro projeto Supabase: Agro usa o schema `public`; Rota Certa usa `transporte`.
- Não há `service_role`; DDL é feito pelo usuário no SQL Editor.
- Ao editar arquivos com acentos, usar as ferramentas do editor
  (`Set-Content` do PowerShell já corrompeu acentos).
- O OpenCode Desktop já está com este projeto renomeado para **Agro ERP**;
  o Rota Certa está em `C:\Users\jorge\Projetos\transporte-app`.
