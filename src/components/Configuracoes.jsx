import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  setConfig,
  getPrecoKg,
  getValorPadrao,
  CHAVE_VALOR_KG_VENDA,
  CHAVE_VALOR_CABECA,
  CHAVE_VALOR_KG_SARAPATEL,
  CHAVE_WHATSAPP_ADMIN,
  CHAVE_WHATSAPP_CONSULTA,
  CHAVE_TELEGRAM_TOKEN,
  CHAVE_TELEGRAM_CHATS,
  CHAVE_TELEGRAM_DIAS,
  VALOR_KG_PADRAO,
  VALOR_CABECA_PADRAO,
  VALOR_KG_SARAPATEL_PADRAO,
  TELEGRAM_DIAS_PADRAO,
  formatarTelefoneWhatsApp,
  somenteDigitos,
} from '../lib/config'

export default function Configuracoes() {
  const [precoVenda, setPrecoVenda] = useState('')
  const [precoCabeca, setPrecoCabeca] = useState('')
  const [precoSarapatel, setPrecoSarapatel] = useState('')
  const [whatsappAdmin, setWhatsappAdmin] = useState('')
  const [whatsappConsulta, setWhatsappConsulta] = useState('')
  const [telegramToken, setTelegramToken] = useState('')
  const [telegramChats, setTelegramChats] = useState('')
  const [telegramDias, setTelegramDias] = useState(String(TELEGRAM_DIAS_PADRAO))
  const [loading, setLoading] = useState(true)
  const [testando, setTestando] = useState(false)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all([
      getPrecoKg(CHAVE_VALOR_KG_VENDA),
      getValorPadrao(CHAVE_VALOR_CABECA, VALOR_CABECA_PADRAO),
      getValorPadrao(CHAVE_VALOR_KG_SARAPATEL, VALOR_KG_SARAPATEL_PADRAO),
      getValorPadrao(CHAVE_WHATSAPP_ADMIN, ''),
      getValorPadrao(CHAVE_WHATSAPP_CONSULTA, ''),
      getValorPadrao(CHAVE_TELEGRAM_TOKEN, ''),
      getValorPadrao(CHAVE_TELEGRAM_CHATS, ''),
      getValorPadrao(CHAVE_TELEGRAM_DIAS, String(TELEGRAM_DIAS_PADRAO)),
    ]).then(([venda, cabeca, sarapatel, zapAdmin, zapConsulta, tgToken, tgChats, tgDias]) => {
      if (!ativo) return
      setPrecoVenda(String(venda ?? VALOR_KG_PADRAO))
      setPrecoCabeca(String(cabeca ?? VALOR_CABECA_PADRAO))
      setPrecoSarapatel(String(sarapatel ?? VALOR_KG_SARAPATEL_PADRAO))
      setWhatsappAdmin(formatarTelefoneWhatsApp(zapAdmin))
      setWhatsappConsulta(formatarTelefoneWhatsApp(zapConsulta))
      setTelegramToken(tgToken || '')
      setTelegramChats(tgChats || '')
      setTelegramDias(String(tgDias || TELEGRAM_DIAS_PADRAO))
      setLoading(false)
    })
    return () => {
      ativo = false
    }
  }, [])

  async function salvarConfiguracoes() {
    setMsg('')
    setErro('')
    for (const [campo, numero] of [
      ['administrador', whatsappAdmin],
      ['consulta', whatsappConsulta],
    ]) {
      const digitos = somenteDigitos(numero)
      if (digitos && digitos.length < 10) {
        setErro(
          `O WhatsApp do ${campo} está incompleto. Digite com DDD, ex.: (82) 99110-9849.`,
        )
        return false
      }
    }
    const resultados = await Promise.all([
      setConfig(CHAVE_VALOR_KG_VENDA, precoVenda.replace(',', '.')),
      setConfig(CHAVE_VALOR_CABECA, precoCabeca.replace(',', '.')),
      setConfig(CHAVE_VALOR_KG_SARAPATEL, precoSarapatel.replace(',', '.')),
      setConfig(CHAVE_WHATSAPP_ADMIN, somenteDigitos(whatsappAdmin)),
      setConfig(CHAVE_WHATSAPP_CONSULTA, somenteDigitos(whatsappConsulta)),
      setConfig(CHAVE_TELEGRAM_TOKEN, telegramToken.trim()),
      setConfig(CHAVE_TELEGRAM_CHATS, telegramChats.trim()),
      setConfig(
        CHAVE_TELEGRAM_DIAS,
        String(Math.min(Math.max(Number(telegramDias) || TELEGRAM_DIAS_PADRAO, 0), 60)),
      ),
    ])
    const falha = resultados.find((r) => r.error)
    if (falha) {
      setErro(falha.error.message)
      return false
    }
    setMsg('Valores salvos com sucesso!')
    return true
  }

  async function salvar(event) {
    event.preventDefault()
    await salvarConfiguracoes()
  }

  async function testarTelegram() {
    if (testando) return
    setTestando(true)
    const salvou = await salvarConfiguracoes()
    if (!salvou) {
      setTestando(false)
      return
    }
    const { data, error } = await supabase.rpc('testar_telegram')
    if (error) {
      setErro(
        /function|schema cache|not find/i.test(error.message)
          ? 'O envio pelo Telegram ainda não foi ativado no banco. Rode o script supabase/telegram-lembretes.sql no Supabase.'
          : error.message,
      )
      setMsg('')
    } else {
      setMsg(String(data || 'Teste enviado. Confira o Telegram.'))
    }
    setTestando(false)
  }

  return (
    <>
      <div className="glass-card" style={{ maxWidth: 520 }}>
        <div className="card-title">Configurações do Sistema</div>
        <form onSubmit={salvar}>
          <div className="form-group">
            <label htmlFor="valor-kg-venda">Valor do Kg — Carne ao Cliente (R$)</label>
            <input
              id="valor-kg-venda"
              className="form-input"
              type="text"
              inputMode="decimal"
              placeholder="25,00"
              value={loading ? '' : precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="valor-cabeca">Venda da Cabeça do Porco (R$ por unidade)</label>
            <input
              id="valor-cabeca"
              className="form-input"
              type="text"
              inputMode="decimal"
              placeholder="25,00"
              value={loading ? '' : precoCabeca}
              onChange={(e) => setPrecoCabeca(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="valor-kg-sarapatel">Sarapatel do Porco (R$ por Kg)</label>
            <input
              id="valor-kg-sarapatel"
              className="form-input"
              type="text"
              inputMode="decimal"
              placeholder="20,00"
              value={loading ? '' : precoSarapatel}
              onChange={(e) => setPrecoSarapatel(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="whatsapp-admin">WhatsApp do administrador (Luiz)</label>
            <input
              id="whatsapp-admin"
              className="form-input"
              type="tel"
              inputMode="tel"
              placeholder="(82) 99110-9849"
              value={loading ? '' : whatsappAdmin}
              onChange={(e) => setWhatsappAdmin(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="whatsapp-consulta">WhatsApp do usuário de consulta (José Adriano)</label>
            <input
              id="whatsapp-consulta"
              className="form-input"
              type="tel"
              inputMode="tel"
              placeholder="(82) 98842-9671"
              value={loading ? '' : whatsappConsulta}
              onChange={(e) => setWhatsappConsulta(e.target.value)}
            />
          </div>

          <p className="muted">
            Esses números recebem o resumo pelo botão <strong>📲 Enviar no WhatsApp</strong> na tela de
            Relatórios. O WhatsApp abre com a mensagem pronta — você só toca em enviar. Deixe em branco
            para não usar.
          </p>

          <p className="muted">
            <strong>📨 Lembretes automáticos pelo Telegram (grátis)</strong> — todos os dias às 08:00 o
            bot envia o resumo das contas de clientes atrasadas e das que vão vencer.
          </p>

          <div className="form-group">
            <label htmlFor="telegram-token">Token do bot do Telegram</label>
            <input
              id="telegram-token"
              className="form-input"
              type="password"
              autoComplete="off"
              placeholder="123456789:AAE..."
              value={loading ? '' : telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="telegram-chats">Chat IDs do Telegram (Luiz e José)</label>
            <input
              id="telegram-chats"
              className="form-input"
              type="text"
              inputMode="numeric"
              placeholder="123456789, 987654321"
              value={loading ? '' : telegramChats}
              onChange={(e) => setTelegramChats(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="telegram-dias">Avisar com quantos dias de antecedência</label>
            <input
              id="telegram-dias"
              className="form-input"
              type="number"
              inputMode="numeric"
              min="0"
              max="60"
              value={loading ? '' : telegramDias}
              onChange={(e) => setTelegramDias(e.target.value)}
            />
          </div>

          <p className="muted">
            Para descobrir o Chat ID, cada pessoa abre o Telegram, procura <strong>@userinfobot</strong>,
            toca em <strong>Start</strong> e copia o número que ele responde. Depois é só colar os dois
            números aqui, separados por vírgula. Cada um também precisa abrir o bot do sistema e tocar
            em <strong>Start</strong> uma vez.
          </p>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={testarTelegram}
              disabled={loading || testando}
            >
              {testando ? 'Enviando...' : '📨 Enviar teste no Telegram'}
            </button>
          </div>

          <p className="muted">
            Esses valores são os <strong>preços padrão</strong> sugeridos ao lançar uma venda no menu
            <strong> Vendas de Suínos</strong>. Você pode alterar o preço em cada venda. No menu
            <strong> Lotes Suínos</strong> o preço do Kg é calculado (Custo Total ÷ Peso), então não é
            configurável aqui.
          </p>
          <p className="muted">
            A <strong>cabeça</strong> é vendida por unidade e o <strong>sarapatel</strong> por Kg. Os
            dois entram no Valor Total da venda e aparecem no Financeiro/Dashboard como receita.
          </p>
          {msg && <div className="status-msg">{msg}</div>}
          {erro && <div className="status-msg erro">Erro: {erro}</div>}
          <div className="modal-actions">
            <button type="submit" className="btn-novo" disabled={loading}>
              Salvar
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
