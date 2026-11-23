import Icone from './Icone'

// Botão de voltar único do app.
// soIcone: botão quadrado só com a seta (cabeçalhos das telas da aluna, ao lado do título).
// Sem soIcone: seta + rótulo curto do destino ("Alunas", "Fichas", "Modelos").
export default function Voltar({ onClick, rotulo = 'Voltar', soIcone = false }) {
  if (soIcone) {
    return (
      <button type="button" className="icone-btn" onClick={onClick} aria-label={rotulo} title={rotulo}>
        <Icone nome="voltar" />
      </button>
    )
  }
  return (
    <button type="button" className="btn-voltar" onClick={onClick}>
      <Icone nome="voltar" tam={18} />{rotulo}
    </button>
  )
}
