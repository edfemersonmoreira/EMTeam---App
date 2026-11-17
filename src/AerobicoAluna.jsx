import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import Icone from './Icone'
import { hojeLocal } from './alongUtil'
import { PSE_ROTULOS, rotuloPse, fmtRelogio, fmtDuracao, decorrido, pausar, retomar, finalizar, ativo, pendente } from './aerobicoUtil'
import './aerobico.css'

// Aeróbico: seção da aluna, separada da musculação. Usa só as tabelas de aeróbico.
// O cronômetro é calculado a partir dos horários guardados no banco, então continua certo
// com o app minimizado, em outra tela ou até em outro aparelho.
export default function AerobicoAluna({ perfil, onVoltar }) {
  const [presc, setPresc] = useState(null)
  const [regs, setRegs] = useState([])
  const [aba, setAba] = useState('hoje')
  const [agora, setAgora] = useState(Date.now())
  const [form, setForm] = useState({ pse: null, modalidade: '', obs: '' })
  const [msg, setMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const offset = useRef(0)                       // diferença entre a hora do servidor e a do celular
  const agoraMs = () => Date.now() + offset.current

  async function carregar() {
    const [p, r] = await Promise.all([
      supabase.from('aerobico_prescricoes').select('*').eq('aluna_id', perfil.id).eq('ativa', true).order('ordem').order('criado_em'),
      supabase.from('aerobico_registros').select('*').eq('aluna_id', perfil.id).order('iniciada_em', { ascending: false }).limit(60),
    ])
    if (p.error) return setMsg(p.error.message)
    setPresc(p.data); setRegs(r.data || [])
  }

  useEffect(() => {
    (async () => {
      const t0 = Date.now()
      const s = await supabase.rpc('agora')
      const t1 = Date.now()
      if (!s.error && s.data) offset.current = Date.parse(s.data) - (t0 + t1) / 2
      setAgora(agoraMs())
      carregar()
    })()
  }, [])

  // Relógio: recalcula sempre a partir dos horários guardados; ao voltar para o app, atualiza na hora
  useEffect(() => {
    const atualizar = () => setAgora(agoraMs())
    const t = setInterval(atualizar, 500)
    document.addEventListener('visibilitychange', atualizar)
    window.addEventListener('focus', atualizar)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', atualizar); window.removeEventListener('focus', atualizar) }
  }, [])

  async function atualizar(reg, patch) {
    const { data, error } = await supabase.from('aerobico_registros').update(patch).eq('id', reg.id).select().single()
    if (error) { setMsg(error.message); return null }
    setRegs(rs => rs.map(x => (x.id === reg.id ? data : x))); setMsg('')
    return data
  }

  async function iniciar(p) {
    const { data, error } = await supabase.from('aerobico_registros').insert({
      aluna_id: perfil.id, prescricao_id: p.id, modalidade: p.modalidade,
      tempo_previsto_min: p.tempo_previsto_min, pse_desejada: p.pse_desejada,
      status: 'em_andamento', iniciada_em: new Date(agoraMs()).toISOString(), data: hojeLocal(),
    }).select().single()
    if (error) {
      if (error.code === '23505') { setMsg('Você já tem uma atividade em andamento.'); return carregar() }
      return setMsg(error.message)
    }
    setRegs(rs => [data, ...rs]); setForm({ pse: null, modalidade: p.modalidade, obs: '' }); setMsg('')
  }

  const alternarPausa = reg => atualizar(reg, reg.status === 'pausada' ? retomar(reg, agoraMs()) : pausar(reg, agoraMs()))

  async function terminar(reg) {
    if (!window.confirm('Finalizar a atividade agora?')) return
    const r = await atualizar(reg, finalizar(reg, agoraMs()))
    if (r) setForm({ pse: null, modalidade: reg.modalidade, obs: '' })
  }

  async function salvarFinal(reg, e) {
    e.preventDefault()
    if (form.pse == null) return setMsg('Escolha a sua PSE, de 0 a 10.')
    setSalvando(true)
    await atualizar(reg, { pse: form.pse, modalidade: (form.modalidade || reg.modalidade).trim(), observacoes: form.obs.trim() || null })
    setSalvando(false); setAba('historico')
  }

  async function descartar(reg) {
    if (!window.confirm('Descartar esta atividade? Ela não será salva.')) return
    const { error } = await supabase.from('aerobico_registros').delete().eq('id', reg.id)
    if (error) return setMsg(error.message)
    setRegs(rs => rs.filter(x => x.id !== reg.id)); setMsg('')
  }

  if (!presc) {
    return (
      <>
        <button className="btn sec" onClick={onVoltar}>← Voltar</button>
        {msg ? <p className="erro">{msg}</p> : <p className="muted">Carregando…</p>}
      </>
    )
  }

  const atual = regs.find(ativo) || regs.find(pendente) || null
  const prescAtual = atual ? presc.find(p => p.id === atual.prescricao_id) : null
  const cab = (
    <div className="topo-exec">
      <button className="icone-btn" onClick={onVoltar} aria-label="Voltar"><Icone nome="voltar" /></button>
      <div className="grow"><h2 style={{ margin: 0 }}>Aeróbico</h2><div className="muted">Separado do treino de musculação</div></div>
    </div>
  )

  // 1) Atividade em andamento ou pausada: cronômetro
  if (atual && ativo(atual)) {
    const seg = decorrido(atual, agora)
    const prev = atual.tempo_previsto_min ? atual.tempo_previsto_min * 60 : 0
    const pct = prev ? Math.min(100, (seg / prev) * 100) : 0
    return (
      <>
        {cab}
        <div className="bloco aero-timer">
          <div className="data">{atual.status === 'pausada' ? 'Pausado' : 'Em andamento'}</div>
          <div className="relogio" role="timer" aria-live="off">{fmtRelogio(seg)}</div>
          <div className="data">{atual.modalidade}{prev ? `, previsto ${atual.tempo_previsto_min} min` : ''}</div>
          {prev > 0 && <div className="barra aero-barra"><span style={{ width: `${pct}%` }} /></div>}
          <div className="aero-acoes">
            <button className="btn" onClick={() => alternarPausa(atual)}>{atual.status === 'pausada' ? 'Retomar' : 'Pausar'}</button>
            <button className="btn" onClick={() => terminar(atual)}>Finalizar</button>
          </div>
        </div>
        {msg && <p className="erro">{msg}</p>}
        {prescAtual && (prescAtual.orientacoes || prescAtual.intensidade || prescAtual.pse_desejada != null) && (
          <div className="card">
            <strong>Prescrição</strong>
            {prescAtual.pse_desejada != null && <p style={{ margin: '6px 0' }}>PSE desejada: {prescAtual.pse_desejada} ({rotuloPse(prescAtual.pse_desejada).toLowerCase()})</p>}
            {prescAtual.intensidade && <p style={{ margin: '6px 0' }}>Intensidade: {prescAtual.intensidade}</p>}
            {prescAtual.orientacoes && <p className="orient" style={{ margin: '6px 0 0' }}>{prescAtual.orientacoes}</p>}
          </div>
        )}
        <button className="link-texto" onClick={() => descartar(atual)}>Descartar esta atividade</button>
      </>
    )
  }

  // 2) Atividade finalizada, falta informar a PSE
  if (atual && pendente(atual)) {
    return (
      <>
        {cab}
        <form className="card" onSubmit={e => salvarFinal(atual, e)}>
          <h3 style={{ marginTop: 0 }}>Atividade finalizada</h3>
          <p className="muted">{atual.modalidade}, {fmtDuracao(atual.duracao_seg)}</p>
          <p><strong>Como foi o esforço?</strong> Escolha a sua PSE, de 0 (repouso) a 10 (esforço máximo).</p>
          <div className="pse-grid">
            {PSE_ROTULOS.map((_, n) => (
              <button type="button" key={n} className={form.pse === n ? 'on' : ''} aria-pressed={form.pse === n} onClick={() => setForm({ ...form, pse: n })}>{n}</button>
            ))}
          </div>
          <div className="pse-rotulo">{form.pse == null ? 'Toque em um número' : `${form.pse}: ${rotuloPse(form.pse)}`}</div>
          <input placeholder="Modalidade realizada" value={form.modalidade || atual.modalidade} onChange={e => setForm({ ...form, modalidade: e.target.value })} />
          <textarea rows="3" placeholder="Observações (opcional)" value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} />
          {msg && <p className="erro">{msg}</p>}
          <button className="btn" style={{ width: '100%', marginTop: 8 }} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar atividade'}</button>
        </form>
        <button className="link-texto" onClick={() => descartar(atual)}>Descartar esta atividade</button>
      </>
    )
  }

  // 3) Sem atividade em curso: prescrição e histórico
  const feitos = regs.filter(r => r.status === 'finalizada' && r.pse != null)
  return (
    <>
      {cab}
      <div className="chips">
        <button className={aba === 'hoje' ? 'on' : ''} onClick={() => setAba('hoje')}>Prescrição</button>
        <button className={aba === 'historico' ? 'on' : ''} onClick={() => setAba('historico')}>Histórico</button>
      </div>
      {msg && <p className="erro">{msg}</p>}

      {aba === 'hoje' && (
        <>
          {presc.length === 0 && <p className="muted">Você ainda não tem aeróbico prescrito. Fale com o seu treinador.</p>}
          {presc.map(p => (
            <div key={p.id} className="card">
              <h3 style={{ margin: '0 0 4px' }}>{p.modalidade}</h3>
              <div className="muted">
                {[p.tempo_previsto_min ? `${p.tempo_previsto_min} min` : null, p.pse_desejada != null ? `PSE ${p.pse_desejada}, ${rotuloPse(p.pse_desejada).toLowerCase()}` : null].filter(Boolean).join(', ') || 'Sem tempo definido'}
              </div>
              {p.intensidade && <p style={{ margin: '8px 0 0' }}>Intensidade: {p.intensidade}</p>}
              {p.orientacoes && <p className="orient" style={{ margin: '8px 0 0' }}>{p.orientacoes}</p>}
              <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={() => iniciar(p)}><Icone nome="play" tam={18} />Iniciar cronômetro</button>
            </div>
          ))}
        </>
      )}

      {aba === 'historico' && (
        <>
          {feitos.length === 0 && <p className="muted">Nenhuma atividade aeróbica registrada ainda.</p>}
          {feitos.map(r => (
            <div key={r.id} className="card">
              <div className="topo">
                <strong>{r.modalidade}</strong>
                <span className="muted">{new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="muted">{fmtDuracao(r.duracao_seg)}, PSE {r.pse} ({rotuloPse(r.pse).toLowerCase()})</div>
              {r.observacoes && <p className="orient" style={{ margin: '8px 0 0' }}>{r.observacoes}</p>}
            </div>
          ))}
        </>
      )}
    </>
  )
}
