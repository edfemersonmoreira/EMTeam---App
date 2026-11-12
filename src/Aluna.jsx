import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Executar from './Executar'
import Historico from './Historico'
import Avatar from './Avatar'
import Icone from './Icone'
import { WHATSAPP } from './config'

const ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const chaveDia = d => d.toLocaleDateString('sv-SE')
const zerar = d => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const ordenados = t => [...t.treino_exercicios].sort((a, b) => a.ordem - b.ordem)

export default function Aluna({ perfil }) {
  const [tela, setTela] = useState('home')
  const [ficha, setFicha] = useState(undefined)
  const [treinos, setTreinos] = useState([])
  const [feitos, setFeitos] = useState({})
  const [feitosHoje, setFeitosHoje] = useState({})
  const [mes, setMes] = useState(0)
  const [ultimoId, setUltimoId] = useState(null)
  const [escolher, setEscolher] = useState(false)
  const [exec, setExec] = useState(null)
  const [msg, setMsg] = useState('')

  async function carregar() {
    const f = await supabase.from('fichas').select('*').eq('aluna_id', perfil.id).eq('ativa', true).maybeSingle()
    if (f.error) return setMsg(f.error.message)
    setFicha(f.data)
    if (f.data) {
      const t = await supabase.from('treinos')
        .select('*, treino_exercicios(id, ordem, series, repeticoes, exercicios(nome, grupo_muscular))')
        .eq('ficha_id', f.data.id).order('ordem')
      if (t.error) return setMsg(t.error.message)
      setTreinos(t.data)
    } else {
      setTreinos([])
    }

    const hoje0 = zerar(new Date())
    const iniMes = new Date(hoje0.getFullYear(), hoje0.getMonth(), 1)
    const iniSemana = new Date(hoje0.getFullYear(), hoje0.getMonth(), hoje0.getDate() - ((hoje0.getDay() + 6) % 7))
    const desde = (iniMes < iniSemana ? iniMes : iniSemana).toISOString()
    const s = await supabase.from('sessoes').select('treino_id, finalizada_em')
      .eq('aluna_id', perfil.id).not('finalizada_em', 'is', null).gte('finalizada_em', desde)
    if (s.error) return setMsg(s.error.message)
    const fd = {}, fh = {}
    let n = 0
    ;(s.data || []).forEach(x => {
      const d = new Date(x.finalizada_em)
      fd[chaveDia(d)] = true
      if (chaveDia(d) === chaveDia(new Date()) && x.treino_id) fh[x.treino_id] = true
      if (d >= iniMes) n++
    })
    setFeitos(fd); setFeitosHoje(fh); setMes(n)

    const u = await supabase.from('sessoes').select('treino_id').eq('aluna_id', perfil.id)
      .not('finalizada_em', 'is', null).not('treino_id', 'is', null)
      .order('finalizada_em', { ascending: false }).limit(1).maybeSingle()
    setUltimoId(u.data ? u.data.treino_id : null)
  }
  useEffect(() => { carregar() }, [])

  if (exec) {
    return <Executar treino={exec} perfil={perfil} onSair={() => { setExec(null); setEscolher(false); carregar() }} />
  }
  if (tela === 'historico') {
    return <main><Historico alunaId={perfil.id} titulo="Histórico de cargas" onVoltar={() => setTela('home')} /></main>
  }

  const hoje0 = zerar(new Date())
  const temPlano = treinos.some(t => (t.dias || []).length > 0)
  let treinoHoje = null
  if (temPlano) {
    treinoHoje = treinos.find(t => (t.dias || []).includes(hoje0.getDay())) || null
  } else if (treinos.length) {
    const i = treinos.findIndex(t => t.id === ultimoId)
    treinoHoje = treinos[(i + 1) % treinos.length]
  }
  const concluidoHoje = treinoHoje
    ? (temPlano ? !!feitosHoje[treinoHoje.id] : Object.keys(feitosHoje).length > 0)
    : false

  const iniSemana = new Date(hoje0.getFullYear(), hoje0.getMonth(), hoje0.getDate() - ((hoje0.getDay() + 6) % 7))
  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(iniSemana.getFullYear(), iniSemana.getMonth(), iniSemana.getDate() + i)
    const dow = d.getDay()
    const t = temPlano ? (treinos.find(x => (x.dias || []).includes(dow)) || null) : null
    const feito = !!feitos[chaveDia(d)]
    const eHoje = chaveDia(d) === chaveDia(hoje0)
    let estado = 'descanso'
    if (feito) estado = 'feito'
    else if (t && d < hoje0) estado = 'falta'
    else if (t) estado = 'plan'
    return { i, dow, t, estado, eHoje }
  })

  const diaNome = hoje0.toLocaleDateString('pt-BR', { weekday: 'long' })
  const zapHref = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Olá! Sou ' + perfil.nome + ', da consultoria EM Team.')}`

  let bloco = null
  if (ficha === null) {
    bloco = <div className="bloco calmo"><h3>Você ainda não tem uma ficha ativa</h3><p className="muted">Fale com o seu treinador para receber o seu treino.</p></div>
  } else if (ficha && treinos.length === 0) {
    bloco = <div className="bloco calmo"><h3>Sua ficha ainda não tem treinos</h3><p className="muted">Assim que o seu treinador montar, eles aparecem aqui.</p></div>
  } else if (ficha && !treinoHoje) {
    bloco = <div className="bloco calmo"><h3>Hoje é dia de descanso</h3><p className="muted">Quer treinar mesmo assim? Toque em um dia da semana abaixo ou escolha um treino.</p></div>
  } else if (ficha && treinoHoje) {
    const ex = ordenados(treinoHoje)
    const resto = ex.length - 3
    bloco = (
      <div className="bloco">
        <div className="data">{concluidoHoje ? 'Concluído hoje' : (temPlano ? `Hoje, ${diaNome}` : 'Próximo treino')}</div>
        <h2>{treinoHoje.nome}</h2>
        <div className="previa">
          {ex.slice(0, 3).map(x => (
            <div key={x.id} className="linha-prev"><span>{x.exercicios ? x.exercicios.nome : ''}</span><strong>{x.series}×{x.repeticoes}</strong></div>
          ))}
        </div>
        {resto > 0 && <div className="data mais">e mais {resto} {resto === 1 ? 'exercício' : 'exercícios'}</div>}
        <button className="btn" onClick={() => setExec(treinoHoje)}>
          <Icone nome="play" tam={18} />{concluidoHoje ? 'Treinar de novo' : 'Iniciar treino'}
        </button>
      </div>
    )
  }

  return (
    <main className="home">
      <div className="perfil">
        <Avatar perfil={perfil} onErro={setMsg} />
        <div className="grow">
          <h2>Oi, {perfil.nome.split(' ')[0]}</h2>
          <div className="muted">{ficha ? ficha.nome : 'Sem ficha ativa'}{ficha ? `, ${mes} ${mes === 1 ? 'treino' : 'treinos'} neste mês` : ''}</div>
        </div>
      </div>
      {msg && <p className="erro">{msg}</p>}
      {ficha === undefined && !msg && <p className="muted">Carregando…</p>}

      {bloco}

      {treinos.length > 0 && (
        <button className="link-texto" onClick={() => setEscolher(!escolher)}>
          {escolher ? 'Fechar lista' : 'Escolher outro treino'}
        </button>
      )}
      {escolher && (
        <div className="lista-escolha">
          {treinos.map(t => (
            <button key={t.id} className="linha-ex" onClick={() => setExec(t)}>
              <span className="grow"><strong>{t.nome}</strong><span className="muted bl">{t.treino_exercicios.length} exercícios</span></span>
              <Icone nome="chevron" tam={16} />
            </button>
          ))}
        </div>
      )}

      <div className="semana">
        {semana.map(d => (
          <button key={d.i} disabled={!d.t} onClick={() => d.t && setExec(d.t)}
            className={`dia-sem ${d.estado}${d.eHoje ? ' hoje' : ''}`}
            aria-label={`${ABREV[d.dow]}${d.t ? ', ' + d.t.nome : ''}${d.estado === 'feito' ? ', feito' : d.estado === 'falta' ? ', não feito' : ''}`}>
            <span className="bola">
              {d.estado === 'feito' && <Icone nome="check" tam={16} />}
              {d.estado === 'falta' && <Icone nome="x" tam={15} />}
            </span>
            {ABREV[d.dow]}
          </button>
        ))}
      </div>
      <div className="legenda">
        <span><i className="pt feito" />Feito</span>
        <span><i className="pt falta" />Não feito</span>
      </div>

      <div className="atalhos">
        <button className="atalho" onClick={() => setTela('historico')}>
          <Icone nome="grafico" tam={22} />
          <span>Histórico de cargas</span>
        </button>
        {WHATSAPP && (
          <a className="atalho" href={zapHref} target="_blank" rel="noreferrer">
            <Icone nome="conversa" tam={22} />
            <span>Falar com o treinador</span>
          </a>
        )}
      </div>
    </main>
  )
}
