// Regras do painel inicial do administrador. Só funções puras (sem acesso ao banco), para ficarem testáveis.
// Tudo aqui trabalha com dados reais lidos do banco; nada é inventado.

// A ficha não tem campo de validade. O lembrete usa a idade da ficha ativa (data em que ela foi criada).
// Ajuste os dois números conforme o seu ciclo de reavaliação.
export const FICHA_AVISO_DIAS = 35     // "em breve": a ficha está perto de completar o ciclo
export const FICHA_ATRASO_DIAS = 42    // "atualizar": a ficha passou do ciclo
export const JANELA_CONCLUIDOS_DIAS = 7

const MS_DIA = 86400000
const chaveDia = d => new Date(d).toLocaleDateString('sv-SE')

export const primeiroNome = n => (n || '').trim().split(/\s+/)[0] || ''

// "hoje, 14:32" · "ontem, 09:10" · "qua, 18:05" · "12/11, 07:40"
export function rotuloQuando(iso, agora = new Date()) {
  const d = new Date(iso)
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const dias = Math.round((new Date(chaveDia(agora)) - new Date(chaveDia(d))) / MS_DIA)
  if (dias <= 0) return `hoje, ${hora}`
  if (dias === 1) return `ontem, ${hora}`
  if (dias < 7) return `${d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}, ${hora}`
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${hora}`
}

export function fmtDuracaoMin(seg) {
  if (seg == null) return null
  const m = Math.max(1, Math.round(seg / 60))
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`
}

// Uma notificação por aluna, por dia e por tipo (treino ou aeróbico): vários treinos no mesmo dia viram uma só linha.
// sessoes: [{ id, aluna_id, treino_nome, finalizada_em, cansaco }]   aero: [{ id, aluna_id, modalidade, finalizada_em, duracao_seg, pse }]
// nomes: { aluna_id: { nome, ativa, avatar_url } }
export function agruparConcluidos(sessoes, aero, nomes) {
  const mapa = new Map()
  const juntar = (tipo, r, detalhe) => {
    const a = nomes[r.aluna_id]
    if (!a || !r.finalizada_em) return
    const chave = `${tipo}|${r.aluna_id}|${chaveDia(r.finalizada_em)}`
    const g = mapa.get(chave) || { chave, tipo, alunaId: r.aluna_id, nome: a.nome, avatar: a.avatar_url || null, ativa: a.ativa, quando: r.finalizada_em, detalhes: [] }
    if (new Date(r.finalizada_em) > new Date(g.quando)) g.quando = r.finalizada_em
    if (detalhe && !g.detalhes.includes(detalhe)) g.detalhes.push(detalhe)
    g.n = (g.n || 0) + 1
    mapa.set(chave, g)
  }
  ;(sessoes || []).forEach(s => juntar('treino', s, s.treino_nome))
  ;(aero || []).forEach(r => {
    const partes = [r.modalidade, fmtDuracaoMin(r.duracao_seg), r.pse != null ? `PSE ${r.pse}` : null].filter(Boolean)
    juntar('aerobico', r, partes.join(' · '))
  })
  return [...mapa.values()].sort((x, y) => new Date(y.quando) - new Date(x.quando))
}

// "Novo": ainda não visto neste navegador, ou com atividade mais recente do que a que já foi vista.
export const ehNovo = (item, vistos) => !vistos[item.chave] || new Date(item.quando) > new Date(vistos[item.chave])

// Guarda só o que ainda aparece na lista (para o registro não crescer sem limite).
export function marcarVistos(itens, vistos, chaves) {
  const novo = {}
  itens.forEach(i => { if (vistos[i.chave]) novo[i.chave] = vistos[i.chave] })
  itens.filter(i => !chaves || chaves.includes(i.chave)).forEach(i => { novo[i.chave] = i.quando })
  return novo
}

// Lembretes sobre fichas:
//   sem-ficha : aluna ativa sem ficha ativa
//   atrasada  : ficha ativa com idade >= FICHA_ATRASO_DIAS
//   em-breve  : ficha ativa com idade entre FICHA_AVISO_DIAS e FICHA_ATRASO_DIAS
// Alunas desativadas nunca geram lembrete.
export function lembretesFichas(alunas, fichasAtivas, agora = new Date()) {
  const porAluna = Object.fromEntries((fichasAtivas || []).map(f => [f.aluna_id, f]))
  const out = []
  ;(alunas || []).filter(a => a.ativa).forEach(a => {
    const f = porAluna[a.id]
    if (!f) { out.push({ chave: `sem|${a.id}`, nivel: 'sem-ficha', alunaId: a.id, nome: a.nome, avatar: a.avatar_url || null, dias: null, ficha: null, ordem: 0 }); return }
    const dias = Math.floor((agora - new Date(f.criado_em)) / MS_DIA)
    if (dias >= FICHA_ATRASO_DIAS) out.push({ chave: `ficha|${f.id}`, nivel: 'atrasada', alunaId: a.id, nome: a.nome, avatar: a.avatar_url || null, dias, ficha: f.nome, ordem: 1 })
    else if (dias >= FICHA_AVISO_DIAS) out.push({ chave: `ficha|${f.id}`, nivel: 'em-breve', alunaId: a.id, nome: a.nome, avatar: a.avatar_url || null, dias, ficha: f.nome, ordem: 2 })
  })
  return out.sort((x, y) => x.ordem - y.ordem || (y.dias ?? 0) - (x.dias ?? 0) || x.nome.localeCompare(y.nome, 'pt-BR'))
}

export function resumoAlunas(alunas) {
  const l = alunas || []
  return { ativas: l.filter(a => a.ativa).length, inativas: l.filter(a => !a.ativa).length }
}

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`
