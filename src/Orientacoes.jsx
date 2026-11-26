import { useRef, useState } from 'react'

// Orientações de um exercício dentro de um treino ou modelo (para a aluna ver na execução).
// valor: texto próprio deste treino. Ao incluir o exercício, ele já vem copiado da biblioteca (vazio se não houver).
//        Nulo = treino antigo, de antes deste campo: a aluna continua vendo as orientações da biblioteca.
// salvar(novo): grava no treino/modelo e devolve a mensagem de erro ('' se deu certo). Nunca altera a biblioteca.
export default function CampoOrientacoes({ valor, daBiblioteca, nome, salvar }) {
  const temProprio = valor !== null && valor !== undefined
  const [proprio, setProprio] = useState(temProprio)
  const [texto, setTexto] = useState(valor ?? '')
  const salvo = useRef(temProprio ? valor : null)   // só grava quando o texto mudou

  async function gravar(novo) {
    if (novo === salvo.current) return
    const erro = await salvar(novo)
    if (!erro) salvo.current = novo
  }

  if (!proprio) {
    return (
      <div className="orient-bib">
        <span className="muted pequeno">
          {daBiblioteca ? 'A aluna vê as orientações da biblioteca.' : 'Sem orientações na biblioteca.'}
        </span>
        <button type="button" className="mini" onClick={() => { const t = daBiblioteca || ''; setTexto(t); setProprio(true); gravar(t) }}>
          {daBiblioteca ? 'Personalizar neste treino' : 'Escrever orientações'}
        </button>
      </div>
    )
  }
  return (
    <label className="orient-campo">
      <span className="rot">Orientações para a aluna</span>
      <textarea rows={2} value={texto} aria-label={`Orientações de ${nome}`}
        placeholder={daBiblioteca ? 'Escreva as orientações deste exercício.' : 'Este exercício não tem orientações na biblioteca. Escreva aqui, se quiser.'}
        onChange={e => setTexto(e.target.value)} onBlur={() => gravar(texto)} />
    </label>
  )
}
