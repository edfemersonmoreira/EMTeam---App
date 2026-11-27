// Volume por grupamento muscular durante a montagem de um treino (ou modelo).
// Regras:
//  - Biblioteca (exercicios.grupo_muscular): só lista os músculos que o exercício recruta. Não tem principal nem secundário.
//  - Prescrição (treino_exercicios / modelo_itens): grupo_principal e grupos_secundarios, definidos por quem monta o treino.
//  - Cada série PRINCIPAL conta 1 para o grupamento principal daquela prescrição. Nada é dividido nem duplicado.
//  - Secundários aparecem à parte (em quantos exercícios), sem receber séries.
//  - Aquecimento, reconhecimento, dropset e os demais tipos de série não entram.
//  - Exercício sem principal definido não é atribuído a nenhum grupamento: as séries dele aparecem como "sem principal".
import { GRUPOS, lerGrupos } from './grupos'

// Quantas séries principais um exercício prescrito tem. principalIds: ids das categorias marcadas como principal.
export function seriesPrincipais(it, principalIds) {
  const blocos = Array.isArray(it.blocos) ? it.blocos : []
  return blocos.reduce((soma, b) => {
    const n = parseInt(b.series, 10)
    return principalIds.has(b.categoria_id) && Number.isFinite(n) && n > 0 ? soma + n : soma
  }, 0)
}

const ordemGrupo = g => { const i = GRUPOS.indexOf(g); return i < 0 ? GRUPOS.length : i }

export function volumePorGrupo(itens, principalIds) {
  const porGrupo = {}, secundarios = {}
  let semPrincipalSeries = 0, semPrincipalExercicios = 0, total = 0
  ;(itens || []).forEach(it => {
    const n = seriesPrincipais(it, principalIds)
    total += n
    const principal = (it.grupo_principal || '').trim()
    if (principal) porGrupo[principal] = (porGrupo[principal] || 0) + n
    else if (n > 0) { semPrincipalSeries += n; semPrincipalExercicios++ }
    lerGrupos(it.grupos_secundarios).filter(g => g !== principal).forEach(g => { secundarios[g] = (secundarios[g] || 0) + 1 })
  })
  const grupos = Object.entries(porGrupo)
    .map(([grupo, series]) => ({ grupo, series }))
    .sort((a, b) => b.series - a.series || ordemGrupo(a.grupo) - ordemGrupo(b.grupo))
  const sec = Object.entries(secundarios)
    .map(([grupo, exercicios]) => ({ grupo, exercicios }))
    .sort((a, b) => b.exercicios - a.exercicios || ordemGrupo(a.grupo) - ordemGrupo(b.grupo))
  return { grupos, secundarios: sec, semPrincipal: { series: semPrincipalSeries, exercicios: semPrincipalExercicios }, total }
}

// Opções de classificação de uma prescrição: os grupamentos da biblioteca, mais algum já escolhido que tenha saído dela.
export function opcoesDeGrupo(doLivro, principal, secundarios) {
  const lista = lerGrupos(doLivro)
  const extras = [principal, ...lerGrupos(secundarios)].filter(g => g && !lista.includes(g))
  return [...lista, ...new Set(extras)]
}
