// Regras do painel inicial do administrador. Só funções puras (sem acesso ao banco), para ficarem testáveis.
// Tudo aqui trabalha com dados reais lidos do banco; nada é inventado.

// Validade da ficha: definida ao criar ou copiar (padrão 5 semanas) e guardada em fichas.validade_em (data).
// Fichas antigas, sem validade gravada, ficam sem lembrete até receberem uma (botão "Validade" na ficha).
export const VALIDADE_PADRAO_SEMANAS = 5
export const AVISO_ANTES_DIAS = 7      // lembrete "perto de vencer": faltam 7 dias ou menos
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

// ---- Validade da ficha (datas "só dia", no fuso do aparelho) ----
const meiaNoite = d => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const dataLocal = txt => { const [a, m, d] = String(txt).slice(0, 10).split('-').map(Number); return new Date(a, m - 1, d) }
const txtData = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Data de vencimento (AAAA-MM-DD) para uma validade em semanas, contando a partir de hoje.
export function dataValidade(semanas, hoje = new Date()) {
  const n = Math.round(Number(semanas))
  const s = Number.isFinite(n) && n >= 1 ? Math.min(n, 104) : VALIDADE_PADRAO_SEMANAS
  const d = meiaNoite(hoje); d.setDate(d.getDate() + s * 7)
  return txtData(d)
}

// Vencimento da ficha: só a data gravada em fichas.validade_em. Ficha sem validade gravada não gera lembrete (não inventamos prazo).
export const vencimentoDaFicha = f => (f.validade_em ? dataLocal(f.validade_em) : null)

// Dias até vencer, contando por data (fuso do aparelho): 0 = vence hoje, negativo = já venceu. Sem validade: null.
export function diasParaVencer(f, agora = new Date()) {
  const v = vencimentoDaFicha(f)
  return v ? Math.round((v - meiaNoite(agora)) / MS_DIA) : null
}
export const fmtData = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

// Lembretes sobre fichas:
//   em-breve  : ficha ATIVA que vence nos próximos AVISO_ANTES_DIAS dias (do 7º dia antes até o dia do vencimento, inclusive).
//               Some sozinho quando a validade é renovada, a ficha é substituída/desativada/arquivada ou o prazo passa.
//   sem-ficha : aluna ativa sem ficha ativa
// Uma só linha por ficha (há no máximo uma ficha ativa por aluna). Alunas desativadas nunca geram lembrete.
// Fichas vencidas não são mais "vigentes" e, por regra, não geram lembrete (MOSTRAR_VENCIDAS = true as traz de volta).
export const MOSTRAR_VENCIDAS = false
export function lembretesFichas(alunas, fichasAtivas, agora = new Date()) {
  const porAluna = Object.fromEntries((fichasAtivas || []).map(f => [f.aluna_id, f]))
  const out = []
  ;(alunas || []).filter(a => a.ativa).forEach(a => {
    const f = porAluna[a.id]
    const base = { alunaId: a.id, nome: a.nome, avatar: a.avatar_url || null }
    if (!f) { out.push({ ...base, chave: `sem|${a.id}`, nivel: 'sem-ficha', restam: null, ficha: null, vence: null, ordem: 0 }); return }
    const restam = diasParaVencer(f, agora)
    if (restam == null) return
    const vence = vencimentoDaFicha(f)
    if (restam < 0) { if (MOSTRAR_VENCIDAS) out.push({ ...base, chave: `ficha|${f.id}`, nivel: 'vencida', restam, ficha: f.nome, vence, ordem: 1 }) }
    else if (restam <= AVISO_ANTES_DIAS) out.push({ ...base, chave: `ficha|${f.id}`, nivel: 'em-breve', restam, ficha: f.nome, vence, ordem: 2 })
  })
  return out.sort((x, y) => x.ordem - y.ordem || (x.restam ?? 0) - (y.restam ?? 0) || x.nome.localeCompare(y.nome, 'pt-BR'))
}

// Fichas ativas de alunas ativas que ainda não têm validade gravada (para avisar, sem inventar prazo).
export const fichasSemValidade = (alunas, fichasAtivas) => {
  const ativas = new Set((alunas || []).filter(a => a.ativa).map(a => a.id))
  return (fichasAtivas || []).filter(f => ativas.has(f.aluna_id) && !f.validade_em).length
}

export function resumoAlunas(alunas) {
  const l = alunas || []
  return { ativas: l.filter(a => a.ativa).length, inativas: l.filter(a => !a.ativa).length }
}

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`
