import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Editor from './Editor'

export default function Fichas({ aluna, onVoltar }) {
  const [fichas, setFichas] = useState([])
  const [alunas, setAlunas] = useState([])
  const [editar, setEditar] = useState(null)
  const [novo, setNovo] = useState(null)
  const [dup, setDup] = useState(null)
  const [destino, setDestino] = useState(aluna.id)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')

  async function carregar() {
    const { data, error } = await supabase.from('fichas').select('*')
      .eq('aluna_id', aluna.id).order('criado_em', { ascending: false })
    if (error) setMsg(error.message); else setFichas(data)
  }
  useEffect(() => {
    carregar()
    supabase.from('profiles').select('id, nome').eq('papel', 'aluna').order('nome')
      .then(({ data }) => setAlunas(data || []))
  }, [])

  async function criar(e) {
    e.preventDefault()
    const { data, error } = await supabase.from('fichas')
      .insert({ aluna_id: aluna.id, nome: novo.nome, objetivo: novo.objetivo || null, ativa: false })
      .select().single()
    if (error) return setMsg(error.message)
    await supabase.from('treinos').insert({ ficha_id: data.id, nome: 'Treino A', ordem: 0 })
    setNovo(null); setMsg(''); setEditar(data)
  }

  async function ativar(f) {
    setOk('')
    const a = await supabase.from('fichas').update({ ativa: false }).eq('aluna_id', aluna.id).eq('ativa', true)
    if (a.error) return setMsg(a.error.message)
    const b = await supabase.from('fichas').update({ ativa: true, arquivada_em: null }).eq('id', f.id)
    if (b.error) return setMsg(b.error.message)
    setMsg(''); carregar()
  }

  async function mudar(f, campos) {
    const { error } = await supabase.from('fichas').update(campos).eq('id', f.id)
    if (error) setMsg(error.message); else { setMsg(''); carregar() }
  }

  async function duplicar(e) {
    e.preventDefault()
    const { error } = await supabase.rpc('duplicar_ficha', {
      p_ficha_id: dup.id, p_aluna_destino: destino, p_nome: dup.novoNome || null,
    })
    if (error) return setMsg(error.message)
    const nomeDest = alunas.find(a => a.id === destino)?.nome
    setOk(destino === aluna.id ? 'Ficha duplicada (inativa).' : `Ficha copiada para ${nomeDest} (inativa).`)
    setDup(null); setMsg(''); carregar()
  }

  if (editar) return <Editor ficha={editar} onVoltar={() => { setEditar(null); carregar() }} />

  if (novo) return (
    <form onSubmit={criar} className="card">
      <h3>Nova ficha de {aluna.nome}</h3>
      <input placeholder="Nome da ficha (ex.: Hipertrofia - Ciclo 1)" value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} required />
      <input placeholder="Objetivo (opcional)" value={novo.objetivo} onChange={e => setNovo({ ...novo, objetivo: e.target.value })} />
      {msg && <p className="erro">{msg}</p>}
      <div className="row">
        <button className="btn">Criar e montar treinos</button>
        <button type="button" className="btn sec" onClick={() => setNovo(null)}>Cancelar</button>
      </div>
    </form>
  )

  if (dup) return (
    <form onSubmit={duplicar} className="card">
      <h3>Duplicar "{dup.nome}"</h3>
      <label className="muted">Copiar para:</label>
      <select value={destino} onChange={e => setDestino(e.target.value)}>
        {alunas.map(a => <option key={a.id} value={a.id}>{a.id === aluna.id ? `${a.nome} (mesma aluna)` : a.nome}</option>)}
      </select>
      <input placeholder="Nome da cópia (opcional)" value={dup.novoNome || ''} onChange={e => setDup({ ...dup, novoNome: e.target.value })} />
      {msg && <p className="erro">{msg}</p>}
      <div className="row">
        <button className="btn">Duplicar</button>
        <button type="button" className="btn sec" onClick={() => setDup(null)}>Cancelar</button>
      </div>
    </form>
  )

  return (
    <>
      <button className="btn sec" onClick={onVoltar}>← Voltar às alunas</button>
      <div className="topo" style={{ marginTop: 12 }}>
        <h3 style={{ margin: 0 }}>Fichas de {aluna.nome}</h3>
        <button className="btn" onClick={() => setNovo({ nome: '', objetivo: '' })}>+ Nova</button>
      </div>
      {msg && <p className="erro">{msg}</p>}
      {ok && <p className="ok">{ok}</p>}
      {fichas.length === 0 && <p className="muted">Nenhuma ficha ainda.</p>}
      {fichas.map(f => (
        <div key={f.id} className={'card' + (f.arquivada_em ? ' off' : '')}>
          <div className="topo">
            <strong>{f.nome}</strong>
            {f.ativa && <span className="badge">ativa</span>}
            {f.arquivada_em && <span className="muted">arquivada</span>}
          </div>
          {f.objetivo && <div className="muted">{f.objetivo}</div>}
          <div className="row wrap">
            <button className="btn sec" onClick={() => setEditar(f)}>Abrir</button>
            {!f.ativa && !f.arquivada_em && <button className="btn sec" onClick={() => ativar(f)}>Ativar</button>}
            {f.ativa && <button className="btn sec" onClick={() => mudar(f, { ativa: false })}>Desativar</button>}
            <button className="btn sec" onClick={() => { setDup({ ...f, novoNome: '' }); setDestino(aluna.id); setOk('') }}>Duplicar/copiar</button>
            {f.arquivada_em
              ? <button className="btn sec" onClick={() => mudar(f, { arquivada_em: null })}>Restaurar</button>
              : <button className="btn sec" onClick={() => mudar(f, { arquivada_em: new Date().toISOString(), ativa: false })}>Arquivar</button>}
          </div>
        </div>
      ))}
    </>
  )
}
