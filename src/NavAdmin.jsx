import Icone from './Icone'

// Menu fixo do administrador. No computador (960 px ou mais) é uma barra lateral; em telas menores,
// uma faixa de abas abaixo do cabeçalho. Leva a qualquer área com um clique, sem passar pelo Início.
export const AREAS_ADMIN = [
  ['inicio', 'Início', 'inicio'],
  ['alunas', 'Alunas', 'users'],
  ['exercicios', 'Exercícios', 'dumbbell'],
  ['modelos', 'Modelos de treino', 'modelos'],
  ['alongamentos', 'Alongamentos', 'alongar'],
]

export default function NavAdmin({ aba, irPara }) {
  return (
    <nav className="nav-admin" aria-label="Áreas do administrador">
      {AREAS_ADMIN.map(([id, rotulo, icone]) => (
        <button key={id} type="button" className={aba === id ? 'on' : ''} aria-current={aba === id ? 'page' : undefined} onClick={() => irPara(id)}>
          <Icone nome={icone} tam={20} /><span>{rotulo}</span>
        </button>
      ))}
    </nav>
  )
}
