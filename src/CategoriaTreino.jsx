import Icone from './Icone'
import './categoriaTreino.css'

// Identificação discreta do tipo de treino (ícone + nome), sem depender de cor.
export default function CategoriaTreino({ categoria, solo = false }) {
  if (!categoria) return null
  return (
    <span className="cat-treino" title={categoria.nome}>
      <Icone nome={categoria.icone} tam={14} />{!solo && categoria.nome}
    </span>
  )
}
