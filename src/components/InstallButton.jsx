import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const ehIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const jaInstalado = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

// Botão "Instalar aplicativo": no Android dispara o aviso nativo; no iPhone e
// em outros navegadores mostra o passo a passo.
export default function InstallButton({ variante = 'nav' }) {
  const [prompt, setPrompt] = useState(null)
  const [instalado, setInstalado] = useState(jaInstalado)
  const [passos, setPassos] = useState(false)

  useEffect(() => {
    function aoPoderInstalar(event) {
      event.preventDefault()
      setPrompt(event)
    }
    function aoInstalar() {
      setPrompt(null)
      setInstalado(true)
    }

    window.addEventListener('beforeinstallprompt', aoPoderInstalar)
    window.addEventListener('appinstalled', aoInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar)
      window.removeEventListener('appinstalled', aoInstalar)
    }
  }, [])

  async function instalar() {
    if (prompt) {
      prompt.prompt()
      const escolha = await prompt.userChoice
      if (escolha.outcome === 'accepted') {
        setPrompt(null)
        setInstalado(true)
      }
      return
    }
    setPassos(true)
  }

  if (instalado) return null

  return (
    <>
      <button
        type="button"
        className={variante === 'ghost' ? 'btn-ghost install-btn-ghost' : 'nav-btn install-btn'}
        onClick={instalar}
      >
        📲 Instalar aplicativo
      </button>

      {passos &&
        createPortal(
          <div className="modal" onMouseDown={() => setPassos(false)}>
            <div
              className="modal-content"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="modal-header">📲 Instalar o Agro ERP</div>
              {ehIOS() ? (
                <ol className="instalar-passos">
                  <li>Toque no botão <strong>Compartilhar</strong> do Safari (quadrado com a seta para cima).</li>
                  <li>Escolha <strong>“Adicionar à Tela de Início”</strong>.</li>
                  <li>Toque em <strong>Adicionar</strong>. O ícone do Agro ERP aparece na tela inicial.</li>
                </ol>
              ) : (
                <ol className="instalar-passos">
                  <li>Abra o menu <strong>⋮</strong> do navegador (canto superior direito).</li>
                  <li>Toque em <strong>“Instalar aplicativo”</strong> ou <strong>“Adicionar à tela inicial”</strong>.</li>
                  <li>Confirme. O ícone do Agro ERP aparece junto dos seus apps.</li>
                  <li className="muted">
                    Se estiver no computador, envie o link para o celular pelo WhatsApp e faça
                    o passo a passo por lá.
                  </li>
                </ol>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-novo" onClick={() => setPassos(false)}>
                  Entendi
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
