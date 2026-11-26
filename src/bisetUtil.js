// Bi-set: dois exercícios do mesmo treino feitos em sequência, sem descanso entre eles.
// No banco, os dois têm o mesmo valor em biset_grupo (treino_exercicios e modelo_itens). Nulo = exercício simples.
// Funções puras, usadas pelo editor de treinos, pelos modelos e pela execução da aluna.

export function novoGrupo() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // reserva para navegadores antigos: formato UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// Agrupa a lista (já em ordem) em unidades: um exercício simples ou um bi-set (dois vizinhos com o mesmo grupo).
// Um grupo que não forma exatamente um par de vizinhos é tratado como exercícios simples, para nunca quebrar a tela.
export function unidades(itens, campo = 'biset_grupo') {
  const lista = itens || []
  const contagem = {}
  lista.forEach(x => { const g = x[campo]; if (g) contagem[g] = (contagem[g] || 0) + 1 })
  const out = []
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i], b = lista[i + 1]
    const g = a[campo]
    if (g && contagem[g] === 2 && b && b[campo] === g) {
      out.push({ tipo: 'biset', grupo: g, itens: [a, b], inicio: i })
      i++
    } else {
      out.push({ tipo: 'simples', grupo: null, itens: [a], inicio: i })
    }
  }
  return out
}

// Move a unidade (simples ou bi-set inteiro) que contém o item de índice i para cima (d = -1) ou para baixo (d = 1).
// Devolve a nova lista de itens; fora dos limites devolve a mesma lista.
export function moverUnidade(itens, i, d, campo = 'biset_grupo') {
  const us = unidades(itens, campo)
  const u = us.findIndex(x => i >= x.inicio && i < x.inicio + x.itens.length)
  const k = u + d
  if (u < 0 || k < 0 || k >= us.length) return itens
  const arr = [...us]; [arr[u], arr[k]] = [arr[k], arr[u]]
  return arr.flatMap(x => x.itens)
}

// Pode formar bi-set com o próximo? Os dois precisam existir e ainda não estar em um bi-set.
export function podeFazerBiset(itens, i, campo = 'biset_grupo') {
  const a = itens[i], b = itens[i + 1]
  return !!(a && b && !a[campo] && !b[campo])
}

// Ao copiar exercícios (duplicar treino, inserir modelo), cada par recebe um grupo NOVO,
// para nunca se misturar com um par que já exista no treino de destino.
export function remapearGrupos(linhas, campo = 'biset_grupo') {
  const mapa = {}
  return linhas.map(l => {
    const g = l[campo]
    if (!g) return { ...l, [campo]: null }
    if (!mapa[g]) mapa[g] = novoGrupo()
    return { ...l, [campo]: mapa[g] }
  })
}

// Rodadas da execução: a série 1 do primeiro exercício com a série 1 do segundo, e assim por diante.
// Se um exercício tiver mais séries que o outro, as rodadas finais têm só um deles.
export function rodadas(slotsA, slotsB) {
  const n = Math.max(slotsA.length, slotsB.length)
  return Array.from({ length: n }, (_, i) => ({ i, a: slotsA[i] || null, b: slotsB[i] || null }))
}

// Descanso depois da rodada: o do segundo exercício (o primeiro não tem intervalo); se ele não tiver, o do primeiro.
export function descansoDaRodada(r) {
  const db = r.b && r.b.bloco ? r.b.bloco.descanso_seg : null
  const da = r.a && r.a.bloco ? r.a.bloco.descanso_seg : null
  return db || da || null
}
