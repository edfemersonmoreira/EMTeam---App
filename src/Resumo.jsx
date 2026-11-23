import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { mensagemErro } from './erros'
import Voltar from './Voltar'
import { CabecalhoPagina } from './Cabecalho'
import { calcularResumo, fmtNumero, fmtDuracaoSessao, SEM_GRUPO } from './resumoUtil'
import './resumo.css'

// Resumo de uma sessão de musculação: o que a aluna realmente registrou nas séries principais concluídas.
// Lê só dados que já existem (sessoes, registros_principais e exercicios); não grava nada.
//   sessaoId    sessão a resumir
//   onFechar    botão principal (ex.: "Voltar ao início")
//   voltar      seta de voltar no topo (quando aberto pelo histórico da aluna)
//   trilha      trilha do admin (quando aberto pelas cargas de uma aluna)
const hora = iso => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const series = n => `${fmtNumero(n, 1)} ${n === 1 ? 'série' : 'séries'}`

export default function ResumoTreino({ sessaoId, onFechar, rotuloFechar = 'Voltar ao início', voltar, trilha }) {
  const [dados, setDados] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const s = await supabase.from('sessoes').select('id, treino_nome, iniciada_em, finalizada_em').eq('id', sessaoId).single()
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
      if (vivo) setDados({ sessao: s.data, resumo: calcularResumo(r.data || [], exercicios) })
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

  const { sessao, resumo: R } = dados
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
            {R.compartilhado && <p className="muted pequeno">Exercícios com mais de um grupamento cadastrado dividem cada série igualmente entre eles (por exemplo, 0,5 série para cada um de dois grupamentos).</p>}
          </section>
        </>
      )}

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
