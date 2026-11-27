// "Destaque do treino": evoluções reais em relação à execução anterior do MESMO treino.
// Só usa séries PRINCIPAIS e CONCLUÍDAS (aquecimento, reconhecimento, dropset e os demais tipos ficam de fora).
// Nada é estimado: série sem repetições não entra; exercício que não aparece nas duas sessões não é comparado.
//
// Para cada exercício presente nas duas sessões:
//  1. Melhor série = maior carga (desempate: mais repetições).
//  2. Carga: a melhor série de agora tem carga maior que a de antes        -> "aumentou a carga"
//  3. Repetições: mesma carga na melhor série e mais repetições nela       -> "mais repetições"
//     (sem carga nas duas sessões, ex.: peso do corpo: compara só as repetições da melhor série)
//  4. Volume: só quando o número de séries principais é o MESMO nas duas sessões
//     (assim fazer mais séries não vira "evolução"); carga × repetições somados, ou repetições somadas sem carga.
// Uma sessão com carga e outra sem carga no mesmo exercício não é comparada (não dá para comparar com segurança).

const num = v => (v === null || v === undefined || v === '' ? null : Number(v))

function seriesValidas(regs) {
  return (regs || [])
    .filter(r => r.concluida === true)
    .map(r => ({ carga: num(r.carga_kg), reps: num(r.repeticoes) }))
    .filter(s => s.reps !== null && Number.isFinite(s.reps) && s.reps > 0)
    .map(s => ({ carga: s.carga !== null && Number.isFinite(s.carga) && s.carga > 0 ? s.carga : 0, reps: s.reps }))
}
const melhor = ss => [...ss].sort((a, b) => b.carga - a.carga || b.reps - a.reps)[0]
const PESO = { carga: 3, reps: 2, volume: 1 }

export function compararExercicio(atual, anterior) {
  const A = seriesValidas(atual), B = seriesValidas(anterior)
  if (!A.length || !B.length) return null
  const comCargaA = A.some(s => s.carga > 0), comCargaB = B.some(s => s.carga > 0)
  if (comCargaA !== comCargaB) return null
  const a = melhor(A), b = melhor(B)
  if (comCargaA) {
    if (a.carga > b.carga) return { tipo: 'carga', antes: b, agora: a, ganho: (a.carga - b.carga) / b.carga }
    if (a.carga === b.carga && a.reps > b.reps) return { tipo: 'reps', antes: b, agora: a, ganho: (a.reps - b.reps) / b.reps }
    if (A.length === B.length && A.every(s => s.carga > 0) && B.every(s => s.carga > 0)) {
      const va = A.reduce((t, s) => t + s.carga * s.reps, 0), vb = B.reduce((t, s) => t + s.carga * s.reps, 0)
      if (va > vb) return { tipo: 'volume', antes: { volume: vb, series: B.length }, agora: { volume: va, series: A.length }, ganho: (va - vb) / vb, comCarga: true }
    }
    return null
  }
  if (a.reps > b.reps) return { tipo: 'reps', antes: b, agora: a, ganho: (a.reps - b.reps) / b.reps }
  if (A.length === B.length) {
    const ra = A.reduce((t, s) => t + s.reps, 0), rb = B.reduce((t, s) => t + s.reps, 0)
    if (ra > rb) return { tipo: 'volume', antes: { volume: rb, series: B.length }, agora: { volume: ra, series: A.length }, ganho: (ra - rb) / rb, comCarga: false }
  }
  return null
}

// atual / anterior: registros principais das duas sessões ({ exercicio_id, carga_kg, repeticoes, concluida })
// nomes: { [exercicio_id]: nome }. Devolve as evoluções, a mais relevante primeiro (carga > repetições > volume).
export function calcularDestaques(atual, anterior, nomes) {
  const porEx = regs => (regs || []).reduce((m, r) => { (m[r.exercicio_id] || (m[r.exercicio_id] = [])).push(r); return m }, {})
  const A = porEx(atual), B = porEx(anterior)
  return Object.keys(A)
    .filter(id => B[id])
    .map(id => { const c = compararExercicio(A[id], B[id]); return c && { ...c, exercicio_id: id, nome: nomes[id] || 'exercício' } })
    .filter(Boolean)
    .sort((x, y) => PESO[y.tipo] - PESO[x.tipo] || y.ganho - x.ganho)
}
