// Mostra qual versão do app está rodando (o nome do bundle atual).
// Útil para conferir se o celular já pegou a atualização.
export function versaoApp() {
  const src =
    [...document.scripts].map((tag) => tag.src).find((url) => /\/assets\/index-.*\.js$/.test(url)) ||
    ''
  return /index-([A-Za-z0-9_-]+)\.js/.exec(src)?.[1] || 'dev'
}
