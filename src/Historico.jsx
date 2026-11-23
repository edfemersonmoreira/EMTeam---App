import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { mensagemErro } from './erros'
import Voltar from './Voltar'
import Icone from './Icone'
import './editor.css'
import './aluna.css'

const chaveDia = iso => new Date(iso).toLocaleDateString('sv-SE')
const fmtCurto = t => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

function Grafico({ pontos }) {
  if (pontos.length === 0) return <p className="muted">Sem registros neste período.</p>
  const W = 320, H = 150, P = 34
  const ys = pontos.map(p => p.y), ts = pontos.map(p => p.t)
  const ymin = Math.min(...ys), ymax = Math.max(...ys)
  const t0 = Math.min(...ts), t1 = Math.max(...ts)
  const X = t => (t1 === t0 ? W / 2 : P + ((t - t0) / (t1 - t0)) * (W - 2 * P))
  const Y = y => (ymax === ymin ? (H - 20) / 2 : H - 28 - ((y - ymin) / (ymax - ymin)) * (H - 28 - 16))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico">
      <polyline className="g-linha" points={pontos.map(p => `${X(p.t)},${Y(p.y)}`).join(' ')} fill="none" strokeWidth="2.5" />
      <line className="g-eixo" x1={P} y1={H - 20} x2={W - P} y2={H - 20} strokeWidth="2" />
      {pontos.map((p, i) => <line key={'t' + i} x1={X(p.t)} y1={H - 20} x2={X(p.t)} y2={H - 14} className="g-marca" strokeWidth="2" />)}
      {pontos.map((p, i) => <circle key={i} cx={X(p.t)} cy={Y(p.y)} r="4" className="g-ponto" />)}
      <text x={P} y={H - 6} fontSize="10">{fmtCurto(t0)}</text>
      <text x={W - P} y={H - 6} fontSize="10" textAnchor="end">{fmtCurto(t1)}</text>
      <text x="4" y="12" fontSize="10">{ymax} kg</text>
      {ymin !== ymax && <text x="4" y={H - 30} fontSize="10">{ymin} kg</text>}
    </svg>
  )
}

function dias(ex) {
  const m = {}
  ex.regs.forEach(r => {
    const k = chaveDia(r.registrado_em)
    const d = m[k] || (m[k] = { k, t: new Date(k + 'T12:00:00').getTime(), carga: 0, reps: 0, series: 0 })
    const c = Number(r.carga_kg), rp = r.repeticoes || 0
    d.series++
    if (c > d.carga || (c === d.carga && rp > d.reps)) { d.carga = c; d.reps = rp }
  })
  return Object.values(m).sort((a, b) => a.t - b.t)
}

export default function Historico({ alunaId, titulo, onVoltar }) {
  const [regs, setRegs] = useState(null)
  const [sel, setSel] = useState(null)
  const [periodo, setPeriodo] = useState(90)
  const [msg, setMsg] = useState('')

  const [outras, setOutras] = useState([])

  // Histórico de cargas: somente séries da categoria Principal (view registros_principais)
  useEffect(() => {
    const consulta = tabela => supabase.from(tabela)
      .select('exercicio_id, carga_kg, repeticoes, registrado_em')
      .eq('aluna_id', alunaId).eq('concluida', true).not('carga_kg', 'is', null)
      .order('registrado_em', { ascending: false }).limit(5000)
    ;(async () => {
      let r = await consulta('registros_principais')
      if (r.error) r = await consulta('registros_series')     // banco ainda sem a migração da Etapa 7.1
      if (r.error) return setMsg(mensagemErro(r.error))
      const ids = [...new Set(r.data.map(x => x.exercicio_id))]
      const nomes = {}
      if (ids.length) {
        const ex = await supabase.from('exercicios').select('id, nome').in('id', ids)
        ;(ex.data || []).forEach(e => { nomes[e.id] = e.nome })
      }
      setRegs(r.data.map(x => ({ ...x, exercicios: { nome: nomes[x.exercicio_id] } })))
    })()
  }, [alunaId])

  // Registros das demais categorias (aquecimento, backoff, técnicas): ficam separados e fora do gráfico
  useEffect(() => {
    setOutras([])
    if (!sel) return
    supabase.from('registros_series')
      .select('carga_kg, repeticoes, registrado_em, categorias_serie!inner(nome, cor, principal)')
      .eq('aluna_id', alunaId).eq('exercicio_id', sel).eq('concluida', true)
      .eq('categorias_serie.principal', false)
      .order('registrado_em', { ascending: false }).limit(60)
      .then(({ data, error }) => { if (!error && data) setOutras(data) })
  }, [alunaId, sel])

  const exercicios = useMemo(() => {
    const m = {}
    ;(regs || []).forEach(r => {
      if (!m[r.exercicio_id]) m[r.exercicio_id] = { id: r.exercicio_id, nome: r.exercicios?.nome || '—', ultimo: r.registrado_em, regs: [] }
      m[r.exercicio_id].regs.push(r)
    })
    return Object.values(m).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [regs])

  // Cabeçalho no mesmo formato das outras telas: seta de voltar + título (+ subtítulo)
  const cab = (titulo, sub, voltar) => (
    <div className="topo-exec">
      {voltar && <Voltar soIcone onClick={voltar} />}
      <div className="grow"><h2 style={{ margin: 0 }}>{titulo}</h2>{sub && <div className="muted">{sub}</div>}</div>
    </div>
  )

  if (msg) return <p className="erro">{msg}</p>
  if (!regs) return <p className="muted">Carregando…</p>

  if (sel) {
    const ex = exercicios.find(e => e.id === sel)
    const todos = dias(ex)
    const corte = periodo === 0 ? 0 : Date.now() - periodo * 864e5
    const filtrados = todos.filter(d => d.t >= corte)
    return (
      <>
        {cab(ex.nome, 'Evolução da carga principal', () => setSel(null))}
        <div className="chips">
          {[[30, '30 dias'], [90, '3 meses'], [0, 'Tudo']].map(([v, l]) => (
            <button key={v} className={periodo === v ? 'on' : ''} onClick={() => setPeriodo(v)}>{l}</button>
          ))}
        </div>
        <Grafico pontos={filtrados.map(d => ({ t: d.t, y: d.carga }))} />
        <table className="hist">
          <thead><tr><th>Data</th><th>Carga</th><th>Repetições</th><th>Séries</th></tr></thead>
          <tbody>
            {[...todos].reverse().map(d => (
              <tr key={d.k}>
                <td>{new Date(d.t).toLocaleDateString('pt-BR')}</td>
                <td>{d.carga} kg</td><td>{d.reps}</td><td>{d.series}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Carga e repetições da melhor série principal de cada dia.</p>
        {outras.length > 0 && (
          <>
            <h3 style={{ marginTop: 22 }}>Outras categorias</h3>
            <p className="muted">Aquecimento, backoff e técnicas ficam registrados separadamente e não entram no gráfico.</p>
            <table className="hist">
              <thead><tr><th>Data</th><th>Categoria</th><th>Carga</th><th>Reps</th></tr></thead>
              <tbody>
                {outras.map((r, i) => (
                  <tr key={i}>
                    <td>{new Date(r.registrado_em).toLocaleDateString('pt-BR')}</td>
                    <td><span className="cat-tag" style={{ '--cat': r.categorias_serie.cor }}><i className="cat-dot" />{r.categorias_serie.nome}</span></td>
                    <td>{r.carga_kg ?? '–'} kg</td><td>{r.repeticoes ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </>
    )
  }

  return (
    <>
      {titulo ? cab(titulo, null, onVoltar) : null}
      {titulo && <div className="regua-div" aria-hidden="true" />}
      {exercicios.length === 0 && <p className="muted">Ainda não há cargas registradas.</p>}
      {exercicios.map(ex => (
        <div key={ex.id} className="card lista-ex" onClick={() => setSel(ex.id)}>
          <div>
            <strong>{ex.nome}</strong>
            <div className="muted">Último registro em {new Date(ex.ultimo).toLocaleDateString('pt-BR')}</div>
          </div>
          <Icone nome="chevron" tam={16} />
        </div>
      ))}
    </>
  )
}
