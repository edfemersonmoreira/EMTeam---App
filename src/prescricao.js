import { supabase } from './supabase'
import { remapearGrupos } from './bisetUtil'

// Insere exercícios em um treino, cada um com seus tipos de série (blocos). Sempre cria cópias novas:
// nada aqui altera modelos, outros treinos ou o histórico de cargas.
// linhas: [{ exercicio_id, series, repeticoes, descanso_seg, observacao, blocos?, biset_grupo?, orientacoes? }]
//   biset_grupo: os pares de bi-set recebem um grupo novo nesta inserção (nunca se misturam com pares do treino).
//   orientacoes: texto próprio do exercício neste treino. Quando a linha não traz a chave (exercício vindo da
//   biblioteca ou de um modelo antigo), copia as orientações cadastradas na biblioteca; sem orientações, fica vazio.
// Devolve o erro (ou null).
export async function inserirExercicios(treinoId, base, linhasOriginais, cats) {
  const linhas = remapearGrupos(linhasOriginais)
  const faltam = [...new Set(linhas.filter(l => l.orientacoes === undefined).map(l => l.exercicio_id))]
  const daBiblioteca = {}
  if (faltam.length) {
    const { data, error } = await supabase.from('exercicios').select('id, orientacoes').in('id', faltam)
    if (error) return error
    ;(data || []).forEach(e => { daBiblioteca[e.id] = e.orientacoes || '' })
  }
  const principal = cats.find(c => c.principal)
  const existentes = new Set(cats.map(c => c.id))
  const criados = []   // só os exercícios criados nesta chamada; em caso de erro eles (e só eles) são removidos
  const desfazer = async erro => { if (criados.length) await supabase.from('treino_exercicios').delete().in('id', criados); return erro }
  for (let k = 0; k < linhas.length; k++) {
    const l = linhas[k]
    const { data, error } = await supabase.from('treino_exercicios').insert({
      treino_id: treinoId, exercicio_id: l.exercicio_id, ordem: base + k,
      series: l.series || 3, repeticoes: l.repeticoes || '10', descanso_seg: l.descanso_seg ?? null, observacao: l.observacao ?? null,
      biset_grupo: l.biset_grupo || null,
      // Classificação muscular da prescrição: copiada quando a origem tem; nunca preenchida automaticamente
      grupo_principal: l.grupo_principal || null, grupos_secundarios: l.grupos_secundarios || null,
      orientacoes: l.orientacoes === undefined ? (daBiblioteca[l.exercicio_id] ?? '') : l.orientacoes,
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
// Item de modelo sem orientações próprias (modelo antigo) recebe as da biblioteca ao entrar no treino.
export const linhasDoModelo = itens => itens.map(x => ({
  exercicio_id: x.exercicio_id, series: x.series, repeticoes: x.repeticoes,
  descanso_seg: x.descanso_seg, observacao: x.observacao, blocos: Array.isArray(x.blocos) ? x.blocos : [],
  biset_grupo: x.biset_grupo || null,
  grupo_principal: x.grupo_principal || null, grupos_secundarios: x.grupos_secundarios || null,
  ...(x.orientacoes == null ? {} : { orientacoes: x.orientacoes }),
}))
