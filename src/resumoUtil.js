// Resumo de uma sessão de musculação, calculado só a partir do que a aluna registrou.
// Entra no cálculo apenas o que vem de registros_principais (séries do tipo marcado como Principal)
// e que está CONCLUÍDO. Aquecimento, reconhecimento, dropset e os demais tipos ficam de fora.
// Nada é estimado: série sem carga não entra no volume; série sem repetições não entra nas repetições.
import { lerGrupos } from './grupos'

export const SEM_GRUPO = 'Sem grupamento cadastrado'

const numero = v => (v === null || v === undefined || v === '' ? null : Number(v))

// registros: linhas de registros_principais da sessão ({ exercicio_id, carga_kg, repeticoes, concluida })
// exercicios: { [id]: { nome, grupo_muscular } }
export function calcularResumo(registros, exercicios) {
  const feitas = (registros || []).filter(r => r.concluida === true)
  let repeticoes = 0, tonelagem = 0, semReps = 0, semCarga = 0
  const exerciciosFeitos = new Set()
  const porGrupo = {}
  let compartilhado = false

  feitas.forEach(r => {
    exerciciosFeitos.add(r.exercicio_id)
    const reps = numero(r.repeticoes)
    const carga = numero(r.carga_kg)
    const repsValidas = reps !== null && Number.isFinite(reps) && reps >= 0
    if (repsValidas) repeticoes += reps; else semReps++
    // Volume (tonelagem): só com carga externa registrada (> 0) E repetições registradas (> 0)
    if (carga !== null && Number.isFinite(carga) && carga > 0 && repsValidas && reps > 0) tonelagem += carga * reps
    else semCarga++

    // Séries por grupamento: a série conta 1 para cada grupamento cadastrado no exercício
    // (ex.: Quadríceps e Glúteos = 1 série para cada). O total de séries principais continua contando a série uma vez só.
    const ex = exercicios[r.exercicio_id]
    const grupos = lerGrupos(ex && ex.grupo_muscular)
    const lista = grupos.length ? grupos : [SEM_GRUPO]
    if (lista.length > 1) compartilhado = true
    lista.forEach(g => { porGrupo[g] = (porGrupo[g] || 0) + 1 })
  })

  const grupos = Object.entries(porGrupo)
    .map(([grupo, series]) => ({ grupo, series: Math.round(series * 100) / 100 }))
    .sort((a, b) => (a.grupo === SEM_GRUPO) - (b.grupo === SEM_GRUPO) || b.series - a.series || a.grupo.localeCompare(b.grupo, 'pt-BR'))

  return {
    series: feitas.length,
    exercicios: exerciciosFeitos.size,
    repeticoes,
    tonelagem: Math.round(tonelagem * 100) / 100,
    semReps,          // séries principais concluídas sem repetições registradas
    semCarga,         // séries principais concluídas que não entram no volume (sem carga ou sem repetições)
    grupos,
    compartilhado,    // algum exercício com mais de um grupamento (a soma por grupamento passa do total)
  }
}

// Formatação em português: 1.160 · 4,5 · 1 h 08 min
export const fmtNumero = (n, casas = 0) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas })

export function fmtDuracaoSessao(inicio, fim) {
  if (!inicio || !fim) return null
  const min = Math.round((new Date(fim) - new Date(inicio)) / 60000)
  if (!Number.isFinite(min) || min < 0) return null
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`
}
