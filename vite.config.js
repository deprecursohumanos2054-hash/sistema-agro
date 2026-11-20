import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Gera /versao.txt com o nome do bundle atual. O app aberto compara esse
// arquivo com o script que está rodando e avisa quando há versão nova.
function emitirVersao() {
  return {
    name: 'emitir-versao',
    generateBundle(_opcoes, bundle) {
      const arquivo = Object.keys(bundle).find((nome) => /^assets\/index-.*\.js$/.test(nome))
      if (arquivo) {
        this.emitFile({ type: 'asset', fileName: 'versao.txt', source: arquivo })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), emitirVersao()],
})
