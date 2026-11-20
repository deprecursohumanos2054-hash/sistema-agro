import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registra o service worker somente em produção (no dev ele atrapalharia o hot reload).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sem service worker o sistema continua funcionando normalmente no navegador.
    })
  })
}

// Avisa quando o administrador publicou uma versão nova: a página que está
// aberta continua na antiga até o usuário tocar no aviso.
if (import.meta.env.PROD) {
  const scriptAtual = [...document.scripts]
    .map((tag) => tag.src)
    .find((src) => /\/assets\/index-.*\.js$/.test(src))

  let avisado = false

  async function verificarVersao() {
    if (avisado || !scriptAtual) return
    try {
      // /versao.txt não passa pelo service worker, então vem sempre da rede.
      const resposta = await fetch(`/versao.txt?t=${Date.now()}`, { cache: 'no-store' })
      if (!resposta.ok) return
      const arquivoNovo = (await resposta.text()).trim()
      if (!arquivoNovo || scriptAtual.endsWith(arquivoNovo)) return
      avisado = true
      const aviso = document.createElement('button')
      aviso.type = 'button'
      aviso.className = 'aviso-versao'
      aviso.textContent = '🔄 Nova versão disponível — toque para atualizar'
      aviso.addEventListener('click', () => window.location.reload())
      document.body.appendChild(aviso)
    } catch {
      // Offline: tenta de novo quando a janela voltar ao foco.
    }
  }

  verificarVersao()
  window.addEventListener('focus', verificarVersao)
  window.setInterval(verificarVersao, 5 * 60 * 1000)
}
