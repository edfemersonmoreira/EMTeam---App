// Tema da interface (escuro = padrão, claro = opcional). A escolha fica guardada no aparelho e vale ao fechar e reabrir o app.
// O mesmo código roda também em linha no index.html, antes de a tela aparecer, para não piscar o tema errado.
const CHAVE = 'emteam-tema'
const COR_BARRA = { escuro: '#101617', claro: '#F3F6F6' }

export function temaSalvo() {
  try { return localStorage.getItem(CHAVE) === 'claro' ? 'claro' : 'escuro' } catch { return 'escuro' }
}

export function temaAtual() {
  return document.documentElement.getAttribute('data-tema') === 'claro' ? 'claro' : 'escuro'
}

export function aplicarTema(tema) {
  const t = tema === 'claro' ? 'claro' : 'escuro'
  document.documentElement.setAttribute('data-tema', t)
  const barra = document.querySelector('meta[name="theme-color"]')
  if (barra) barra.setAttribute('content', COR_BARRA[t])
  const esquema = document.querySelector('meta[name="color-scheme"]')
  if (esquema) esquema.setAttribute('content', t === 'claro' ? 'light' : 'dark')
  return t
}

export function trocarTema() {
  const novo = temaAtual() === 'claro' ? 'escuro' : 'claro'
  aplicarTema(novo)
  try { localStorage.setItem(CHAVE, novo) } catch { /* sem armazenamento: vale só nesta sessão */ }
  return novo
}

// Mantém duas abas/janelas abertas do app no mesmo tema.
export function observarTema(aoMudar) {
  const f = e => { if (e.key === CHAVE) aoMudar(aplicarTema(e.newValue)) }
  window.addEventListener('storage', f)
  return () => window.removeEventListener('storage', f)
}
