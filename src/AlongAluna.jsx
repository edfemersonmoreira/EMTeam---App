import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { mensagemErro } from './erros'
import { ytEmbed } from './Exercicios'
import Icone from './Icone'
import Voltar from './Voltar'
import { hojeLocal, chaveFeito, progresso } from './alongUtil'
import './along.css'

// Alongamentos e Flexibilidade: seção da aluna, separada da musculação.
// Usa somente as tabelas de alongamento: não altera o treino concluído do dia nem o histórico de cargas.
export default function AlongAluna({ perfil, onVoltar }) {
  const [seqs, setSeqs] = useState(null)
  const [sel, setSel] = useState(null)
  const [feitos, setFeitos] = useState({})
  const [aberto, setAberto] = useState(null)
  const [msg, setMsg] = useState('')
  const hoje = hojeLocal()

  async function carregar() {
    const s = await supabase.from('sequencias_alongamento')
      .select('id, nome, descricao, sequencia_alongamento_itens(id, ordem, orientacao, alongamento_id, alongamentos(nome, descricao, video_url))')
      .eq('ativa', true).eq('modelo', false).order('criado_em')
    if (s.error) return setMsg(mensagemErro(s.error))
    setSeqs(s.data)
    const r = await supabase.from('alongamento_registros').select('sequencia_id, alongamento_id, concluido')
      .eq('aluna_id', perfil.id).eq('data', hoje)
    const m = {}
    ;(r.data || []).forEach(x => { if (x.concluido) m[chaveFeito(x.sequencia_id, x.alongamento_id)] = true })
    setFeitos(m)
    if (s.data.length === 1) setSel(s.data[0].id)
  }
  useEffect(() => { carregar() }, [])

  async function alternar(seq, item) {
    const k = chaveFeito(seq.id, item.alongamento_id)
    const novo = !feitos[k]
    setFeitos(f => ({ ...f, [k]: novo }))
    const { error } = await supabase.from('alongamento_registros').upsert({
      aluna_id: perfil.id, sequencia_id: seq.id, alongamento_id: item.alongamento_id,
      data: hoje, concluido: novo, registrado_em: new Date().toISOString(),
    }, { onConflict: 'aluna_id,sequencia_id,alongamento_id,data' })
    if (error) { setFeitos(f => ({ ...f, [k]: !novo })); setMsg(mensagemErro(error)) } else setMsg('')
  }

  const seq = seqs && seqs.find(s => s.id === sel)
  const voltar = () => { if (seq && seqs.length > 1) { setSel(null); setAberto(null) } else onVoltar() }

  if (msg && !seqs) return <><Voltar soIcone onClick={onVoltar} /><p className="erro">{msg}</p></>
  if (!seqs) return <p className="muted">Carregando…</p>

  if (!seq) {
    return (
      <>
        <div className="topo-exec">
          <Voltar soIcone onClick={onVoltar} />
          <div className="grow"><h2 style={{ margin: 0 }}>Alongamentos e Flexibilidade</h2><div className="muted">Para fazer antes do treino</div></div>
        </div>
        {seqs.length === 0 && <p className="muted">Você ainda não tem sequências de alongamento. Fale com o seu treinador.</p>}
        <div className="lista-escolha">
          {seqs.map(s => {
            const p = progresso(s.sequencia_alongamento_itens, feitos, s.id)
            return (
              <button key={s.id} className="linha-ex" onClick={() => setSel(s.id)}>
                <span className={'num' + (p.completa ? ' ok' : '')}>{p.completa ? <Icone nome="check" tam={16} /> : <Icone nome="alongar" tam={16} />}</span>
                <span className="grow"><strong>{s.nome}</strong><span className="muted bl">{p.feitos} de {p.total} hoje</span></span>
                <Icone nome="chevron" tam={16} />
              </button>
            )
          })}
        </div>
      </>
    )
  }

  const p = progresso(seq.sequencia_alongamento_itens, feitos, seq.id)
  return (
    <>
      <div className="topo-exec">
        <Voltar soIcone onClick={voltar} />
        <div className="grow">
          <h2 style={{ margin: 0 }}>{seq.nome}</h2>
          <div className="muted">{p.feitos} de {p.total} concluídos hoje</div>
        </div>
      </div>
      {seq.descricao && <p className="muted">{seq.descricao}</p>}
      <div className="regua-prog" aria-hidden="true">
        {p.itens.map(it => <i key={it.id} className={feitos[chaveFeito(seq.id, it.alongamento_id)] ? 'f' : ''} />)}
      </div>
      {msg && <p className="erro">{msg}</p>}
      {p.completa && (
        <div className="bloco calmo" style={{ marginTop: 14 }}>
          <h3>Sequência concluída hoje</h3>
          <p className="muted">Pode seguir para o seu treino.</p>
        </div>
      )}
      {p.itens.length === 0 && <p className="muted">Esta sequência ainda não tem exercícios.</p>}
      {p.itens.map(it => {
        const a = it.alongamentos || {}
        const feito = !!feitos[chaveFeito(seq.id, it.alongamento_id)]
        const abre = aberto === it.id
        const emb = ytEmbed(a.video_url)
        return (
          <div key={it.id} className={'along-item' + (feito ? ' ok' : '') + (abre ? ' aberto' : '')}>
            <div className="along-topo">
              <button className={'chk' + (feito ? ' on' : '')} aria-pressed={feito} aria-label={`Marcar ${a.nome} como concluído`} onClick={() => alternar(seq, it)}>
                <Icone nome="check" tam={22} />
              </button>
              <button className="along-nome" onClick={() => setAberto(abre ? null : it.id)} aria-expanded={abre}>
                <strong>{a.nome}</strong>
                {it.orientacao && <span className="muted bl">{it.orientacao}</span>}
              </button>
              <span className="chev"><Icone nome="chevron" tam={16} /></span>
            </div>
            {abre && (
              <div className="along-corpo">
                {a.descricao && <p className="orient">{a.descricao}</p>}
                {emb ? <iframe className="video" src={emb} allowFullScreen title={a.nome} /> : <p className="muted">Sem vídeo para este exercício.</p>}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
