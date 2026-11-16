// Funções puras da seção Alongamentos e Flexibilidade.
export const hojeLocal = (d = new Date()) => d.toLocaleDateString('sv-SE')      // AAAA-MM-DD no fuso do aparelho
export const chaveFeito = (sequenciaId, alongamentoId) => `${sequenciaId}:${alongamentoId}`

// Itens da sequência em ordem, com a quantidade já marcada como concluída hoje.
export function progresso(itens, feitos, sequenciaId) {
  const ord = [...(itens || [])].sort((a, b) => a.ordem - b.ordem)
  const feitosN = ord.filter(i => feitos[chaveFeito(sequenciaId, i.alongamento_id)]).length
  return { itens: ord, feitos: feitosN, total: ord.length, completa: ord.length > 0 && feitosN === ord.length }
}

// Troca um item de posição e devolve a lista renumerada (0, 1, 2...).
export function mover(lista, i, d) {
  const j = i + d
  if (j < 0 || j >= lista.length) return lista
  const arr = [...lista]; [arr[i], arr[j]] = [arr[j], arr[i]]
  return arr
}

// Última data em que cada aluna fez algo da sequência, a partir de registros já ordenados do mais novo ao mais antigo.
export function ultimasDatas(registros) {
  const m = {}
  registros.forEach(r => { if (r.concluido && !m[r.aluna_id]) m[r.aluna_id] = r.data })
  return m
}
