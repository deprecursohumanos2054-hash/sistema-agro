import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num } from '../lib/format'
import { signOut } from '../lib/auth'
import InstallButton from './InstallButton'

function dataBR(iso) {
  if (!iso) return '-'
  const partes = String(iso).slice(0, 10).split('-')
  if (partes.length !== 3) return String(iso)
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

// Texto da coluna "Situação" de cada conta.
function textoSituacao(item) {
  if (item.situacao === 'pago') return 'Pago'
  if (item.situacao === 'sem-data') return 'Sem data de vencimento'
  if (item.situacao === 'vence-hoje') return 'Vence hoje'
  const dias = Math.abs(Number(item.dias_atraso) || 0)
  if (item.situacao === 'vencido') return `${dias} dia(s) de atraso`
  return `Vence em ${dias} dia(s)`
}

function classeSituacao(item) {
  if (item.situacao === 'pago') return 'sit-pago'
  if (item.situacao === 'vencido') return 'sit-atrasado'
  if (item.situacao === 'sem-data') return 'sit-ok'
  return 'sit-hoje'
}

const ABAS = [
  { key: 'aberto', label: '🔵 Em aberto' },
  { key: 'vencidos', label: '🔴 Em atraso' },
  { key: 'a-vencer', label: '🟡 A vencer' },
  { key: 'pagos', label: '🟢 Já pagos' },
]

const ORDENS = [
  { key: 'vencimento', label: 'Vencimento (mais próximo)' },
  { key: 'pagamento', label: 'Pagamento (mais recente)' },
  { key: 'valor', label: 'Valor (maior primeiro)' },
  { key: 'nome', label: 'Nome (A-Z)' },
]

const PERIODOS = [
  { key: 'tudo', label: 'Todo o período' },
  { key: 'mes', label: 'Este mês' },
  { key: 'ano', label: 'Este ano' },
]

function ordenar(lista, ordem) {
  const porNome = (a, b) =>
    String(a.descricao || '').localeCompare(String(b.descricao || ''), 'pt-BR')
  return [...lista].sort((a, b) => {
    if (ordem === 'pagamento') {
      const da = a.data_pagamento || ''
      const db = b.data_pagamento || ''
      if (da !== db) {
        if (!da) return 1
        if (!db) return -1
        return db.localeCompare(da)
      }
      return porNome(a, b)
    }
    if (ordem === 'valor') return num(b.valor) - num(a.valor)
    if (ordem === 'nome') return porNome(a, b)
    const va = a.vencimento || ''
    const vb = b.vencimento || ''
    if (va !== vb) {
      if (!va) return 1
      if (!vb) return -1
      return va.localeCompare(vb)
    }
    return porNome(a, b)
  })
}

function hoje() {
  const d = new Date()
  return {
    mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    ano: String(d.getFullYear()),
  }
}

function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

const FAIXAS_ATRASO = [
  { label: '1 a 30 dias', min: 1, max: 30 },
  { label: '31 a 60 dias', min: 31, max: 60 },
  { label: '61 a 90 dias', min: 61, max: 90 },
  { label: 'Mais de 90 dias', min: 91, max: Infinity },
]

const numeroBR = (valor) => num(valor).toFixed(2).replace('.', ',')

function campoCSV(valor) {
  const texto = String(valor ?? '')
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

// Gera o arquivo CSV (abre no Excel; usa ; e vírgula decimal, padrão pt-BR).
function baixarCSV(nomeArquivo, linhas) {
  const csv = `\uFEFF${linhas.map((linha) => linha.map(campoCSV).join(';')).join('\r\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function passaPeriodo(item, periodo) {
  if (periodo === 'tudo') return true
  const data = item.data_pagamento || ''
  if (!data) return false
  const { mes, ano } = hoje()
  return periodo === 'mes' ? data.slice(0, 7) === mes : data.slice(0, 4) === ano
}

function TabelaContas({ itens, aba }) {
  if (!itens.length) return <p className="muted">Nenhuma conta nesta situação.</p>
  const pago = aba === 'pagos'
  return (
    <div className="table-container consulta-tabela">
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Descrição</th>
            <th>Vencimento</th>
            <th>{pago ? 'Pagamento' : 'Últ. pagto.'}</th>
            <th className="num-col">{pago ? 'Valor pago' : 'Valor'}</th>
            {!pago && <th className="num-col">Pago</th>}
            {!pago && <th className="num-col">Saldo</th>}
            <th>Situação</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, indice) => (
            <tr
              key={`${item.tipo}-${item.descricao}-${item.vencimento}-${indice}`}
              className={item.situacao === 'vencido' ? 'row-alerta' : ''}
            >
              <td>
                <span className={`tag ${item.tipo === 'Pagar' ? 'tag-saida' : 'tag-entrada'}`}>
                  {item.tipo === 'Pagar' ? 'Pagar' : 'Receber'}
                </span>
              </td>
              <td>
                <div className="consulta-cliente">{item.descricao}</div>
                {item.detalhe && <div className="consulta-detalhe">{item.detalhe}</div>}
              </td>
              <td>{item.vencimento ? dataBR(item.vencimento) : '-'}</td>
              <td>{item.data_pagamento ? dataBR(item.data_pagamento) : '-'}</td>
              <td className="num-col">{pago ? brl(item.valor_pago) : brl(item.valor)}</td>
              {!pago && <td className="num-col">{brl(item.valor_pago)}</td>}
              {!pago && (
                <td className={`num-col ${item.situacao === 'vencido' ? 'sit-atrasado' : 'saldo-aberto'}`}>
                  {brl(item.saldo)}
                </td>
              )}
              <td className={classeSituacao(item)}>{textoSituacao(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Uma lista com seu subtotal (usada quando "Já pagos" é dividido em
// Recebidos e Pagos).
function GrupoContas({ titulo, itens, aba }) {
  const total = itens.reduce((soma, item) => soma + num(item.valor_pago), 0)
  return (
    <div className="consulta-grupo">
      <h3>
        <span>{titulo}</span>
        <span className="consulta-totais">
          {itens.length} conta(s) • <strong>{brl(total)}</strong>
        </span>
      </h3>
      <TabelaContas itens={itens} aba={aba} />
    </div>
  )
}

// Resumo recolhível por pessoa (cliente/fornecedor) de uma lista.
function ResumoPessoas({ itens, aba, titulo }) {
  const resumo = (() => {
    const mapa = new Map()
    for (const item of itens) {
      const chave = item.descricao || '-'
      const atual = mapa.get(chave) || {
        descricao: chave,
        contas: 0,
        valor: 0,
        pago: 0,
        saldo: 0,
      }
      atual.contas += 1
      atual.valor += num(item.valor)
      atual.pago += num(item.valor_pago)
      atual.saldo += num(item.saldo)
      mapa.set(chave, atual)
    }
    return [...mapa.values()].sort((a, b) =>
      aba === 'pagos' ? b.pago - a.pago : b.saldo - a.saldo,
    )
  })()

  if (!resumo.length) return null

  return (
    <details className="consulta-resumo">
      <summary>
        {titulo} ({resumo.length})
      </summary>
      <div className="table-container consulta-tabela">
        <table>
          <thead>
            <tr>
              <th>Pessoa</th>
              <th className="num-col">Contas</th>
              <th className="num-col">{aba === 'pagos' ? 'Pago' : 'Valor'}</th>
              {aba !== 'pagos' && <th className="num-col">Pago</th>}
              {aba !== 'pagos' && <th className="num-col">Saldo</th>}
            </tr>
          </thead>
          <tbody>
            {resumo.map((pessoa) => (
              <tr key={pessoa.descricao}>
                <td className="consulta-cliente">{pessoa.descricao}</td>
                <td className="num-col">{pessoa.contas}</td>
                <td className="num-col">{brl(aba === 'pagos' ? pessoa.pago : pessoa.valor)}</td>
                {aba !== 'pagos' && <td className="num-col">{brl(pessoa.pago)}</td>}
                {aba !== 'pagos' && (
                  <td className="num-col saldo-aberto">{brl(pessoa.saldo)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

// Tela de RELATÓRIOS: contas em atraso, a vencer e já pagas (a receber e a pagar).
// Para o usuário de CONSULTA (não administrador) ela ocupa a página inteira,
// sem menu nem botões de edição (o banco também bloqueia alterações pelo RLS).
// Para o administrador ela aparece dentro do menu "Relatórios" (`embutido`).
export default function Consulta({ embutido = false }) {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [itens, setItens] = useState([])
  const [modoAntigo, setModoAntigo] = useState(false)
  const [aba, setAba] = useState('aberto')
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [periodo, setPeriodo] = useState('tudo')
  const [ordens, setOrdens] = useState({
    aberto: 'vencimento',
    vencidos: 'vencimento',
    'a-vencer': 'vencimento',
    pagos: 'pagamento',
  })

  useEffect(() => {
    let ativo = true

    // Se a função nova ainda não existir no banco, usa a antiga (só vendas)
    // para a tela continuar funcionando até o administrador rodar o script.
    async function carregar() {
      const nova = await supabase.rpc('relatorio_contas')
      if (!ativo) return

      if (!nova.error) {
        setItens(Array.isArray(nova.data) ? nova.data : [])
        setModoAntigo(false)
        setErro('')
        setLoading(false)
        return
      }

      const antiga = await supabase.rpc('contas_restritas')
      if (!ativo) return

      if (antiga.error) {
        setErro(
          /function|schema cache|not find/i.test(antiga.error.message)
            ? 'Os relatórios ainda não foram ativados no banco. Peça ao administrador para rodar o script supabase/relatorio-contas.sql no Supabase.'
            : antiga.error.message,
        )
        setItens([])
      } else {
        setItens(
          (Array.isArray(antiga.data) ? antiga.data : []).map((r) => ({
            tipo: 'Receber',
            origem: 'venda',
            descricao: r.cliente,
            detalhe: 'Venda de suínos',
            valor: num(r.valor_total),
            valor_pago: num(r.valor_recebido),
            saldo: num(r.saldo_devedor),
            vencimento: r.vencimento,
            data_pagamento: null,
            situacao: r.situacao,
            dias_atraso: r.dias_atraso,
          })),
        )
        setModoAntigo(true)
        setErro('')
      }
      setLoading(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return itens.filter((item) => {
      if (tipo !== 'todos' && item.tipo !== tipo) return false
      if (!termo) return true
      return (
        String(item.descricao || '').toLowerCase().includes(termo) ||
        String(item.detalhe || '').toLowerCase().includes(termo)
      )
    })
  }, [itens, busca, tipo])

  const vencidos = filtrados.filter((item) => item.situacao === 'vencido')
  const aVencer = filtrados.filter((item) =>
    ['a-vencer', 'vence-hoje', 'sem-data'].includes(item.situacao),
  )
  const pagos = filtrados.filter(
    (item) => item.situacao === 'pago' && passaPeriodo(item, periodo),
  )

  const soma = (lista, campo) => lista.reduce((total, item) => total + num(item[campo]), 0)
  const totalVencido = soma(vencidos, 'saldo')
  const totalAVencer = soma(aVencer, 'saldo')
  const totalAberto = totalVencido + totalAVencer
  const totalPago = soma(pagos, 'valor_pago')

  // "Em aberto" = tudo que ainda falta pagar/receber (atrasado + a vencer).
  const abertos = [...vencidos, ...aVencer]
  const listas = { aberto: abertos, vencidos, 'a-vencer': aVencer, pagos }
  const lista = ordenar(listas[aba], ordens[aba])

  // Quantidade de cada lado (para os botões A receber / A pagar).
  const qtdReceber = filtrados.filter((item) => item.tipo === 'Receber').length
  const qtdPagar = filtrados.filter((item) => item.tipo === 'Pagar').length

  // Texto das abas muda conforme o lado escolhido.
  function rotuloAba(key) {
    if (key === 'aberto') return tipo === 'todos' ? '🔵 Em aberto' : `🔵 ${tipo} em aberto`
    if (key === 'vencidos') return tipo === 'todos' ? '🔴 Em atraso' : `🔴 ${tipo} em atraso`
    if (key === 'a-vencer') return tipo === 'todos' ? '🟡 A vencer' : `🟡 ${tipo} a vencer`
    if (tipo === 'Receber') return '🟢 Recebidos'
    if (tipo === 'Pagar') return '🟢 Pagos'
    return '🟢 Já pagos'
  }

  const ladoTexto = tipo === 'Receber' ? 'a receber' : tipo === 'Pagar' ? 'a pagar' : ''
  const tituloCard = (situacao) =>
    ladoTexto ? `Total ${ladoTexto} ${situacao}` : `Total ${situacao}`

  // Em "Já pagos" com tudo selecionado, separa entradas e saídas.
  const dividirPagos = aba === 'pagos' && tipo === 'todos'
  const pagosReceber = lista.filter((item) => item.tipo === 'Receber')
  const pagosPagar = lista.filter((item) => item.tipo === 'Pagar')

  // Faixas de atraso (aging) das contas vencidas.
  const aging = FAIXAS_ATRASO.map((faixa) => {
    const contas = vencidos.filter((item) => {
      const dias = Number(item.dias_atraso) || 0
      return dias >= faixa.min && dias <= faixa.max
    })
    return { ...faixa, contas: contas.length, saldo: soma(contas, 'saldo') }
  }).filter((faixa) => faixa.contas > 0)

  function exportarCSV() {
    if (!lista.length) return
    const colunaData = aba === 'pagos' ? 'Pagamento' : 'Último pagamento'
    const linhas = [
      [
        'Tipo',
        'Descrição',
        'Detalhe',
        'Vencimento',
        colunaData,
        'Valor',
        'Pago',
        'Saldo',
        'Situação',
      ],
      ...lista.map((item) => [
        item.tipo === 'Pagar' ? 'Pagar' : 'Receber',
        item.descricao || '',
        item.detalhe || '',
        item.vencimento ? dataBR(item.vencimento) : '',
        item.data_pagamento ? dataBR(item.data_pagamento) : '',
        numeroBR(item.valor),
        numeroBR(item.valor_pago),
        numeroBR(item.saldo),
        textoSituacao(item),
      ]),
      [],
      [
        '',
        '',
        '',
        '',
        'TOTAL',
        numeroBR(soma(lista, 'valor')),
        numeroBR(soma(lista, 'valor_pago')),
        numeroBR(soma(lista, 'saldo')),
        '',
      ],
    ]
    baixarCSV(`relatorio-${aba}-${tipo.toLowerCase()}-${hojeISO()}.csv`, linhas)
  }

  const totais = {
    aberto: [
      { label: 'contas', valor: String(vencidos.length + aVencer.length) },
      { label: 'saldo', valor: brl(totalAberto) },
    ],
    vencidos: [
      { label: 'contas', valor: String(vencidos.length) },
      { label: 'saldo', valor: brl(totalVencido) },
    ],
    'a-vencer': [
      { label: 'contas', valor: String(aVencer.length) },
      { label: 'saldo', valor: brl(totalAVencer) },
    ],
    pagos: [
      { label: 'contas', valor: String(pagos.length) },
      { label: 'pago', valor: brl(totalPago) },
    ],
  }[aba]

  return (
    <div className={`consulta-page${embutido ? ' consulta-embutida' : ''}`}>
      {!embutido && (
        <header className="consulta-topo">
          <div className="consulta-marca">
            <span>🌱 Agro ERP</span>
            <span className="consulta-badge">Consulta</span>
          </div>
          <div className="consulta-acoes">
            <InstallButton variante="ghost" />
            <button type="button" className="btn-ghost" onClick={() => signOut()}>
              🚪 Sair
            </button>
          </div>
        </header>
      )}

      <p className="muted consulta-aviso">
        {embutido
          ? 'Contas a receber e a pagar. "Em aberto" mostra tudo que ainda falta (atrasado + a vencer). Use "A receber" ou "A pagar" para separar os lados.'
          : 'Relatórios somente leitura: contas em aberto (atrasadas e a vencer) e já pagas, a receber e a pagar. Você não pode alterar nenhum dado.'}
      </p>

      {loading && <div className="empty">Carregando...</div>}
      {!loading && erro && <div className="empty">Erro: {erro}</div>}

      {!loading && !erro && (
        <>
          <div className="consulta-cards">
            <button
              type="button"
              className={`glass-card consulta-card ${aba === 'vencidos' ? 'selecionado' : ''}`}
              onClick={() => setAba('vencidos')}
              title="Ver a lista de contas em atraso"
            >
              <div className="card-title">{tituloCard('em atraso')}</div>
              <div className="card-value negativo">{brl(totalVencido)}</div>
              <div className="card-sub">
                {vencidos.length} conta(s) em atraso · ver lista
              </div>
            </button>
            <button
              type="button"
              className={`glass-card consulta-card ${aba === 'a-vencer' ? 'selecionado' : ''}`}
              onClick={() => setAba('a-vencer')}
              title="Ver a lista de contas a vencer"
            >
              <div className="card-title">{tituloCard('a vencer')}</div>
              <div className="card-value sit-hoje">{brl(totalAVencer)}</div>
              <div className="card-sub">{aVencer.length} conta(s) no prazo · ver lista</div>
            </button>
            <button
              type="button"
              className={`glass-card consulta-card ${aba === 'aberto' ? 'selecionado' : ''}`}
              onClick={() => setAba('aberto')}
              title="Ver todas as contas ainda em aberto (atrasadas + a vencer)"
            >
              <div className="card-title">{tituloCard('em aberto')}</div>
              <div className="card-value">{brl(totalAberto)}</div>
              <div className="card-sub">
                {vencidos.length + aVencer.length} conta(s) · ver lista
              </div>
            </button>
            <button
              type="button"
              className={`glass-card consulta-card ${aba === 'pagos' ? 'selecionado' : ''}`}
              onClick={() => setAba('pagos')}
              title="Ver a lista de contas já pagas/recebidas"
            >
              <div className="card-title">
                {tipo === 'Receber' ? 'Total já recebido' : 'Total já pago'}
              </div>
              <div className="card-value positivo">{brl(totalPago)}</div>
              <div className="card-sub">{pagos.length} conta(s) quitada(s) · ver lista</div>
            </button>
          </div>

          <div className="consulta-abas consulta-lados" role="tablist" aria-label="Relatório">
            {[
              { key: 'todos', label: '📋 Tudo', qtd: qtdReceber + qtdPagar },
              { key: 'Receber', label: '📥 A receber', qtd: qtdReceber },
              { key: 'Pagar', label: '📤 A pagar', qtd: qtdPagar },
            ].map((lado) => (
              <button
                key={lado.key}
                type="button"
                role="tab"
                aria-selected={tipo === lado.key}
                className={`consulta-aba ${tipo === lado.key ? 'ativa' : ''}`}
                onClick={() => setTipo(lado.key)}
              >
                {lado.label} ({lado.qtd})
              </button>
            ))}
          </div>

          <div className="consulta-abas" role="tablist" aria-label="Situação">
            {ABAS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={aba === item.key}
                className={`consulta-aba ${aba === item.key ? 'ativa' : ''}`}
                onClick={() => setAba(item.key)}
              >
                {rotuloAba(item.key)}
              </button>
            ))}
          </div>

          <div className="consulta-filtros">
            <div className="form-group">
              <label htmlFor="consulta-busca">Buscar</label>
              <input
                id="consulta-busca"
                className="form-input search"
                type="search"
                placeholder="Cliente, fornecedor ou lote..."
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="consulta-ordem">Ordenar por</label>
              <select
                id="consulta-ordem"
                className="form-input"
                value={ordens[aba]}
                onChange={(event) =>
                  setOrdens((atual) => ({ ...atual, [aba]: event.target.value }))
                }
              >
                {ORDENS.map((opcao) => (
                  <option key={opcao.key} value={opcao.key}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </div>
            {aba === 'pagos' && (
              <div className="form-group">
                <label htmlFor="consulta-periodo">Período do pagamento</label>
                <select
                  id="consulta-periodo"
                  className="form-input"
                  value={periodo}
                  onChange={(event) => setPeriodo(event.target.value)}
                >
                  {PERIODOS.map((opcao) => (
                    <option key={opcao.key} value={opcao.key}>
                      {opcao.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {modoAntigo && (
            <p className="muted consulta-aviso">
              Mostrando apenas contas a receber. Os relatórios completos (a pagar e já pagos)
              aparecem depois que o administrador rodar o script
              <strong> supabase/relatorio-contas.sql</strong> no Supabase.
            </p>
          )}

          {aba === 'vencidos' && aging.length > 0 && (
            <div className="consulta-aging">
              {aging.map((faixa) => (
                <span className="consulta-chip" key={faixa.label}>
                  <strong>{faixa.label}</strong>
                  <span className="sit-atrasado">{brl(faixa.saldo)}</span>
                  <span className="muted">{faixa.contas} conta(s)</span>
                </span>
              ))}
            </div>
          )}

          <section className="consulta-secao">
            <h2>
              <span>{rotuloAba(aba)}</span>
              <span className="consulta-totais">
                {totais.map((t) => (
                  <span key={t.label}>
                    {t.label}: <strong>{t.valor}</strong>
                  </span>
                ))}
              </span>
            </h2>

            <div className="consulta-toolbar">
              <span className="muted">{lista.length} conta(s) nesta lista</span>
              <button
                type="button"
                className="btn-ghost"
                onClick={exportarCSV}
                disabled={!lista.length}
              >
                ⬇️ Exportar CSV
              </button>
            </div>

            {dividirPagos ? (
              <>
                <GrupoContas titulo="✅ Recebidos (clientes)" itens={pagosReceber} aba={aba} />
                <GrupoContas
                  titulo="✅ Pagos (fornecedor e extras)"
                  itens={pagosPagar}
                  aba={aba}
                />
              </>
            ) : (
              <TabelaContas itens={lista} aba={aba} />
            )}

            {dividirPagos ? (
              <>
                <ResumoPessoas
                  itens={pagosReceber}
                  aba={aba}
                  titulo="Resumo — recebidos"
                />
                <ResumoPessoas itens={pagosPagar} aba={aba} titulo="Resumo — pagos" />
              </>
            ) : (
              <ResumoPessoas itens={lista} aba={aba} titulo="Resumo por pessoa" />
            )}
          </section>
        </>
      )}
    </div>
  )
}
