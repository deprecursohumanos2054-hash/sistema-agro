// Service worker do Agro ERP: deixa o app instalável e abre mesmo sem internet
// (mostra a última tela carregada). Não interfere nas chamadas ao Supabase.
const CACHE = 'agro-erp-v1'
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Só cuida dos arquivos do próprio app; Supabase e outros domínios seguem direto.
  if (url.origin !== self.location.origin) return

  // Páginas: tenta a rede (para pegar atualizações) e usa o cache se estiver offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copia = response.clone()
          caches.open(CACHE).then((cache) => cache.put('/index.html', copia))
          return response
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  // Arquivos estáticos: cache primeiro (os nomes mudam a cada versão).
  if (url.pathname.startsWith('/assets/') || SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copia = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copia))
            return response
          }),
      ),
    )
  }
})
