import { useState } from 'react'
import { juntarGrupos, lerGrupos } from './grupos'
import { volumePorGrupo, opcoesDeGrupo } from './volumeUtil'

// Classificação muscular de UM exercício dentro de um treino ou modelo.
// Mostra só os grupamentos cadastrados na biblioteca para aquele exercício. Nada é escolhido automaticamente.
//   doLivro       exercicios.grupo_muscular (biblioteca; nunca é alterado aqui)
//   principal     grupo_principal desta prescrição (ou nulo)
//   secundarios   grupos_secundarios desta prescrição (texto separado por vírgula, ou nulo)
//   salvar({ grupo_principal, grupos_secundarios }) grava na prescrição e devolve a mensagem de erro ('' se deu certo)
export function GruposPrescricao({ doLivro, principal, secundarios, nome, salvar }) {
  const [p, setP] = useState(principal || '')
  const [sec, setSec] = useState(lerGrupos(secundarios))
  const opcoes = opcoesDeGrupo(doLivro, p, sec.join(', '))

  async function gravar(novoP, novoSec) {
    const antes = [p, sec]
    setP(novoP); setSec(novoSec)
    const erro = await salvar({ grupo_principal: novoP || null, grupos_secundarios: juntarGrupos(novoSec) })
    if (erro) { setP(antes[0]); setSec(antes[1]) }   // volta ao que estava salvo
  }
  // O principal nunca fica também como secundário
  const trocarPrincipal = g => gravar(g, sec.filter(x => x !== g))
  const alternarSec = g => gravar(p, sec.includes(g) ? sec.filter(x => x !== g) : [...sec, g])

  if (opcoes.length === 0) {
    return <p className="gp-vazio muted pequeno">Sem grupamentos cadastrados na biblioteca para este exercício.</p>
  }
  return (
    <div className="gp" role="group" aria-label={`Grupamentos de ${nome} neste treino`}>
      <label className="gp-principal">
        <span className="rot">Grupamento principal</span>
        <select value={p} onChange={e => trocarPrincipal(e.target.value)} aria-label={`Grupamento principal de ${nome}`}>
          <option value="">Não definido</option>
          {opcoes.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </label>
      {opcoes.length > 1 && (
        <div className="gp-sec">
          <span className="rot">Secundários</span>
          <div className="gp-chips">
            {opcoes.filter(g => g !== p).map(g => (
              <button key={g} type="button" className={'chip' + (sec.includes(g) ? ' on' : '')} aria-pressed={sec.includes(g)}
                onClick={() => alternarSec(g)}>{g}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Painel compacto com o volume do dia: séries principais por grupamento principal, secundários à parte.
export function PainelVolume({ itens, cats }) {
  const principalIds = new Set((cats || []).filter(c => c.principal).map(c => c.id))
  const V = volumePorGrupo(itens, principalIds)
  if (!itens || itens.length === 0) return null
  return (
    <section className="painel-volume" aria-label="Volume por grupamento neste treino">
      <div className="pv-cab">
        <strong>Séries principais por grupamento</strong>
        <span className="muted pequeno">{V.total} no total</span>
      </div>
      {V.grupos.length > 0 ? (
        <ul className="pv-lista">
          {V.grupos.map(g => (
            <li key={g.grupo}><span className="pv-nome">{g.grupo}</span><span className="pv-num">{g.series}</span></li>
          ))}
        </ul>
      ) : <p className="muted pequeno pv-nada">Defina o grupamento principal de cada exercício para ver a distribuição.</p>}
      {V.semPrincipal.series > 0 && (
        <p className="pv-aviso pequeno">
          {V.semPrincipal.series} {V.semPrincipal.series === 1 ? 'série' : 'séries'} sem grupamento principal definido
          ({V.semPrincipal.exercicios} {V.semPrincipal.exercicios === 1 ? 'exercício' : 'exercícios'})
        </p>
      )}
      {V.secundarios.length > 0 && (
        <p className="pv-sec pequeno">
          <span className="muted">Secundários: </span>
          {V.secundarios.map((s, i) => (
            <span key={s.grupo} className="sem-quebra">{s.grupo} <span className="muted">({s.exercicios} {s.exercicios === 1 ? 'exercício' : 'exercícios'})</span>{i < V.secundarios.length - 1 ? ', ' : ''}</span>
          ))}
        </p>
      )}
    </section>
  )
}
