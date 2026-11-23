import { useEffect, useRef, useState } from 'react'
import Icone from './Icone'

// Menu "⋯" para ações secundárias e destrutivas, para que cada cartão mostre só a ação principal.
// itens: [{ rotulo, onClick, perigo?, oculto? }]. Teclado: Enter/Espaço abre, setas navegam, Esc fecha.
export default function Menu({ itens, rotulo = 'Mais ações' }) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef(null)
  const botao = useRef(null)
  const lista = itens.filter(i => !i.oculto)

  useEffect(() => {
    if (!aberto) return
    const fora = e => { if (raiz.current && !raiz.current.contains(e.target)) setAberto(false) }
    document.addEventListener('pointerdown', fora)
    const primeiro = raiz.current && raiz.current.querySelector('[role="menuitem"]')
    if (primeiro) primeiro.focus()
    return () => document.removeEventListener('pointerdown', fora)
  }, [aberto])

  function teclado(e) {
    const itensEl = [...raiz.current.querySelectorAll('[role="menuitem"]')]
    const i = itensEl.indexOf(document.activeElement)
    if (e.key === 'Escape') { e.preventDefault(); setAberto(false); botao.current.focus() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); itensEl[(i + 1) % itensEl.length].focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); itensEl[(i - 1 + itensEl.length) % itensEl.length].focus() }
    else if (e.key === 'Tab') setAberto(false)
  }

  if (!lista.length) return null
  return (
    <div className="menu" ref={raiz} onKeyDown={aberto ? teclado : undefined}>
      <button type="button" ref={botao} className="mini icone" aria-haspopup="menu" aria-expanded={aberto}
        aria-label={rotulo} title={rotulo} onClick={() => setAberto(!aberto)}>
        <Icone nome="menu" tam={18} />
      </button>
      {aberto && (
        <div className="menu-lista" role="menu">
          {lista.map(it => (
            <button key={it.rotulo} type="button" role="menuitem" className={it.perigo ? 'perigo' : ''}
              onClick={() => { setAberto(false); it.onClick() }}>{it.rotulo}</button>
          ))}
        </div>
      )}
    </div>
  )
}
