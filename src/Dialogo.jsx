import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// Diálogos do app (confirmar uma ação, pedir um nome), com a identidade do EM Team, no lugar das janelas
// padrão do navegador (window.confirm e window.prompt). Usa o elemento <dialog> nativo: o foco fica preso
// dentro dele, Esc fecha e o leitor de tela anuncia o título.
//
// Uso:  const { confirmar, pedirTexto } = useDialogo()
//       if (!(await confirmar({ titulo: 'Excluir "Treino A"?', texto: '…', acao: 'Excluir', perigo: true }))) return
//       const nome = await pedirTexto({ titulo: 'Nome do modelo', valor: 'Treino A' })   // null se cancelar
// O retorno é o mesmo de window.confirm (true/false) e de window.prompt (texto ou null).

const Ctx = createContext(null)

export function useDialogo() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useDialogo precisa estar dentro de <DialogoProvider>')
  return c
}

export function DialogoProvider({ children }) {
  const [atual, setAtual] = useState(null)   // { tipo, titulo, texto, acao, cancelar, perigo, valor, rotulo, resolver }
  const abrir = useCallback((tipo, opcoes) => new Promise(resolver => setAtual({ tipo, ...opcoes, resolver })), [])
  const confirmar = useCallback(o => abrir('confirmar', o), [abrir])
  const pedirTexto = useCallback(o => abrir('texto', o), [abrir])
  const fechar = valor => { if (atual) atual.resolver(valor); setAtual(null) }
  return (
    <Ctx.Provider value={{ confirmar, pedirTexto }}>
      {children}
      {atual && <Janela d={atual} onFechar={fechar} />}
    </Ctx.Provider>
  )
}

function Janela({ d, onFechar }) {
  const ref = useRef(null)
  const campo = useRef(null)
  const cancelar = useRef(null)
  const [valor, setValor] = useState(d.valor ?? '')
  const cancelado = d.tipo === 'texto' ? null : false

  useEffect(() => {
    const el = ref.current
    if (el && !el.open) el.showModal()
    // Foco inicial: no campo de texto; numa ação destrutiva, em Cancelar (o caminho seguro).
    if (d.tipo === 'texto' && campo.current) { campo.current.focus(); campo.current.select() }
    else if (d.perigo && cancelar.current) cancelar.current.focus()
  }, [])

  const enviar = e => { e.preventDefault(); onFechar(d.tipo === 'texto' ? valor : true) }

  return (
    <dialog ref={ref} className="dialogo" aria-labelledby="dialogo-titulo"
      onCancel={e => { e.preventDefault(); onFechar(cancelado) }}
      onClick={e => { if (e.target === ref.current) onFechar(cancelado) }}>
      <form onSubmit={enviar} className="dialogo-corpo">
        <h3 id="dialogo-titulo">{d.titulo}</h3>
        {d.texto && <p className="muted">{d.texto}</p>}
        {d.tipo === 'texto' && (
          <label className="campo-rotulo">{d.rotulo || 'Nome'}
            <input ref={campo} value={valor} onChange={e => setValor(e.target.value)} placeholder={d.placeholder || ''} />
          </label>
        )}
        <div className="dialogo-acoes">
          <button type="button" ref={cancelar} className="btn sec sm" onClick={() => onFechar(cancelado)}>{d.cancelar || 'Cancelar'}</button>
          <button className={'btn sm' + (d.perigo ? ' perigo' : '')}>{d.acao || (d.tipo === 'texto' ? 'Salvar' : 'Confirmar')}</button>
        </div>
      </form>
    </dialog>
  )
}
