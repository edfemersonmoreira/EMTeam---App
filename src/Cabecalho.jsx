import Icone from './Icone'

// Trilha de navegação do admin ("Alunas › Ana Souza › Treinos"): mostra onde a administradora está
// e leva de volta a qualquer nível com um clique. Substitui os botões de voltar empilhados.
// itens: [{ rotulo, onClick? }]. O último é a página atual; itens sem onClick aparecem como texto.
export function Trilha({ itens }) {
  if (!itens || !itens.length) return null
  return (
    <nav className="trilha" aria-label="Você está em">
      <ol>
        {itens.map((it, i) => {
          const atual = i === itens.length - 1
          return (
            <li key={i}>
              {it.onClick && !atual
                ? <button type="button" onClick={it.onClick}>{it.rotulo}</button>
                : <span aria-current={atual ? 'page' : undefined}>{it.rotulo}</span>}
              {!atual && <Icone nome="chevron" tam={14} />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Cabeçalho padrão das páginas do admin: trilha (opcional), título, subtítulo e ações à direita.
export function CabecalhoPagina({ trilha, titulo, subtitulo, acoes, children }) {
  return (
    <div className="cab-pagina">
      <Trilha itens={trilha} />
      <div className="cab-pagina-linha">
        <div className="cab-pagina-texto">
          <h2>{titulo}</h2>
          {subtitulo && <p className="muted">{subtitulo}</p>}
        </div>
        {acoes && <div className="cab-pagina-acoes">{acoes}</div>}
      </div>
      {children}
    </div>
  )
}
