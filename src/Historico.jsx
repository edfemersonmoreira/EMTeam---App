import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { mensagemErro } from './erros'
import Voltar from './Voltar'
import { CabecalhoPagina } from './Cabecalho'
import Icone from './Icone'
import ResumoTreino from './Resumo'
import { fmtDuracaoSessao } from './resumoUtil'
import { GRUPOS, lerGrupos } from './grupos'
import './editor.css'
import './aluna.css'

// Seções da aba Exercícios: cada combinação de grupamentos cadastrada na biblioteca vira uma seção
// ("Quadríceps", "Quadríceps + Glúteos"). Assim nenhum exercício se repete e nada é reclassificado.
const SEM_GRUPO = 'Sem grupamento cadastrado'
const posGrupo = g => { const i = GRUPOS.indexOf(g); return i < 0 ? GRUPOS.length : i }
function secoesPorGrupo(exercicios) {
  const m = {}
  exercicios.forEach(ex => {
    const gs = lerGrupos(ex.grupo_muscular)
    const k = gs.length ? gs.join(' + ') : SEM_GRUPO
    ;(m[k] || (m[k] = { titulo: k, grupos: gs, itens: [] })).itens.push(ex)
  })
  return Object.values(m).sort((a, b) =>
    (a.titulo === SEM_GRUPO) - (b.titulo === SEM_GRUPO) ||
    posGrupo(a.grupos[0]) - posGrupo(b.grupos[0]) ||
    a.grupos.length - b.grupos.length ||
    a.titulo.localeCompare(b.titulo, 'pt-BR'))
}

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

export default function Historico({ alunaId, titulo, onVoltar, trilha }) {
  const [regs, setRegs] = useState(null)
  const [sel, setSel] = useState(null)
  const [periodo, setPeriodo] = useState(90)
  const [msg, setMsg] = useState('')

  const [outras, setOutras] = useState([])
  const [aba, setAba] = useState('exercicios')        // exercicios | treinos
  const [sessoes, setSessoes] = useState(null)        // treinos finalizados, para abrir o resumo de cada um
  const [sessaoSel, setSessaoSel] = useState(null)

  // Treinos realizados: só leitura das sessões finalizadas (o resumo é calculado a partir dos registros já salvos)
  useEffect(() => {
    if (aba !== 'treinos' || sessoes) return
    supabase.from('sessoes').select('id, treino_nome, iniciada_em, finalizada_em')
      .eq('aluna_id', alunaId).not('finalizada_em', 'is', null)
      .order('finalizada_em', { ascending: false }).limit(60)
      .then(({ data, error }) => { if (error) setMsg(mensagemErro(error)); else setSessoes(data || []) })
  }, [aba, alunaId])

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
        const ex = await supabase.from('exercicios').select('id, nome, grupo_muscular').in('id', ids)
        ;(ex.data || []).forEach(e => { nomes[e.id] = e })
      }
      setRegs(r.data.map(x => ({ ...x, exercicios: { nome: nomes[x.exercicio_id]?.nome, grupo_muscular: nomes[x.exercicio_id]?.grupo_muscular } })))
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
      if (!m[r.exercicio_id]) m[r.exercicio_id] = { id: r.exercicio_id, nome: r.exercicios?.nome || '—', grupo_muscular: r.exercicios?.grupo_muscular, ultimo: r.registrado_em, regs: [] }
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

  if (sessaoSel) {
    const fechar = () => setSessaoSel(null)
    return <ResumoTreino sessaoId={sessaoSel} onFechar={fechar} rotuloFechar="Voltar aos treinos" detalhes={!!trilha}
      voltar={trilha ? null : fechar} trilha={trilha ? [...trilha, { rotulo: 'Treinos realizados', onClick: fechar }] : null} />
  }

  if (sel) {
    const ex = exercicios.find(e => e.id === sel)
    const todos = dias(ex)
    const corte = periodo === 0 ? 0 : Date.now() - periodo * 864e5
    const filtrados = todos.filter(d => d.t >= corte)
    return (
      <>
        {trilha
          ? <CabecalhoPagina trilha={[...trilha, { rotulo: 'Cargas', onClick: () => setSel(null) }, { rotulo: ex.nome }]} titulo={ex.nome} subtitulo="Evolução da carga principal" />
          : cab(ex.nome, 'Evolução da carga principal', () => setSel(null))}
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
      {trilha
        ? <CabecalhoPagina trilha={[...trilha, { rotulo: 'Cargas' }]} titulo={titulo} subtitulo="Melhor série principal de cada exercício. Escolha um exercício para ver a evolução." />
        : <>{titulo ? cab(titulo, null, onVoltar) : null}{titulo && <div className="regua-div" aria-hidden="true" />}</>}
      <div className="chips" role="tablist" aria-label="Ver por">
        <button role="tab" aria-selected={aba === 'exercicios'} className={aba === 'exercicios' ? 'on' : ''} onClick={() => setAba('exercicios')}>Exercícios</button>
        <button role="tab" aria-selected={aba === 'treinos'} className={aba === 'treinos' ? 'on' : ''} onClick={() => setAba('treinos')}>Treinos realizados</button>
      </div>
      {aba === 'treinos' && (
        !sessoes ? <p className="muted">Carregando…</p>
          : sessoes.length === 0 ? <p className="muted">Nenhum treino finalizado ainda.</p>
          : (
            <div className="lista-escolha lista-treinos">
              {sessoes.map(s => {
                const dur = fmtDuracaoSessao(s.iniciada_em, s.finalizada_em)
                const quando = new Date(s.finalizada_em).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
                return (
                  <button key={s.id} className="linha-ex" onClick={() => setSessaoSel(s.id)}>
                    <span className="num cat-ico"><Icone nome="dumbbell" tam={16} /></span>
                    <span className="grow"><strong>{s.treino_nome || 'Treino'}</strong><span className="muted bl">{quando}{dur ? ` · ${dur}` : ''}</span></span>
                    <span className="muted">Resumo</span>
                    <Icone nome="chevron" tam={16} />
                  </button>
                )
              })}
            </div>
          )
      )}
      {aba === 'exercicios' && exercicios.length === 0 && <p className="muted">Ainda não há cargas registradas.</p>}
      {aba === 'exercicios' && secoesPorGrupo(exercicios).map(sec => (
        <section key={sec.titulo} className="cargas-secao" aria-label={sec.titulo}>
          <h3 className={sec.titulo === SEM_GRUPO ? 'muted' : ''}>{sec.titulo}<span className="cargas-qtd">{sec.itens.length}</span></h3>
          <div className="cargas-lista">
            {sec.itens.map(ex => (
              <button key={ex.id} type="button" className="cargas-ex" onClick={() => setSel(ex.id)}>
                <span className="grow"><strong>{ex.nome}</strong><span className="muted bl">Último registro em {new Date(ex.ultimo).toLocaleDateString('pt-BR')}</span></span>
                <Icone nome="chevron" tam={16} />
              </button>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
