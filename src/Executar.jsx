import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { mensagemErro } from './erros'
import { ytEmbed } from './Exercicios'
import Icone from './Icone'
import { blocosDoExercicio, expandir, chaveUltimo, resumo } from './seriesUtil'
import './aluna.css'

const fmtT = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const primeiroNumero = t => { const m = String(t || '').match(/\d+/); return m ? m[0] : '' }
const numeroDe = t => { const m = String(t || '').match(/\d+(?:[.,]\d+)?/); return m ? m[0] : '' }
const chave = (ex, slot) => `${ex.exercicio_id}:${slot.numero}`
const principalDe = ex => ex.blocos.find(b => b.categorias_serie && b.categorias_serie.principal) || ex.blocos[0]

export default function Executar({ treino, perfil, onSair }) {
  const [itens, setItens] = useState([])
  const [sessao, setSessao] = useState(null)
  const [reg, setReg] = useState({})
  // Séries que a aluna digitou, concluiu ou que já estavam salvas: aparecem como registradas.
  // As demais mostram a sugestão da última vez em tom mais claro. Só afeta a aparência, não o salvamento.
  const [tocados, setTocados] = useState({})
  const [ultimo, setUltimo] = useState({})
  const [idx, setIdx] = useState(null)
  const [fim, setFim] = useState(null)
  const [ate, setAte] = useState(null)
  const [agora, setAgora] = useState(Date.now())
  const [carregando, setCarregando] = useState(true)
  const [msg, setMsg] = useState('')
  const [histEx, setHistEx] = useState(null)
  const legado = useRef(false)   // true quando o banco ainda não tem a migração da Etapa 7.1

  useEffect(() => {
    (async () => {
      let te = await supabase.from('treino_exercicios')
        .select('*, exercicios(*), blocos:treino_exercicio_series(*, categorias_serie(nome, cor, principal))')
        .eq('treino_id', treino.id).order('ordem')
      if (te.error) {
        legado.current = true
        te = await supabase.from('treino_exercicios').select('*, exercicios(*)').eq('treino_id', treino.id).order('ordem')
      }
      if (te.error) { setMsg(mensagemErro(te.error)); return setCarregando(false) }
      const lista = te.data.map(it => { const blocos = blocosDoExercicio(it); return { ...it, blocos, slots: expandir(blocos) } })
      setItens(lista)

      const desde = new Date(Date.now() - 12 * 3600 * 1000).toISOString()
      const s = await supabase.from('sessoes').select('*').eq('aluna_id', perfil.id)
        .eq('treino_id', treino.id).is('finalizada_em', null).gte('iniciada_em', desde)
        .order('iniciada_em', { ascending: false }).limit(1).maybeSingle()
      let sess = s.data
      if (!sess) {
        const n = await supabase.from('sessoes')
          .insert({ aluna_id: perfil.id, treino_id: treino.id, treino_nome: treino.nome }).select().single()
        if (n.error) { setMsg(mensagemErro(n.error)); return setCarregando(false) }
        sess = n.data
      }
      setSessao(sess)

      const r = await supabase.from('registros_series').select('*').eq('sessao_id', sess.id)
      const m = {}
      ;(r.data || []).forEach(x => {
        m[`${x.exercicio_id}:${x.numero_serie}`] = { carga: x.carga_kg ?? '', reps: x.repeticoes ?? '', concluida: x.concluida }
      })
      setReg(m)
      setTocados(Object.fromEntries(Object.keys(m).map(k => [k, true])))

      // Última carga de cada exercício, separada por categoria (a principal não se mistura com aquecimento etc.)
      const ids = lista.map(x => x.exercicio_id)
      if (ids.length) {
        const h = await supabase.from('registros_series')
          .select(legado.current ? 'exercicio_id, carga_kg, repeticoes, registrado_em' : 'exercicio_id, categoria_id, carga_kg, repeticoes, registrado_em')
          .eq('aluna_id', perfil.id).in('exercicio_id', ids).eq('concluida', true)
          .neq('sessao_id', sess.id).order('registrado_em', { ascending: false }).limit(600)
        const u = {}
        ;(h.data || []).forEach(x => { const k = chaveUltimo(x.exercicio_id, x.categoria_id); if (!u[k]) u[k] = x })
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

  function valor(ex, slot) {
    const r = reg[chave(ex, slot)]
    if (r) return r
    const u = ultimo[chaveUltimo(ex.exercicio_id, slot.bloco.categoria_id)]
    return { carga: u ? (u.carga_kg ?? '') : '', reps: u ? (u.repeticoes ?? '') : '', concluida: false }
  }

  function editar(ex, slot, campo, val) {
    setTocados(t => ({ ...t, [chave(ex, slot)]: true }))
    setReg(r => ({ ...r, [chave(ex, slot)]: { ...valor(ex, slot), [campo]: val } }))
  }

  async function salvar(ex, slot, novo = {}) {
    const atual = { ...valor(ex, slot), ...novo }
    setReg(r => ({ ...r, [chave(ex, slot)]: atual }))
    const c = parseFloat(String(atual.carga).replace(',', '.'))
    const rp = parseInt(atual.reps, 10)
    const base = {
      sessao_id: sessao.id, aluna_id: perfil.id, exercicio_id: ex.exercicio_id, numero_serie: slot.numero,
      carga_kg: Number.isNaN(c) ? null : c, repeticoes: Number.isNaN(rp) ? null : rp,
      concluida: atual.concluida, registrado_em: new Date().toISOString(),
    }
    const completo = legado.current ? base : { ...base, categoria_id: slot.bloco.categoria_id, bloco_id: slot.bloco.id }
    let { error } = await supabase.from('registros_series').upsert(completo, { onConflict: 'sessao_id,exercicio_id,numero_serie' })
    if (error && !legado.current && /categoria_id|bloco_id/.test(error.message)) {
      ;({ error } = await supabase.from('registros_series').upsert(base, { onConflict: 'sessao_id,exercicio_id,numero_serie' }))
    }
    setMsg(error ? mensagemErro(error) : '')
  }

  function alternar(ex, slot, ultimaDoTreino) {
    const concl = !valor(ex, slot).concluida
    salvar(ex, slot, { concluida: concl })
    const desc = slot.bloco.descanso_seg
    if (concl && desc && !ultimaDoTreino) {
      setAte(Date.now() + desc * 1000); setAgora(Date.now())
    }
  }

  // Histórico de cargas dentro do exercício: somente séries principais
  async function abrirHist(ex) {
    if (histEx && histEx.id === ex.exercicio_id) return setHistEx(null)
    const { data, error } = await supabase.from(legado.current ? 'registros_series' : 'registros_principais')
      .select('carga_kg, repeticoes, registrado_em').eq('aluna_id', perfil.id)
      .eq('exercicio_id', ex.exercicio_id).eq('concluida', true).not('carga_kg', 'is', null)
      .order('registrado_em', { ascending: false }).limit(60)
    if (error) return setMsg(mensagemErro(error))
    const m = {}
    data.forEach(r => {
      const k = new Date(r.registrado_em).toLocaleDateString('sv-SE')
      const c = Number(r.carga_kg), rp = r.repeticoes || 0
      if (!m[k] || c > m[k].carga || (c === m[k].carga && rp > m[k].reps)) m[k] = { k, carga: c, reps: rp }
    })
    setHistEx({ id: ex.exercicio_id, dias: Object.values(m).sort((a, b) => b.k.localeCompare(a.k)).slice(0, 5) })
  }

  const feitas = ex => ex.slots.filter(s => valor(ex, s).concluida).length

  async function finalizar(e) {
    e.preventDefault()
    const { error } = await supabase.from('sessoes').update({
      finalizada_em: new Date().toISOString(), cansaco: fim.cansaco || null, observacao: fim.obs || null,
    }).eq('id', sessao.id)
    if (error) return setMsg(mensagemErro(error))
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
      <main className="exec">
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
    const emb = ytEmbed(ex.exercicios ? ex.exercicios.video_url : '')
    const ehUltimoEx = idx === itens.length - 1
    const nome = ex.exercicios ? ex.exercicios.nome : ''
    const pb = principalDe(ex)
    const u = ultimo[chaveUltimo(ex.exercicio_id, pb.categoria_id)]
    return (
      <main className={'exec' + (ate ? ' pad-desc' : '')}>
        <div className="topo-exec">
          <button className="icone-btn" onClick={() => setIdx(null)} aria-label="Voltar à lista de exercícios"><Icone nome="voltar" /></button>
          <div className="grow">
            <div className="muted">{treino.nome}, exercício {idx + 1} de {itens.length}</div>
            <div className="regua-prog" aria-hidden="true">
              {itens.map((_, i) => <i key={i} className={i < idx ? 'f' : i === idx ? 'a' : ''} />)}
            </div>
          </div>
        </div>

        {emb && <iframe className="video" src={emb} allowFullScreen title={nome} />}
        <h2 className="ex-nome">{nome}</h2>
        {u && <div className="ultima">Última vez ({pb.categorias_serie.nome.toLowerCase()}): {u.carga_kg ?? '–'} kg, {u.repeticoes ?? '–'} repetições</div>}
        {ex.exercicios && ex.exercicios.orientacoes && <p className="orient">{ex.exercicios.orientacoes}</p>}
        {ex.observacao && <p className="orient"><strong>Observação:</strong> {ex.observacao}</p>}

        {ex.slots.some(s => !valor(ex, s).concluida && !tocados[chave(ex, s)] && (valor(ex, s).carga !== '' || valor(ex, s).reps !== '')) && (
          <p className="dica-sugestao">Números em cinza são da última vez. Ajuste se precisar e toque em <Icone nome="check" tam={14} /> para registrar.</p>
        )}

        {ex.blocos.map((b, bi) => {
          const cat = b.categorias_serie
          const slotsB = ex.slots.filter(s => s.bloco === b)
          return (
            <div key={b.id || `p${bi}`} className="bloco-exec" style={{ '--cat': cat.cor }}>
              <div className="bloco-cab">
                <span className="cat-tag"><i className="cat-dot" />{cat.nome}</span>
                <span className="muted">
                  {b.series} {b.series === 1 ? 'série' : 'séries'} de {b.repeticoes || '–'}
                  {b.carga ? `, carga ${b.carga}` : ''}{b.descanso_seg ? `, descanso ${b.descanso_seg} s` : ''}
                </span>
              </div>
              {b.observacao && <p className="orient" style={{ margin: '4px 0' }}>{b.observacao}</p>}
              <div className="series">
                {slotsB.map(slot => {
                  const v = valor(ex, slot)
                  const sug = !v.concluida && !tocados[chave(ex, slot)] ? ' sugerido' : ''
                  return (
                    <div key={slot.numero} className={'serie' + (v.concluida ? ' done' : '') + sug}>
                      <span className="n">{slot.k}</span>
                      <label className="campo">
                        <input inputMode="decimal" placeholder={numeroDe(b.carga) || '0'} value={v.carga} aria-label={`Carga da série ${slot.k} de ${cat.nome}`}
                          onChange={e => editar(ex, slot, 'carga', e.target.value)} onBlur={() => salvar(ex, slot)} />
                        <span className="un">kg</span>
                      </label>
                      <label className="campo">
                        <input inputMode="numeric" placeholder={primeiroNumero(b.repeticoes)} value={v.reps} aria-label={`Repetições da série ${slot.k} de ${cat.nome}`}
                          onChange={e => editar(ex, slot, 'reps', e.target.value)} onBlur={() => salvar(ex, slot)} />
                        <span className="un">reps</span>
                      </label>
                      <button className={'chk' + (v.concluida ? ' on' : '')} aria-pressed={v.concluida}
                        aria-label={`Concluir série ${slot.k} de ${cat.nome}`} onClick={() => alternar(ex, slot, ehUltimoEx && slot.numero === ex.slots.length)}>
                        <Icone nome="check" tam={22} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {msg && <p className="erro">{msg}</p>}

        {histEx && histEx.id === ex.exercicio_id && (
          <div className="card">
            {histEx.dias.length === 0
              ? <p className="muted" style={{ margin: 0 }}>Ainda sem registros principais deste exercício.</p>
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
          {!ehUltimoEx
            ? <button className="btn" onClick={() => setIdx(idx + 1)}>Próximo exercício<Icone nome="chevron" tam={16} /></button>
            : <button className="btn" onClick={() => setFim({ cansaco: 0, obs: '' })}>Finalizar treino</button>}
        </div>
        {barra}
      </main>
    )
  }

  const totalSeries = itens.reduce((a, x) => a + x.slots.length, 0)
  const concluidas = itens.reduce((a, x) => a + feitas(x), 0)
  return (
    <main className={'exec' + (ate ? ' pad-desc' : '')}>
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
          const ok = ex.slots.length > 0 && feitas(ex) >= ex.slots.length
          return (
            <button key={ex.id} className="linha-ex" onClick={() => setIdx(i)}>
              <span className={'num' + (ok ? ' ok' : '')}>{ok ? <Icone nome="check" tam={16} /> : i + 1}</span>
              <span className="grow">
                <strong>{ex.exercicios ? ex.exercicios.nome : ''}</strong>
                <span className="cat-dots">{ex.blocos.map((b, k) => <i key={k} className="cat-dot" style={{ '--cat': b.categorias_serie.cor }} />)}</span>
                <span className="muted bl">{resumo(ex.blocos)}</span>
              </span>
              <span className="muted">{feitas(ex)}/{ex.slots.length}</span>
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
