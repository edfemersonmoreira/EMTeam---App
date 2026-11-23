import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { mensagemErro } from './erros'
import Icone from './Icone'
import Categorias from './Categorias'
import Etiqueta from './Etiqueta'
import Menu from './Menu'
import { CabecalhoPagina } from './Cabecalho'

export function ytEmbed(url) {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

export const GRUPOS = [
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraço', 'Abdômen', 'Lombar', 'Trapézio',
  'Quadríceps', 'Posterior de coxa', 'Glúteos', 'Adutores', 'Abdutores', 'Panturrilha', 'Cardio', 'Corpo inteiro',
]

const vazio = { nome: '', grupo_muscular: '', video_url: '', orientacoes: '' }

export default function Exercicios() {
  const [lista, setLista] = useState([])
  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState('')
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState('')
  const [aberto, setAberto] = useState(null)
  const [mostrarCats, setMostrarCats] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const { data, error } = await supabase.from('exercicios').select('*').order('nome')
    if (error) setMsg(mensagemErro(error))
    else setLista(data)
  }
  useEffect(() => { carregar() }, [])

  async function salvar(e) {
    e.preventDefault()
    const { id, criado_em, ativo, equipamento, ...campos } = form      // equipamento não é mais usado: fica intacto no banco
    Object.keys(campos).forEach(k => { if (campos[k] === '') campos[k] = null })
    setSalvando(true)
    const { error } = id
      ? await supabase.from('exercicios').update(campos).eq('id', id)
      : await supabase.from('exercicios').insert(campos)
    setSalvando(false)
    if (error) return setMsg(mensagemErro(error))
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

  if (mostrarCats) return <Categorias onVoltar={() => setMostrarCats(false)} trilha={[{ rotulo: 'Exercícios', onClick: () => setMostrarCats(false) }, { rotulo: 'Tipos de série' }]} />

  if (form) {
    const opcoes = form.grupo_muscular && !GRUPOS.includes(form.grupo_muscular) ? [...GRUPOS, form.grupo_muscular] : GRUPOS
    return (
      <>
      <CabecalhoPagina trilha={[{ rotulo: 'Exercícios', onClick: () => { setForm(null); setMsg('') } }, { rotulo: form.id ? form.nome || 'Editar' : 'Novo exercício' }]} titulo={form.id ? 'Editar exercício' : 'Novo exercício'} />
      <form onSubmit={salvar} className="card form-estreito">
        <label className="campo-rotulo">Nome do exercício
          <input value={form.nome} onChange={set('nome')} required />
        </label>
        <label className="campo-rotulo">Grupo muscular
          <select value={form.grupo_muscular || ''} onChange={set('grupo_muscular')}>
            <option value="">Escolha o grupo muscular</option>
            {opcoes.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className="campo-rotulo">Link do vídeo no YouTube
          <input placeholder="https://youtu.be/…" value={form.video_url || ''} onChange={set('video_url')} />
        </label>
        {form.video_url && !ytEmbed(form.video_url) && <p className="erro">Esse link do YouTube não foi reconhecido. Confira e tente de novo.</p>}
        {ytEmbed(form.video_url) && <iframe className="video" src={ytEmbed(form.video_url)} allowFullScreen title="Prévia do vídeo" />}
        <label className="campo-rotulo">Orientações técnicas
          <textarea rows="4" value={form.orientacoes || ''} onChange={set('orientacoes')} />
        </label>
        {msg && <p className="erro">{msg}</p>}
        <div className="row">
          <button className="btn" disabled={salvando} aria-busy={salvando}>{salvando ? 'Salvando…' : 'Salvar exercício'}</button>
          <button type="button" className="btn sec" onClick={() => { setForm(null); setMsg('') }}>Cancelar</button>
        </div>
      </form>
      </>
    )
  }

  const ativos = lista.filter(x => x.ativo).length
  return (
    <>
      <CabecalhoPagina titulo="Exercícios" subtitulo={`${ativos} ativos de ${lista.length} · biblioteca usada nas fichas e nos modelos`}
        acoes={<>
          <button className="btn sec sm" onClick={() => setMostrarCats(true)}>Tipos de série</button>
          <button className="btn sm" onClick={() => setForm(vazio)}><Icone nome="mais" tam={18} />Novo exercício</button>
        </>} />
      <div className="ferramentas">
        <label className="busca">
          <Icone nome="busca" tam={18} />
          <input type="search" placeholder="Buscar por nome ou grupo muscular" aria-label="Buscar exercício" value={busca} onChange={e => setBusca(e.target.value)} />
        </label>
      </div>
      {gruposFiltro.length > 0 && (
        <div className="faixa-chips filtros-grupo" role="group" aria-label="Filtrar por grupo muscular">
          <button className={'chip' + (grupo === '' ? ' on' : '')} aria-pressed={grupo === ''} onClick={() => setGrupo('')}>Todos</button>
          {gruposFiltro.map(g => (
            <button key={g} className={'chip' + (grupo === g ? ' on' : '')} aria-pressed={grupo === g} onClick={() => setGrupo(grupo === g ? '' : g)}>{g}</button>
          ))}
        </div>
      )}
      {msg && <p className="erro">{msg}</p>}
      {filtrados.length === 0 && <p className="lista-vazia">Nenhum exercício encontrado. Use "Novo exercício" para cadastrar.</p>}
      {filtrados.length > 0 && (
        <div className="tabela-lista">
          <div className="tabela-cab" aria-hidden="true"><span>Exercício</span><span>Grupo muscular</span><span>Vídeo</span><span>Situação</span><span /></div>
          <ul>
            {filtrados.map(ex => {
              const abre = aberto === ex.id
              return (
                <li key={ex.id} className={'tabela-linha' + (ex.ativo ? '' : ' off') + (abre ? ' aberta' : '')}>
                  <button type="button" className="tl-nome" aria-expanded={abre} onClick={() => setAberto(abre ? null : ex.id)}>
                    <Icone nome="chevron" tam={14} /><strong>{ex.nome}</strong>
                  </button>
                  <span className="tl-grupo muted">{ex.grupo_muscular || '—'}</span>
                  <span className="tl-etis">
                  <span className="tl-video">{ex.video_url ? <Etiqueta tipo="sucesso"><Icone nome="play" tam={12} /> Vídeo</Etiqueta> : <span className="muted">Sem vídeo</span>}</span>
                  <span className="tl-sit">{ex.ativo ? <Etiqueta tipo="sucesso">Ativo</Etiqueta> : <Etiqueta>Arquivado</Etiqueta>}</span>
                  </span>
                  <span className="tl-acoes">
                    <button type="button" className="mini" onClick={() => setForm(ex)}>Editar</button>
                    <Menu rotulo={`Mais ações para ${ex.nome}`} itens={[{ rotulo: ex.ativo ? 'Arquivar exercício' : 'Reativar exercício', onClick: () => alternar(ex) }]} />
                  </span>
                  {abre && (
                    <div className="tl-detalhe">
                      {ytEmbed(ex.video_url) && <iframe className="video" src={ytEmbed(ex.video_url)} allowFullScreen title={ex.nome} />}
                      {ex.orientacoes ? <p>{ex.orientacoes}</p> : <p className="muted">Sem orientações técnicas.</p>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </>
  )
}
