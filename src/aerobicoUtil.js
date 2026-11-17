// Funções puras do Aeróbico. O cronômetro é sempre calculado a partir de horários guardados
// (início, pausa e pausa acumulada), nunca de um contador que depende da tela aberta.
export const PSE_ROTULOS = [
  'Repouso total', 'Muito leve', 'Leve', 'Moderado', 'Um pouco intenso', 'Intenso',
  'Bem intenso', 'Muito intenso', 'Muito, muito intenso', 'Quase máximo', 'Máximo',
]
export const rotuloPse = n => (n == null ? '' : (PSE_ROTULOS[n] || ''))

export const ativo = r => r.status === 'em_andamento' || r.status === 'pausada'
export const pendente = r => r.status === 'finalizada' && r.pse == null

const iso = ms => new Date(ms).toISOString()

// Segundos de atividade até agora (descontando as pausas).
export function decorrido(r, agoraMs) {
  if (r.status === 'finalizada') return r.duracao_seg ?? 0
  const ini = Date.parse(r.iniciada_em)
  const fim = r.status === 'pausada' && r.pausada_em ? Date.parse(r.pausada_em) : agoraMs
  return Math.max(0, Math.floor((fim - ini) / 1000) - (r.pausa_acumulada_seg || 0))
}

export const pausar = (r, agoraMs) => ({ status: 'pausada', pausada_em: iso(agoraMs) })

export function retomar(r, agoraMs) {
  const pausa = r.pausada_em ? Math.max(0, Math.round((agoraMs - Date.parse(r.pausada_em)) / 1000)) : 0
  return { status: 'em_andamento', pausada_em: null, pausa_acumulada_seg: (r.pausa_acumulada_seg || 0) + pausa }
}

export function finalizar(r, agoraMs) {
  const duracao = decorrido(r, agoraMs)
  const pausaFinal = r.status === 'pausada' && r.pausada_em
    ? (r.pausa_acumulada_seg || 0) + Math.max(0, Math.round((agoraMs - Date.parse(r.pausada_em)) / 1000))
    : (r.pausa_acumulada_seg || 0)
  return { status: 'finalizada', finalizada_em: iso(agoraMs), duracao_seg: duracao, pausada_em: null, pausa_acumulada_seg: pausaFinal }
}

const dois = n => String(n).padStart(2, '0')
export function fmtRelogio(seg) {
  const s = Math.max(0, Math.floor(seg))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  return h > 0 ? `${h}:${dois(m)}:${dois(x)}` : `${dois(m)}:${dois(x)}`
}
export function fmtDuracao(seg) {
  const s = Math.max(0, Math.round(seg || 0))
  if (s < 60) return `${s} s`
  const m = Math.round(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)} h ${dois(m % 60)} min` : `${m} min`
}
