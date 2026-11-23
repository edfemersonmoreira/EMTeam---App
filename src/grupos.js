// Grupos musculares de um exercício.
// Um exercício pode ter mais de um grupo. Eles ficam no mesmo campo de texto que já existia (exercicios.grupo_muscular),
// separados por vírgula: "Quadríceps, Glúteos". Sem mudança no banco: um exercício com um grupo só continua
// exatamente como estava ("Costas"), e a busca por texto segue funcionando.

export const GRUPOS = [
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraço', 'Abdômen', 'Lombar', 'Trapézio',
  'Quadríceps', 'Posterior de coxa', 'Glúteos', 'Adutores', 'Abdutores', 'Panturrilha', 'Cardio', 'Corpo inteiro',
]

// Texto do banco -> lista de grupos (sem repetidos, sem espaços sobrando)
export function lerGrupos(texto) {
  if (!texto) return []
  return [...new Set(String(texto).split(',').map(g => g.trim()).filter(Boolean))]
}

// Lista de grupos -> texto para o banco, na ordem da lista padrão (grupos fora dela vão ao fim). Vazio vira null.
export function juntarGrupos(lista) {
  const unicos = [...new Set(lista)]
  const ordenados = [...GRUPOS.filter(g => unicos.includes(g)), ...unicos.filter(g => !GRUPOS.includes(g))]
  return ordenados.length ? ordenados.join(', ') : null
}

// Liga ou desliga um grupo no texto atual
export const alternarGrupo = (texto, grupo) => {
  const atuais = lerGrupos(texto)
  return juntarGrupos(atuais.includes(grupo) ? atuais.filter(g => g !== grupo) : [...atuais, grupo])
}
