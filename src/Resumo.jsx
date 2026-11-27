import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { mensagemErro } from './erros'
import Voltar from './Voltar'
import { CabecalhoPagina } from './Cabecalho'
import { calcularResumo, fmtNumero, fmtDuracaoSessao, SEM_GRUPO } from './resumoUtil'
import { calcularDestaques } from './destaqueUtil'
import './resumo.css'

// Resumo de uma sessão de musculação: o que a aluna realmente registrou nas séries principais concluídas.
// Lê só dados que já existem (sessoes, registros_principais e exercicios); não grava nada.
//   sessaoId    sessão a resumir
//   onFechar    botão principal (ex.: "Voltar ao início")
//   voltar      seta de voltar no topo (quando aberto pelo histórico da aluna)
//   trilha      trilha do admin (quando aberto pelas cargas de uma aluna)
//   detalhes    mostra cada exercício com as séries registradas (consulta do admin)
//   comDestaque mostra o "Destaque do treino" (tela da aluna logo após concluir)
const hora = iso => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const series = n => `${fmtNumero(n, 1)} ${n === 1 ? 'série' : 'séries'}`
const kg = v => `${fmtNumero(v, 2)} kg`
const reps = n => `${n} ${n === 1 ? 'repetição' : 'repetições'}`
// "50 kg × 10 repetições" (ou só as repetições, sem carga registrada)
const fmtSerie = s => (s.carga > 0 ? `${kg(s.carga)} × ${reps(s.reps)}` : reps(s.reps))

// Junta os registros de cada exercício da sessão, na ordem do treino e das séries.
function montarDetalhes(regs, nomes, ordemTreino) {
  const m = {}
  regs.forEach(r => { (m[r.exercicio_id] || (m[r.exercicio_id] = [])).push(r) })
  const pos = id => (id in ordemTreino ? ordemTreino[id] : 1e6)
  return Object.entries(m)
    .map(([id, rs]) => {
      const ordenadas = [...rs].sort((a, b) => a.numero_serie - b.numero_serie)
      const cont = {}
      const linhas = ordenadas.map(r => {
        const cat = r.categorias_serie
        const k = cat ? cat.nome : 'Série'
        cont[k] = (cont[k] || 0) + 1
        return { ...r, cat, n: cont[k] }
      })
      return { id, nome: nomes[id] || 'Exercício', linhas }
    })
    .sort((a, b) => pos(a.id) - pos(b.id) || a.nome.localeCompare(b.nome, 'pt-BR'))
}

function Destaque({ lista }) {
  const [d, ...outros] = lista
  const titulo = d.tipo === 'carga' ? `Você aumentou a carga na ${d.nome}!`
    : d.tipo === 'reps' ? `Você fez mais repetições na ${d.nome}!`
    : `Você superou seu resultado anterior na ${d.nome}!`
  const valor = (x, s) => (d.tipo === 'volume'
    ? (d.comCarga ? `${kg(x.volume)} de volume em ${series(x.series)}` : `${reps(x.volume)} em ${series(x.series)}`)
    : fmtSerie(s))
  return (
    <section className="destaque" aria-labelledby="t-destaque">
      <span className="resumo-eti" id="t-destaque">Destaque do treino</span>
      <h3>{titulo}</h3>
      <div className="dq-comp">
        <div><span>Antes</span><strong>{valor(d.antes, d.antes)}</strong></div>
        <div className="dq-agora"><span>Agora</span><strong>{valor(d.agora, d.agora)}</strong></div>
      </div>
      {outros.length > 0 && (
        <p className="dq-mais">Também evoluiu em: {outros.slice(0, 3).map(o => o.nome).join(', ')}{outros.length > 3 ? ` e mais ${outros.length - 3}` : ''}.</p>
      )}
      <p className="dq-frase">Pequenas evoluções que fazem a diferença!</p>
    </section>
  )
}

function DetalhesExecucao({ exercicios }) {
  if (!exercicios.length) return null
  return (
    <section className="card resumo-detalhes" aria-labelledby="t-detalhes">
      <h3 id="t-detalhes">Execução por exercício</h3>
      <p className="muted pequeno">Carga e repetições exatamente como foram registradas, série por série.</p>
      {exercicios.map(ex => {
        const principais = ex.linhas.filter(l => l.cat && l.cat.principal).length
        const outras = ex.linhas.length - principais
        return (
          <details key={ex.id} className="rd-ex">
            <summary>
              <span className="grow"><strong>{ex.nome}</strong>
                <span className="muted bl">{[principais ? `${principais} ${principais === 1 ? 'série principal' : 'séries principais'}` : null, outras ? `${outras} ${outras === 1 ? 'outra série' : 'outras séries'}` : null].filter(Boolean).join(' · ')}</span>
              </span>
            </summary>
            <ol className="rd-series">
              {ex.linhas.map(l => (
                <li key={l.numero_serie} className={l.concluida ? '' : 'nao-concluida'}>
                  <span className="cat-tag" style={{ '--cat': l.cat ? l.cat.cor : 'var(--borda2)' }}><i className="cat-dot" />{l.cat ? l.cat.nome : 'Série'}</span>
                  <span className="rd-n">Série {l.n}</span>
                  <span className="rd-val">
                    {l.carga_kg != null ? kg(Number(l.carga_kg)) : 'sem carga'} — {l.repeticoes != null ? reps(l.repeticoes) : 'sem repetições'}
                    {!l.concluida && <em> · não concluída</em>}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        )
      })}
    </section>
  )
}

export default function ResumoTreino({ sessaoId, onFechar, rotuloFechar = 'Voltar ao início', voltar, trilha, detalhes = false, comDestaque = false }) {
  const [dados, setDados] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const s = await supabase.from('sessoes').select('id, aluna_id, treino_id, treino_nome, iniciada_em, finalizada_em').eq('id', sessaoId).single()
      if (s.error) return vivo && setMsg(mensagemErro(s.error))
      const r = await supabase.from('registros_principais').select('exercicio_id, carga_kg, repeticoes, concluida').eq('sessao_id', sessaoId)
      if (r.error) return vivo && setMsg(mensagemErro(r.error))
      const ids = [...new Set((r.data || []).map(x => x.exercicio_id))]
      let exercicios = {}
      if (ids.length) {
        const e = await supabase.from('exercicios').select('id, nome, grupo_muscular').in('id', ids)
        if (e.error) return vivo && setMsg(mensagemErro(e.error))
        exercicios = Object.fromEntries((e.data || []).map(x => [x.id, x]))
      }
      const extra = {}

      // Destaque: compara com a última execução finalizada ANTES desta, do mesmo treino. Sem ela, não há destaque.
      if (comDestaque && s.data.treino_id) {
        const ant = await supabase.from('sessoes').select('id')
          .eq('aluna_id', s.data.aluna_id).eq('treino_id', s.data.treino_id).neq('id', sessaoId)
          .not('finalizada_em', 'is', null).lt('iniciada_em', s.data.iniciada_em)
          .order('iniciada_em', { ascending: false }).limit(1)
        if (!ant.error && ant.data && ant.data.length) {
          const ra = await supabase.from('registros_principais').select('exercicio_id, carga_kg, repeticoes, concluida').eq('sessao_id', ant.data[0].id)
          if (!ra.error) extra.destaques = calcularDestaques(r.data || [], ra.data || [], Object.fromEntries(Object.values(exercicios).map(x => [x.id, x.nome])))
        }
      }

      // Detalhes (admin): todas as séries registradas, de todos os tipos, na ordem do treino
      if (detalhes) {
        let d = await supabase.from('registros_series')
          .select('exercicio_id, numero_serie, carga_kg, repeticoes, concluida, categorias_serie(nome, cor, principal)').eq('sessao_id', sessaoId)
        if (d.error) d = await supabase.from('registros_series').select('exercicio_id, numero_serie, carga_kg, repeticoes, concluida').eq('sessao_id', sessaoId)
        if (!d.error) {
          const faltam = [...new Set((d.data || []).map(x => x.exercicio_id))].filter(id => !exercicios[id])
          const nomes = Object.fromEntries(Object.values(exercicios).map(x => [x.id, x.nome]))
          if (faltam.length) {
            const e2 = await supabase.from('exercicios').select('id, nome').in('id', faltam)
            ;(e2.data || []).forEach(x => { nomes[x.id] = x.nome })
          }
          const ordem = {}
          if (s.data.treino_id) {
            const t = await supabase.from('treino_exercicios').select('exercicio_id, ordem').eq('treino_id', s.data.treino_id)
            ;(t.data || []).forEach(x => { if (!(x.exercicio_id in ordem) || x.ordem < ordem[x.exercicio_id]) ordem[x.exercicio_id] = x.ordem })
          }
          extra.detalhes = montarDetalhes(d.data || [], nomes, ordem)
        }
      }
      if (vivo) setDados({ sessao: s.data, resumo: calcularResumo(r.data || [], exercicios), ...extra })
    })()
    return () => { vivo = false }
  }, [sessaoId])

  const nome = dados ? dados.sessao.treino_nome || 'Treino' : 'Resumo do treino'
  const topo = trilha
    ? <CabecalhoPagina trilha={[...trilha, { rotulo: nome }]} titulo={nome} />
    : voltar
      ? <div className="topo-exec"><Voltar soIcone onClick={voltar} /><div className="grow"><span className="resumo-eti">Resumo do treino</span><h2 style={{ margin: 0 }}>{nome}</h2></div></div>
      : <div className="resumo-topo"><span className="resumo-eti">Treino concluído</span><h2>{nome}</h2></div>

  if (msg) return <section className="resumo">{topo}<p className="erro">{msg}</p><button className="btn resumo-fechar" onClick={onFechar}>{rotuloFechar}</button></section>
  if (!dados) return <section className="resumo">{topo}<p className="muted">Calculando o resumo…</p></section>

  const { sessao, resumo: R, destaques = [], detalhes: execucao = [] } = dados
  const fim = sessao.finalizada_em
  const data = new Date(fim || sessao.iniciada_em).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const duracao = fmtDuracaoSessao(sessao.iniciada_em, fim)
  const max = R.grupos.reduce((m, g) => Math.max(m, g.series), 0)

  return (
    <section className="resumo" aria-label={`Resumo de ${nome}`}>
      {topo}
      <p className="muted resumo-quando">
        {data}{fim && <> · <span className="sem-quebra">{hora(sessao.iniciada_em)} às {hora(fim)}</span></>}{duracao && <> · <span className="sem-quebra">{duracao}</span></>}
      </p>

      {destaques.length > 0 && <Destaque lista={destaques} />}

      {R.series === 0 ? (
        <div className="bloco calmo resumo-vazio">
          <h3>Nenhuma série principal concluída</h3>
          <p className="muted">O resumo considera as séries principais marcadas como concluídas. Neste treino, nenhuma foi registrada assim.</p>
        </div>
      ) : (
        <>
          {/* Destaque: volume (tonelagem) das séries principais */}
          <div className="bloco resumo-volume">
            <span className="data">Volume das séries principais</span>
            {R.tonelagem > 0
              ? <strong className="resumo-ton">{fmtNumero(R.tonelagem, 1)}<small> kg</small></strong>
              : <strong className="resumo-ton resumo-ton-vazio">Sem carga registrada</strong>}
            <p>Soma de carga × repetições das séries principais com carga e repetições registradas.</p>
          </div>

          <div className="resumo-indicadores">
            <div className="resumo-ind"><strong>{fmtNumero(R.series)}</strong><span>Séries principais</span></div>
            <div className="resumo-ind"><strong>{fmtNumero(R.repeticoes)}</strong><span>Repetições nas séries principais</span></div>
            <div className="resumo-ind"><strong>{fmtNumero(R.exercicios)}</strong><span>{R.exercicios === 1 ? 'Exercício realizado' : 'Exercícios realizados'}</span></div>
          </div>

          {/* Distribuição das séries principais por grupamento: barras horizontais, maior primeiro, valor escrito em cada linha */}
          <section className="card resumo-grupos" aria-labelledby="t-grupos">
            <h3 id="t-grupos">Séries principais por grupamento</h3>
            <ul>
              {R.grupos.map(g => (
                <li key={g.grupo} className={g.grupo === SEM_GRUPO ? 'sem-grupo' : ''}>
                  <span className="rg-nome">{g.grupo}</span>
                  <span className="rg-valor">{series(g.series)}</span>
                  <span className="rg-trilho" aria-hidden="true"><span style={{ width: `${max ? (g.series / max) * 100 : 0}%` }} /></span>
                </li>
              ))}
            </ul>
            {R.compartilhado && <p className="muted pequeno">Exercícios com mais de um grupamento contam 1 série para cada um deles. Por isso, a soma por grupamento pode ser maior que o total de séries principais.</p>}
          </section>
        </>
      )}

      {detalhes && <DetalhesExecucao exercicios={execucao} />}

      <div className="resumo-notas">
        <p>Os números apresentados consideram apenas as séries principais do seu treino. Séries de aquecimento, reconhecimento e outros tipos de série não entram nessa contabilização.</p>
        {R.series > 0 && <p>O volume mostra a carga externa registrada (carga × repetições). Não inclui o peso do corpo e não mede o esforço.</p>}
        {R.semCarga > 0 && <p>{R.semCarga === 1 ? '1 série principal ficou fora do volume por não ter' : `${R.semCarga} séries principais ficaram fora do volume por não terem`} carga ou repetições registradas.</p>}
        {R.semReps > 0 && <p>{R.semReps === 1 ? '1 série principal não tem' : `${R.semReps} séries principais não têm`} repetições registradas e não {R.semReps === 1 ? 'entra' : 'entram'} no total de repetições.</p>}
      </div>

      <button className="btn resumo-fechar" onClick={onFechar}>{rotuloFechar}</button>
    </section>
  )
}
