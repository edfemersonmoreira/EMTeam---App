import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function ytEmbed(url) {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

const vazio = { nome: '', grupo_muscular: '', equipamento: '', video_url: '', orientacoes: '' }

export default function Exercicios() {
  const [lista, setLista] = useState([])
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState('')
  const [aberto, setAberto] = useState(null)

  async function carregar() {
    const { data, error } = await supabase.from('exercicios').select('*').order('nome')
    if (error) setMsg(error.message)
    else setLista(data)
  }
  useEffect(() => { carregar() }, [])

  async function salvar(e) {
    e.preventDefault()
    const { id, criado_em, ativo, ...campos } = form
    Object.keys(campos).forEach(k => { if (campos[k] === '') campos[k] = null })
    const { error } = id
      ? await supabase.from('exercicios').update(campos).eq('id', id)
      : await supabase.from('exercicios').insert(campos)
    if (error) return setMsg(error.message)
    setForm(null); setMsg(''); carregar()
  }

  async function alternar(ex) {
    await supabase.from('exercicios').update({ ativo: !ex.ativo }).eq('id', ex.id)
    carregar()
  }

  const set = campo => e => setForm({ ...form, [campo]: e.target.value })
  const filtrados = lista.filter(x =>
    `${x.nome} ${x.grupo_muscular || ''}`.toLowerCase().includes(busca.toLowerCase()))

  if (form) return (
    <form onSubmit={salvar} className="card">
      <h3>{form.id ? 'Editar exercício' : 'Novo exercício'}</h3>
      <input placeholder="Nome do exercício" value={form.nome} onChange={set('nome')} required />
      <input placeholder="Grupo muscular (ex.: Glúteos)" value={form.grupo_muscular || ''} onChange={set('grupo_muscular')} />
      <input placeholder="Equipamento (ex.: Barra, Halter)" value={form.equipamento || ''} onChange={set('equipamento')} />
      <input placeholder="Link do vídeo no YouTube" value={form.video_url || ''} onChange={set('video_url')} />
      {form.video_url && !ytEmbed(form.video_url) && <p className="erro">Link do YouTube não reconhecido.</p>}
      {ytEmbed(form.video_url) && <iframe className="video" src={ytEmbed(form.video_url)} allowFullScreen title="prévia" />}
      <textarea rows="4" placeholder="Orientações técnicas" value={form.orientacoes || ''} onChange={set('orientacoes')} />
      {msg && <p className="erro">{msg}</p>}
      <div className="row">
        <button className="btn">Salvar</button>
        <button type="button" className="btn sec" onClick={() => { setForm(null); setMsg('') }}>Cancelar</button>
      </div>
    </form>
  )

  return (
    <>
      <div className="row">
        <input placeholder="Buscar por nome ou grupo muscular" value={busca} onChange={e => setBusca(e.target.value)} />
        <button className="btn" onClick={() => setForm(vazio)}>+ Novo</button>
      </div>
      {msg && <p className="erro">{msg}</p>}
      {filtrados.length === 0 && <p className="muted">Nenhum exercício encontrado.</p>}
      {filtrados.map(ex => (
        <div key={ex.id} className={'card' + (ex.ativo ? '' : ' off')}>
          <div className="row between" onClick={() => setAberto(aberto === ex.id ? null : ex.id)}>
            <div>
              <strong>{ex.nome}</strong>
              <div className="muted">{[ex.grupo_muscular, ex.equipamento].filter(Boolean).join(' · ')}</div>
            </div>
            <span>{ex.video_url ? '▶' : ''}</span>
          </div>
          {aberto === ex.id && (
            <>
              {ytEmbed(ex.video_url) && <iframe className="video" src={ytEmbed(ex.video_url)} allowFullScreen title={ex.nome} />}
              {ex.orientacoes && <p>{ex.orientacoes}</p>}
              <div className="row">
                <button className="btn sec" onClick={() => setForm(ex)}>Editar</button>
                <button className="btn sec" onClick={() => alternar(ex)}>{ex.ativo ? 'Arquivar' : 'Reativar'}</button>
              </div>
            </>
          )}
        </div>
      ))}
    </>
  )
}
