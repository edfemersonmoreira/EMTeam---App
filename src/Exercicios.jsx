import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Icone from './Icone'

export function ytEmbed(url) {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

export const GRUPOS = [
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraço', 'Abdômen', 'Lombar', 'Trapézio',
  'Quadríceps', 'Posterior de coxa', 'Glúteos', 'Adutores', 'Abdutores', 'Panturrilha', 'Cardio', 'Corpo inteiro',
]

const vazio = { nome: '', grupo_muscular: '', equipamento: '', video_url: '', orientacoes: '' }

export default function Exercicios() {
  const [lista, setLista] = useState([])
  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState('')
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
  const usados = lista.map(x => x.grupo_muscular).filter(Boolean)
  const gruposFiltro = [...GRUPOS.filter(g => usados.includes(g)), ...[...new Set(usados)].filter(g => !GRUPOS.includes(g))]
  const filtrados = lista.filter(x =>
    (!grupo || x.grupo_muscular === grupo) &&
    `${x.nome} ${x.grupo_muscular || ''}`.toLowerCase().includes(busca.toLowerCase()))

  if (form) {
    const opcoes = form.grupo_muscular && !GRUPOS.includes(form.grupo_muscular) ? [...GRUPOS, form.grupo_muscular] : GRUPOS
    return (
      <form onSubmit={salvar} className="card">
        <h3>{form.id ? 'Editar exercício' : 'Novo exercício'}</h3>
        <input placeholder="Nome do exercício" value={form.nome} onChange={set('nome')} required />
        <select value={form.grupo_muscular || ''} onChange={set('grupo_muscular')} aria-label="Grupo muscular">
          <option value="">Grupo muscular</option>
          {opcoes.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <input placeholder="Equipamento (por exemplo, barra ou halter)" value={form.equipamento || ''} onChange={set('equipamento')} />
        <input placeholder="Link do vídeo no YouTube" value={form.video_url || ''} onChange={set('video_url')} />
        {form.video_url && !ytEmbed(form.video_url) && <p className="erro">Esse link do YouTube não foi reconhecido. Confira e tente de novo.</p>}
        {ytEmbed(form.video_url) && <iframe className="video" src={ytEmbed(form.video_url)} allowFullScreen title="Prévia do vídeo" />}
        <textarea rows="4" placeholder="Orientações técnicas" value={form.orientacoes || ''} onChange={set('orientacoes')} />
        {msg && <p className="erro">{msg}</p>}
        <div className="row">
          <button className="btn">Salvar exercício</button>
          <button type="button" className="btn sec" onClick={() => { setForm(null); setMsg('') }}>Cancelar</button>
        </div>
      </form>
    )
  }

  return (
    <>
      <div className="row" style={{ marginTop: 0 }}>
        <input style={{ margin: 0 }} placeholder="Buscar por nome ou grupo muscular" value={busca} onChange={e => setBusca(e.target.value)} />
        <button className="btn" style={{ flex: 'none' }} onClick={() => setForm(vazio)}><Icone nome="mais" tam={18} />Novo</button>
      </div>
      {gruposFiltro.length > 0 && (
        <div className="faixa-chips">
          <button className={'chip' + (grupo === '' ? ' on' : '')} onClick={() => setGrupo('')}>Todos</button>
          {gruposFiltro.map(g => (
            <button key={g} className={'chip' + (grupo === g ? ' on' : '')} onClick={() => setGrupo(grupo === g ? '' : g)}>{g}</button>
          ))}
        </div>
      )}
      {msg && <p className="erro">{msg}</p>}
      {filtrados.length === 0 && <p className="muted">Nenhum exercício encontrado. Toque em Novo para cadastrar.</p>}
      {filtrados.map(ex => (
        <div key={ex.id} className={'card' + (ex.ativo ? '' : ' off')}>
          <div className="topo" style={{ cursor: 'pointer' }} onClick={() => setAberto(aberto === ex.id ? null : ex.id)}>
            <div className="grow">
              <strong>{ex.nome}</strong>
              <div className="muted">{[ex.grupo_muscular, ex.equipamento].filter(Boolean).join(', ')}</div>
            </div>
            {ex.video_url && <span className="badge"><Icone nome="play" tam={12} /> Vídeo</span>}
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
