// Funções puras para blocos de série (tipos de série dentro de um exercício prescrito).
export const PRINCIPAL_PADRAO = { nome: 'Principal', cor: '#20B2AA', principal: true }

// Blocos do exercício, em ordem. Se o exercício ainda não tem blocos (banco sem a migração),
// cria um bloco Principal a partir dos campos antigos (series, repeticoes, descanso_seg).
export function blocosDoExercicio(it) {
  const b = [...(it.blocos || [])].sort((x, y) => x.ordem - y.ordem)
  if (b.length) return b.map(x => ({ ...x, categorias_serie: x.categorias_serie || PRINCIPAL_PADRAO }))
  return [{
    id: null, categoria_id: null, ordem: 0, series: it.series, repeticoes: it.repeticoes,
    carga: null, descanso_seg: it.descanso_seg, observacao: null, categorias_serie: PRINCIPAL_PADRAO,
  }]
}

// Lista de séries a executar, com numeração contínua dentro do exercício (1, 2, 3...).
export function expandir(blocos) {
  const slots = []
  let n = 0
  blocos.forEach(b => {
    for (let k = 1; k <= b.series; k++) { n++; slots.push({ numero: n, k, bloco: b }) }
  })
  return slots
}

export const chaveUltimo = (exercicioId, categoriaId) => `${exercicioId}:${categoriaId == null ? 'p' : categoriaId}`

export function resumo(blocos) {
  const p = blocos.find(b => b.categorias_serie && b.categorias_serie.principal) || blocos[0]
  const extras = blocos.length - 1
  return `${p.series} ${p.series === 1 ? 'série' : 'séries'} de ${p.repeticoes || '–'}` +
    (extras > 0 ? `, mais ${extras} ${extras === 1 ? 'tipo de série' : 'tipos de série'}` : '')
}
