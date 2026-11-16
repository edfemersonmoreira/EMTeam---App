import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { ytEmbed } from './Exercicios'
import Icone from './Icone'
import { mover, ultimasDatas } from './alongUtil'
import './along.css'

const MSG_MIGRACAO = 'Rode a migração da Etapa 7.2 no Supabase para usar esta seção. '

// ---------- Biblioteca de exercícios de alongamento e mobilidade ----------
const vazio = { nome: '', descricao: '', video_url: '' }

function Biblioteca() {
  const [lista, setLista] = useState([])
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState(null)
  const [aberto, setAberto] = useState(null)
  const [msg, setMsg] = useState('')

  async function carregar() {
    const { data, error } = await supabase.from('alongamentos').select('*').order('nome')
    if (error) setMsg(MSG_MIGRACAO + error.message); else setLista(data)
  }
  useEffect(() => { carregar() }, [])

  async function salvar(e) {
    e.preventDefault()
    const { id, criado_em, ativo, ...campos } = form
    Object.keys(campos).forEach(k => { if (campos[k] === '') campos[k] = null })
    const { error } = id
      ? await supabase.from('alongamentos').update(campos).eq('id', id)
      : await supabase.from('alongamentos').insert(campos)
    if (error) return setMsg(error.message)
    setForm(null); setMsg(''); carregar()
  }
  async function alternar(x) {
    await supabase.from('alongamentos').update({ ativo: !x.ativo }).eq('id', x.id)
    carregar()
  }

  const set = c => e => setForm({ ...form, [c]: e.target.value })
  const filtrados = lista.filter(x => x.nome.toLowerCase().includes(busca.toLowerCase()))

  if (form) return (
    <form onSubmit={salvar} className="card">
      <h3>{form.id ? 'Editar exercício' : 'Novo exercício de alongamento ou mobilidade'}</h3>
      <input placeholder="Nome" value={form.nome} onChange={set('nome')} required />
      <textarea rows="4" placeholder="Descrição e orientações" value={form.descricao || ''} onChange={set('descricao')} />
      <input placeholder="Link do vídeo no YouTube" value={form.video_url || ''} onChange={set('video_url')} />
      {form.video_url && !ytEmbed(form.video_url) && <p className="erro">Esse link do YouTube não foi reconhecido. Confira e tente de novo.</p>}
      {ytEmbed(form.video_url) && <iframe className="video" src={ytEmbed(form.video_url)} allowFullScreen title="Prévia do vídeo" />}
      {msg && <p className="erro">{msg}</p>}
      <div className="row">
        <button className="btn">Salvar exercício</button>
        <button type="button" className="btn sec" onClick={() => { setForm(null); setMsg('') }}>Cancelar</button>
      </div>
    </form>
  )

  return (
    <>
      <div className="row" style={{ marginTop: 0 }}>
        <input style={{ margin: 0 }} placeholder="Buscar exercício" value={busca} onChange={e => setBusca(e.target.value)} />
        <button className="btn" style={{ flex: 'none' }} onClick={() => setForm(vazio)}><Icone nome="mais" tam={18} />Novo</button>
      </div>
      {msg && <p className="erro">{msg}</p>}
      {filtrados.length === 0 && !msg && <p className="muted">Nenhum exercício cadastrado. Toque em Novo para começar.</p>}
      {filtrados.map(x => (
        <div key={x.id} className={'card' + (x.ativo ? '' : ' off')}>
          <div className="topo" style={{ cursor: 'pointer' }} onClick={() => setAberto(aberto === x.id ? null : x.id)}>
            <strong>{x.nome}</strong>
            {x.video_url && <span className="badge"><Icone nome="play" tam={12} /> Vídeo</span>}
          </div>
          {aberto === x.id && (
            <>
              {ytEmbed(x.video_url) && <iframe className="video" src={ytEmbed(x.video_url)} allowFullScreen title={x.nome} />}
              {x.descricao && <p>{x.descricao}</p>}
              <div className="row">
                <button className="btn sec" onClick={() => setForm(x)}>Editar</button>
                <button className="btn sec" onClick={() => alternar(x)}>{x.ativo ? 'Arquivar' : 'Reativar'}</button>
              </div>
            </>
          )}
        </div>
      ))}
    </>
  )
}

// ---------- Editor de uma sequência (ou de um modelo) ----------
function ItemSeq({ it, i, total, onMove, onRemove, onErro }) {
  const [o, setO] = useState(it.orientacao ?? '')
  async function salvar() {
    const { error } = await supabase.from('sequencia_alongamento_itens').update({ orientacao: o || null }).eq('id', it.id)
    onErro(error ? error.message : '')
  }
  return (
    <div className="item">
      <div className="topo">
        <strong>{it.alongamentos ? it.alongamentos.nome : ''}</strong>
        <div className="row" style={{ margin: 0 }}>
          <button className="mini" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label="Subir">↑</button>
          <button className="mini" disabled={i === total - 1} onClick={() => onMove(i, 1)} aria-label="Descer">↓</button>
          <button className="mini" onClick={() => onRemove(it)} aria-label="Remover">✕</button>
        </div>
      </div>
      <input placeholder="Orientação desta prescrição (por exemplo, 30 s de cada lado)" value={o} onChange={e => setO(e.target.value)} onBlur={salvar} />
    </div>
  )
}

function EditorSequencia({ id, onVoltar }) {
  const [seq, setSeq] = useState(null)
  const [itens, setItens] = useState([])
  const [biblioteca, setBiblioteca] = useState([])
  const [alunas, setAlunas] = useState([])
  const [acesso, setAcesso] = useState({})
  const [ultimas, setUltimas] = useState({})
  const [campos, setCampos] = useState({ nome: '', descricao: '' })
  const [adicionando, setAdicionando] = useState(false)
  const [busca, setBusca] = useState('')
  const [msg, setMsg] = useState('')

  async function carregar() {
    const s = await supabase.from('sequencias_alongamento').select('*').eq('id', id).single()
    if (s.error) return setMsg(s.error.message)
    setSeq(s.data); setCampos({ nome: s.data.nome, descricao: s.data.descricao || '' })
    const it = await supabase.from('sequencia_alongamento_itens')
      .select('*, alongamentos(nome, descricao, video_url)').eq('sequencia_id', id).order('ordem')
    if (it.error) return setMsg(it.error.message)
    setItens(it.data)
    if (!s.data.modelo) {
      const [al, ac, rg] = await Promise.all([
        supabase.from('profiles').select('id, nome, ativa').eq('papel', 'aluna').order('nome'),
        supabase.from('sequencia_alongamento_alunas').select('aluna_id').eq('sequencia_id', id),
        supabase.from('alongamento_registros').select('aluna_id, data, concluido').eq('sequencia_id', id).order('data', { ascending: false }).limit(300),
      ])
      setAlunas(al.data || [])
      setAcesso(Object.fromEntries((ac.data || []).map(x => [x.aluna_id, true])))
      setUltimas(ultimasDatas(rg.data || []))
    }
  }
  useEffect(() => {
    carregar()
    supabase.from('alongamentos').select('id, nome').eq('ativo', true).order('nome').then(({ data }) => setBiblioteca(data || []))
  }, [])

  async function salvarCampos() {
    if (!campos.nome.trim()) return setMsg('Dê um nome à sequência.')
    const { error } = await supabase.from('sequencias_alongamento').update({ nome: campos.nome.trim(), descricao: campos.descricao.trim() || null }).eq('id', id)
    setMsg(error ? error.message : '')
  }
  async function adicionar(a) {
    const { error } = await supabase.from('sequencia_alongamento_itens').insert({ sequencia_id: id, alongamento_id: a.id, ordem: itens.length })
    if (error) return setMsg(error.message)
    setMsg(''); setAdicionando(false); setBusca(''); carregar()
  }
  async function moverItem(i, d) {
    const arr = mover(itens, i, d)
    if (arr === itens) return
    await Promise.all(arr.map((x, idx) => supabase.from('sequencia_alongamento_itens').update({ ordem: idx }).eq('id', x.id)))
    carregar()
  }
  async function remover(it) {
    const { error } = await supabase.from('sequencia_alongamento_itens').delete().eq('id', it.id)
    if (error) return setMsg(error.message)
    carregar()
  }
  async function alternarAcesso(a) {
    const tem = !!acesso[a.id]
    const { error } = tem
      ? await supabase.from('sequencia_alongamento_alunas').delete().eq('sequencia_id', id).eq('aluna_id', a.id)
      : await supabase.from('sequencia_alongamento_alunas').insert({ sequencia_id: id, aluna_id: a.id })
    if (error) return setMsg(error.message)
    setAcesso({ ...acesso, [a.id]: !tem })
  }
  async function alternarAtiva() {
    await supabase.from('sequencias_alongamento').update({ ativa: !seq.ativa }).eq('id', id)
    carregar()
  }

  if (!seq) return <><button className="btn sec" onClick={onVoltar}>← Voltar</button><p className="muted">{msg || 'Carregando…'}</p></>
  const filtrados = biblioteca.filter(x => x.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 30)

  return (
    <>
      <button className="btn sec" onClick={onVoltar}>← Voltar</button>
      <h3>{seq.modelo ? 'Modelo de sequência' : 'Sequência'}</h3>
      <input placeholder="Nome da sequência" value={campos.nome} onChange={e => setCampos({ ...campos, nome: e.target.value })} onBlur={salvarCampos} />
      <textarea rows="2" placeholder="Descrição (opcional)" value={campos.descricao} onChange={e => setCampos({ ...campos, descricao: e.target.value })} onBlur={salvarCampos} />
      {msg && <p className="erro">{msg}</p>}

      <div className="card">
        <strong>Exercícios</strong>
        {itens.map((it, i) => <ItemSeq key={it.id} it={it} i={i} total={itens.length} onMove={moverItem} onRemove={remover} onErro={setMsg} />)}
        {itens.length === 0 && <p className="muted">Nenhum exercício nesta sequência ainda.</p>}
        <div className="row"><button className="btn" onClick={() => setAdicionando(!adicionando)}>+ Exercício</button></div>
        {adicionando && (
          <>
            <input placeholder="Buscar na biblioteca" value={busca} onChange={e => setBusca(e.target.value)} />
            <div className="pick">
              {filtrados.map(a => <div key={a.id} onClick={() => adicionar(a)}><strong>{a.nome}</strong></div>)}
              {filtrados.length === 0 && <div className="muted">Nada encontrado. Cadastre o exercício na aba Exercícios desta seção.</div>}
            </div>
          </>
        )}
      </div>

      {!seq.modelo && (
        <div className="card">
          <strong>Alunas com acesso</strong>
          <p className="muted">Só as alunas marcadas veem esta sequência na tela inicial.</p>
          {alunas.length === 0 && <p className="muted">Nenhuma aluna cadastrada.</p>}
          {alunas.map(a => (
            <label key={a.id} className="acesso-linha">
              <input type="checkbox" checked={!!acesso[a.id]} onChange={() => alternarAcesso(a)} />
              <span className="grow">{a.nome}{!a.ativa ? ' (inativa)' : ''}</span>
              <span className="muted">{ultimas[a.id] ? 'última vez em ' + new Date(ultimas[a.id] + 'T12:00:00').toLocaleDateString('pt-BR') : 'ainda não fez'}</span>
            </label>
          ))}
          <div className="row">
            <button className="btn sec" onClick={alternarAtiva}>{seq.ativa ? 'Desativar sequência' : 'Reativar sequência'}</button>
          </div>
        </div>
      )}
    </>
  )
}

// ---------- Listas de sequências e de modelos ----------
function Listas({ modelo, onAbrir }) {
  const [lista, setLista] = useState([])
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')

  async function carregar() {
    const { data, error } = await supabase.from('sequencias_alongamento')
      .select('*, sequencia_alongamento_itens(id), sequencia_alongamento_alunas(aluna_id)')
      .eq('modelo', modelo).order('criado_em', { ascending: false })
    if (error) setMsg(MSG_MIGRACAO + error.message); else setLista(data)
  }
  useEffect(() => { carregar() }, [modelo])

  async function nova() {
    const nome = window.prompt(modelo ? 'Nome do novo modelo:' : 'Nome da nova sequência:')
    if (!nome || !nome.trim()) return
    const { data, error } = await supabase.from('sequencias_alongamento').insert({ nome: nome.trim(), modelo }).select().single()
    if (error) return setMsg(error.message)
    onAbrir(data.id)
  }
  async function copiar(s, paraModelo) {
    const nome = window.prompt(paraModelo ? 'Nome do modelo:' : 'Nome da nova sequência:', s.nome)
    if (nome === null) return
    const { data, error } = await supabase.rpc('copiar_sequencia', { p_origem: s.id, p_nome: nome.trim(), p_modelo: paraModelo })
    if (error) return setMsg(error.message)
    setMsg(''); setOk(paraModelo ? 'Modelo salvo na aba Modelos.' : 'Sequência criada. Abra para escolher as alunas.')
    if (!paraModelo) onAbrir(data); else carregar()
  }
  async function excluir(s) {
    if (!window.confirm(`Excluir "${s.nome}"? Os registros já feitos pelas alunas continuam salvos.`)) return
    const { error } = await supabase.from('sequencias_alongamento').delete().eq('id', s.id)
    if (error) return setMsg(error.message)
    carregar()
  }

  return (
    <>
      <div className="row" style={{ marginTop: 0 }}>
        <span className="grow muted">{modelo ? 'Modelos para reutilizar. Eles não aparecem para as alunas.' : 'Sequências prescritas às alunas.'}</span>
        <button className="btn" style={{ flex: 'none' }} onClick={nova}><Icone nome="mais" tam={18} />{modelo ? 'Novo modelo' : 'Nova sequência'}</button>
      </div>
      {msg && <p className="erro">{msg}</p>}
      {ok && <p className="ok">{ok}</p>}
      {lista.length === 0 && !msg && <p className="muted">{modelo ? 'Nenhum modelo salvo ainda.' : 'Nenhuma sequência ainda.'}</p>}
      {lista.map(s => {
        const n = s.sequencia_alongamento_itens.length, a = s.sequencia_alongamento_alunas.length
        return (
          <div key={s.id} className={'card' + (s.ativa ? '' : ' off')}>
            <div className="topo">
              <div className="grow">
                <strong>{s.nome}</strong>
                <div className="muted">{n} {n === 1 ? 'exercício' : 'exercícios'}{!modelo ? `, ${a} ${a === 1 ? 'aluna' : 'alunas'}` : ''}{!s.ativa ? ', desativada' : ''}</div>
              </div>
            </div>
            <div className="row wrap">
              <button className="btn sec" onClick={() => onAbrir(s.id)}>Abrir</button>
              {!modelo && <button className="btn sec" onClick={() => copiar(s, true)}>Salvar como modelo</button>}
              {modelo && <button className="btn sec" onClick={() => copiar(s, false)}>Usar modelo</button>}
              <button className="btn sec" onClick={() => excluir(s)}>Excluir</button>
            </div>
          </div>
        )
      })}
    </>
  )
}

export default function Alongamentos() {
  const [aba, setAba] = useState('sequencias')
  const [aberta, setAberta] = useState(null)
  if (aberta) return <EditorSequencia id={aberta} onVoltar={() => setAberta(null)} />
  return (
    <>
      <h3>Alongamentos e flexibilidade</h3>
      <div className="chips">
        {[['sequencias', 'Sequências'], ['modelos', 'Modelos'], ['exercicios', 'Exercícios']].map(([k, t]) => (
          <button key={k} className={aba === k ? 'on' : ''} onClick={() => setAba(k)}>{t}</button>
        ))}
      </div>
      {aba === 'exercicios' ? <Biblioteca /> : <Listas key={aba} modelo={aba === 'modelos'} onAbrir={setAberta} />}
    </>
  )
}
