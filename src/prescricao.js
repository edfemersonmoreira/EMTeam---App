import { supabase } from './supabase'

// Insere exercícios em um treino, cada um com seus tipos de série (blocos). Sempre cria cópias novas:
// nada aqui altera modelos, outros treinos ou o histórico de cargas.
// linhas: [{ exercicio_id, series, repeticoes, descanso_seg, observacao, blocos? }]
// Devolve o erro (ou null).
export async function inserirExercicios(treinoId, base, linhas, cats) {
  const principal = cats.find(c => c.principal)
  const existentes = new Set(cats.map(c => c.id))
  const criados = []   // só os exercícios criados nesta chamada; em caso de erro eles (e só eles) são removidos
  const desfazer = async erro => { if (criados.length) await supabase.from('treino_exercicios').delete().in('id', criados); return erro }
  for (let k = 0; k < linhas.length; k++) {
    const l = linhas[k]
    const { data, error } = await supabase.from('treino_exercicios').insert({
      treino_id: treinoId, exercicio_id: l.exercicio_id, ordem: base + k,
      series: l.series || 3, repeticoes: l.repeticoes || '10', descanso_seg: l.descanso_seg ?? null, observacao: l.observacao ?? null,
    }).select('id').single()
    if (error) return desfazer(error)
    criados.push(data.id)
    if (cats.length) {
      const origem = (l.blocos && l.blocos.length) ? l.blocos
        : [{ series: l.series || 3, repeticoes: l.repeticoes || '10', descanso_seg: l.descanso_seg ?? null }]
      const blocos = origem.map((b, j) => ({
        treino_exercicio_id: data.id,
        categoria_id: b.categoria_id && existentes.has(b.categoria_id) ? b.categoria_id : (principal ? principal.id : null),
        ordem: j, series: b.series || 1, repeticoes: b.repeticoes || null, carga: b.carga || null,
        descanso_seg: b.descanso_seg ?? null, observacao: b.observacao || null,
      }))
      const r2 = await supabase.from('treino_exercicio_series').insert(blocos)
      if (r2.error) return desfazer(r2.error)
    }
  }
  return null
}

// Converte os itens de um modelo (modelo_itens) em linhas para inserirExercicios.
export const linhasDoModelo = itens => itens.map(x => ({
  exercicio_id: x.exercicio_id, series: x.series, repeticoes: x.repeticoes,
  descanso_seg: x.descanso_seg, observacao: x.observacao, blocos: Array.isArray(x.blocos) ? x.blocos : [],
}))
