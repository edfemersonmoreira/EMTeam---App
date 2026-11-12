import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { ytEmbed } from './Exercicios'
import Icone from './Icone'
import './aluna.css'

const fmtT = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const primeiroNumero = t => { const m = String(t || '').match(/\d+/); return m ? m[0] : '' }
const chave = (ex, n) => `${ex.exercicio_id}:${n}`

export default function Executar({ treino, perfil, onSair }) {
  const [itens, setItens] = useState([])
  const [sessao, setSessao] = useState(null)
  const [reg, setReg] = useState({})
  const [ultimo, setUltimo] = useState({})
  const [idx, setIdx] = useState(null)
  const [fim, setFim] = useState(null)
  const [ate, setAte] = useState(null)
  const [agora, setAgora] = useState(Date.now())
  const [carregando, setCarregando] = useState(true)
  const [msg, setMsg] = useState('')
  const [histEx, setHistEx] = useState(null)

  useEffect(() => {
    (async () => {
      const te = await supabase.from('treino_exercicios').select('*, exercicios(*)')
        .eq('treino_id', treino.id).order('ordem')
      if (te.error) { setMsg(te.error.message); return setCarregando(false) }
      setItens(te.data)

      const desde = new Date(Date.now() - 12 * 3600 * 1000).toISOString()
      const s = await supabase.from('sessoes').select('*').eq('aluna_id', perfil.id)
        .eq('treino_id', treino.id).is('finalizada_em', null).gte('iniciada_em', desde)
        .order('iniciada_em', { ascending: false }).limit(1).maybeSingle()
      let sess = s.data
      if (!sess) {
        const n = await supabase.from('sessoes')
          .insert({ aluna_id: perfil.id, treino_id: treino.id, treino_nome: treino.nome }).select().single()
        if (n.error) { setMsg(n.error.message); return setCarregando(false) }
        sess = n.data
      }
      setSessao(sess)

      const r = await supabase.from('registros_series').select('*').eq('sessao_id', sess.id)
      const m = {}
      ;(r.data || []).forEach(x => {
        m[`${x.exercicio_id}:${x.numero_serie}`] = { carga: x.carga_kg ?? '', reps: x.repeticoes ?? '', concluida: x.concluida }
      })
      setReg(m)

      const ids = te.data.map(x => x.exercicio_id)
      if (ids.length) {
        const h = await supabase.from('registros_series')
          .select('exercicio_id, carga_kg, repeticoes, registrado_em')
          .eq('aluna_id', perfil.id).in('exercicio_id', ids).eq('concluida', true)
          .neq('sessao_id', sess.id).order('registrado_em', { ascending: false }).limit(300)
        const u = {}
        ;(h.data || []).forEach(x => { if (!u[x.exercicio_id]) u[x.exercicio_id] = x })
        setUltimo(u)
      }
      setCarregando(false)
    })()
  }, [])

  useEffect(() => {
    if (!ate) return
    const id = setInterval(() => {
      const n = Date.now()
      setAgora(n)
      if (n >= ate) { setAte(null); if (navigator.vibrate) navigator.vibrate(300) }
    }, 500)
    return () => clearInterval(id)
  }, [ate])

  function valor(ex, n) {
    const r = reg[chave(ex, n)]
    if (r) return r
    const u = ultimo[ex.exercicio_id]
    return { carga: u ? (u.carga_kg ?? '') : '', reps: u ? (u.repeticoes ?? '') : '', concluida: false }
  }

  function editar(ex, n, campo, val) {
    setReg(r => ({ ...r, [chave(ex, n)]: { ...valor(ex, n), [campo]: val } }))
  }

  async function salvar(ex, n, novo = {}) {
    const atual = { ...valor(ex, n), ...novo }
    setReg(r => ({ ...r, [chave(ex, n)]: atual }))
    const c = parseFloat(String(atual.carga).replace(',', '.'))
    const rp = parseInt(atual.reps, 10)
    const { error } = await supabase.from('registros_series').upsert({
      sessao_id: sessao.id, aluna_id: perfil.id, exercicio_id: ex.exercicio_id, numero_serie: n,
      carga_kg: Number.isNaN(c) ? null : c,
      repeticoes: Number.isNaN(rp) ? null : rp,
      concluida: atual.concluida, registrado_em: new Date().toISOString(),
    }, { onConflict: 'sessao_id,exercicio_id,numero_serie' })
    setMsg(error ? error.message : '')
  }

  function alternar(ex, n, ultimaDoTreino) {
    const concl = !valor(ex, n).concluida
    salvar(ex, n, { concluida: concl })
    if (concl && ex.descanso_seg && !ultimaDoTreino) {
      setAte(Date.now() + ex.descanso_seg * 1000); setAgora(Date.now())
    }
  }

  async function abrirHist(ex) {
    if (histEx && histEx.id === ex.exercicio_id) return setHistEx(null)
    const { data, error } = await supabase.from('registros_series')
      .select('carga_kg, repeticoes, registrado_em').eq('aluna_id', perfil.id)
      .eq('exercicio_id', ex.exercicio_id).eq('concluida', true).not('carga_kg', 'is', null)
      .order('registrado_em', { ascending: false }).limit(60)
    if (error) return setMsg(error.message)
    const m = {}
    data.forEach(r => {
      const k = new Date(r.registrado_em).toLocaleDateString('sv-SE')
      const c = Number(r.carga_kg), rp = r.repeticoes || 0
      if (!m[k] || c > m[k].carga || (c === m[k].carga && rp > m[k].reps)) m[k] = { k, carga: c, reps: rp }
    })
    setHistEx({ id: ex.exercicio_id, dias: Object.values(m).sort((a, b) => b.k.localeCompare(a.k)).slice(0, 5) })
  }

  const feitas = ex => Array.from({ length: ex.series }, (_, k) => valor(ex, k + 1)).filter(v => v.concluida).length

  async function finalizar(e) {
    e.preventDefault()
    const { error } = await supabase.from('sessoes').update({
      finalizada_em: new Date().toISOString(), cansaco: fim.cansaco || null, observacao: fim.obs || null,
    }).eq('id', sessao.id)
    if (error) return setMsg(error.message)
    onSair()
  }

  if (carregando) return <p className="center">Carregando treino…</p>

  const restante = ate ? Math.max(0, Math.ceil((ate - agora) / 1000)) : 0
  const barra = ate && (
    <div className="descanso" role="timer">
      <div><div className="rot">Descanso</div><span className="tempo">{fmtT(restante)}</span></div>
      <div>
        <button onClick={() => setAte(a => a + 15000)}>+15 s</button>
        <button onClick={() => setAte(null)}>Pular</button>
      </div>
    </div>
  )

  if (fim) {
    return (
      <main>
        <form onSubmit={finalizar} className="card">
          <h3>Finalizar {treino.nome}</h3>
          <p className="muted">Como foi o cansaço hoje? De 1 (leve) a 5 (exaustivo).</p>
          <div className="cansaco">
            {[1, 2, 3, 4, 5].map(n => (
              <button type="button" key={n} className={fim.cansaco === n ? 'on' : ''} onClick={() => setFim({ ...fim, cansaco: n })}>{n}</button>
            ))}
          </div>
          <textarea rows="3" placeholder="Observação para o treinador (opcional)" value={fim.obs} onChange={e => setFim({ ...fim, obs: e.target.value })} />
          {msg && <p className="erro">{msg}</p>}
          <div className="row">
            <button className="btn">Concluir treino</button>
            <button type="button" className="btn sec" onClick={() => setFim(null)}>Voltar</button>
          </div>
        </form>
      </main>
    )
  }

  if (idx !== null) {
    const ex = itens[idx]
    const u = ultimo[ex.exercicio_id]
    const emb = ytEmbed(ex.exercicios ? ex.exercicios.video_url : '')
    const ehUltimo = idx === itens.length - 1
    const nome = ex.exercicios ? ex.exercicios.nome : ''
    return (
      <main className={ate ? 'pad-desc' : ''}>
        <div className="topo-exec">
          <button className="icone-btn" onClick={() => setIdx(null)} aria-label="Voltar à lista de exercícios"><Icone nome="voltar" /></button>
          <div className="grow">
            <div className="muted">{treino.nome}, exercício {idx + 1} de {itens.length}</div>
            <div className="barra"><span style={{ width: `${((idx + 1) / itens.length) * 100}%` }} /></div>
          </div>
        </div>

        {emb && <iframe className="video" src={emb} allowFullScreen title={nome} />}
        <h2 className="ex-nome">{nome}</h2>
        <div className="prescricao">{ex.series} séries de {ex.repeticoes}{ex.descanso_seg ? `, descanso de ${ex.descanso_seg} s` : ''}</div>
        {u && <div className="ultima">Última vez: {u.carga_kg ?? '–'} kg, {u.repeticoes ?? '–'} repetições</div>}
        {ex.exercicios && ex.exercicios.orientacoes && <p className="orient">{ex.exercicios.orientacoes}</p>}
        {ex.observacao && <p className="orient"><strong>Observação:</strong> {ex.observacao}</p>}

        <div className="series">
          {Array.from({ length: ex.series }, (_, k) => k + 1).map(n => {
            const v = valor(ex, n)
            return (
              <div key={n} className={'serie' + (v.concluida ? ' done' : '')}>
                <span className="n">{n}</span>
                <label className="campo">
                  <input inputMode="decimal" placeholder="0" value={v.carga} aria-label={`Carga da série ${n}`}
                    onChange={e => editar(ex, n, 'carga', e.target.value)} onBlur={() => salvar(ex, n)} />
                  <span className="un">kg</span>
                </label>
                <label className="campo">
                  <input inputMode="numeric" placeholder={primeiroNumero(ex.repeticoes)} value={v.reps} aria-label={`Repetições da série ${n}`}
                    onChange={e => editar(ex, n, 'reps', e.target.value)} onBlur={() => salvar(ex, n)} />
                  <span className="un">reps</span>
                </label>
                <button className={'chk' + (v.concluida ? ' on' : '')} aria-pressed={v.concluida}
                  aria-label={`Concluir série ${n}`} onClick={() => alternar(ex, n, ehUltimo && n === ex.series)}>
                  <Icone nome="check" tam={22} />
                </button>
              </div>
            )
          })}
        </div>
        {msg && <p className="erro">{msg}</p>}

        {histEx && histEx.id === ex.exercicio_id && (
          <div className="card">
            {histEx.dias.length === 0
              ? <p className="muted" style={{ margin: 0 }}>Ainda sem registros deste exercício.</p>
              : (
                <table className="hist" style={{ margin: 0 }}>
                  <tbody>
                    {histEx.dias.map(d => (
                      <tr key={d.k}>
                        <td>{new Date(d.k + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                        <td>{d.carga} kg</td><td>{d.reps} reps</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        )}

        <div className="acoes-exec">
          <button className="link-texto" style={{ margin: 0 }} onClick={() => abrirHist(ex)}>
            <Icone nome="grafico" tam={18} />{histEx && histEx.id === ex.exercicio_id ? 'Ocultar histórico' : 'Histórico de cargas'}
          </button>
          {!ehUltimo
            ? <button className="btn" onClick={() => setIdx(idx + 1)}>Próximo exercício<Icone nome="chevron" tam={16} /></button>
            : <button className="btn" onClick={() => setFim({ cansaco: 0, obs: '' })}>Finalizar treino</button>}
        </div>
        {barra}
      </main>
    )
  }

  const totalSeries = itens.reduce((a, x) => a + x.series, 0)
  const concluidas = itens.reduce((a, x) => a + feitas(x), 0)
  return (
    <main className={ate ? 'pad-desc' : ''}>
      <div className="topo-exec">
        <button className="icone-btn" onClick={onSair} aria-label="Sair do treino"><Icone nome="voltar" /></button>
        <div className="grow">
          <h2 style={{ margin: 0 }}>{treino.nome}</h2>
          <div className="muted">{concluidas} de {totalSeries} séries concluídas</div>
        </div>
      </div>
      {msg && <p className="erro">{msg}</p>}
      {itens.length === 0 && <p className="muted">Este treino ainda não tem exercícios.</p>}
      <div className="lista-escolha">
        {itens.map((ex, i) => {
          const ok = feitas(ex) >= ex.series
          return (
            <button key={ex.id} className="linha-ex" onClick={() => setIdx(i)}>
              <span className={'num' + (ok ? ' ok' : '')}>{ok ? <Icone nome="check" tam={16} /> : i + 1}</span>
              <span className="grow"><strong>{ex.exercicios ? ex.exercicios.nome : ''}</strong><span className="muted bl">{ex.series} séries de {ex.repeticoes}</span></span>
              <span className="muted">{feitas(ex)}/{ex.series}</span>
              <Icone nome="chevron" tam={16} />
            </button>
          )
        })}
      </div>
      <button className="btn" style={{ width: '100%', marginTop: 16 }} onClick={() => setFim({ cansaco: 0, obs: '' })}>Finalizar treino</button>
      {barra}
    </main>
  )
}
