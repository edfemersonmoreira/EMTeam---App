import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { mensagemErro } from './erros'
import { ytEmbed } from './Exercicios'
import Icone from './Icone'
import Menu from './Menu'
import { CabecalhoPagina } from './Cabecalho'
import Etiqueta from './Etiqueta'
import { useDialogo } from './Dialogo'
import { useSalvamento, StatusSalvo } from './Salvamento'
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
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const { data, error } = await supabase.from('alongamentos').select('*').order('nome')
    if (error) setMsg(MSG_MIGRACAO + error.message); else setLista(data)
  }
  useEffect(() => { carregar() }, [])

  async function salvar(e) {
    e.preventDefault()
    const { id, criado_em, ativo, ...campos } = form
    Object.keys(campos).forEach(k => { if (campos[k] === '') campos[k] = null })
    setSalvando(true)
    const { error } = id
      ? await supabase.from('alongamentos').update(campos).eq('id', id)
      : await supabase.from('alongamentos').insert(campos)
    setSalvando(false)
    if (error) return setMsg(mensagemErro(error))
    setForm(null); setMsg(''); carregar()
  }
  async function alternar(x) {
    await supabase.from('alongamentos').update({ ativo: !x.ativo }).eq('id', x.id)
    carregar()
  }

  const set = c => e => setForm({ ...form, [c]: e.target.value })
  const filtrados = lista.filter(x => x.nome.toLowerCase().includes(busca.toLowerCase()))

  if (form) return (
    <form onSubmit={salvar} className="card form-estreito">
      <h3 style={{ marginTop: 0 }}>{form.id ? 'Editar exercício' : 'Novo exercício de alongamento ou mobilidade'}</h3>
      <input placeholder="Nome" value={form.nome} onChange={set('nome')} required />
      <textarea rows="4" placeholder="Descrição e orientações" value={form.descricao || ''} onChange={set('descricao')} />
      <input placeholder="Link do vídeo no YouTube" value={form.video_url || ''} onChange={set('video_url')} />
      {form.video_url && !ytEmbed(form.video_url) && <p className="erro">Esse link do YouTube não foi reconhecido. Confira e tente de novo.</p>}
      {ytEmbed(form.video_url) && <iframe className="video" src={ytEmbed(form.video_url)} allowFullScreen title="Prévia do vídeo" />}
      {msg && <p className="erro">{msg}</p>}
      <div className="row">
        <button className="btn" disabled={salvando} aria-busy={salvando}>{salvando ? 'Salvando…' : 'Salvar exercício'}</button>
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
            <strong className="grow">{x.nome}</strong>
            {!x.ativo && <Etiqueta>Arquivado</Etiqueta>}
            {x.video_url && <Etiqueta tipo="sucesso"><Icone nome="play" tam={12} /> Vídeo</Etiqueta>}
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
  const salvo = useSalvamento()
  const salva = useRef(it.orientacao ?? null)
  const nome = it.alongamentos ? it.alongamentos.nome : 'exercício'
  async function salvar() {
    const novo = o || null
    if (novo === salva.current) return
    const erro = await salvo.rodar(async () => { const { error } = await supabase.from('sequencia_alongamento_itens').update({ orientacao: novo }).eq('id', it.id); return error ? mensagemErro(error) : '' })
    if (!erro) salva.current = novo
    onErro(erro)
  }
  return (
    <div className="item">
      <div className="topo">
        <strong>{it.alongamentos ? it.alongamentos.nome : ''}</strong>
        <div className="row" style={{ margin: 0 }}>
          <StatusSalvo s={salvo} />
          <button className="mini icone" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label={`Subir ${nome}`} title="Subir"><Icone nome="cima" tam={16} /></button>
          <button className="mini icone" disabled={i === total - 1} onClick={() => onMove(i, 1)} aria-label={`Descer ${nome}`} title="Descer"><Icone nome="baixo" tam={16} /></button>
          <button className="mini icone perigo" onClick={() => onRemove(it)} aria-label={`Remover ${nome}`} title="Remover"><Icone nome="x" tam={16} /></button>
        </div>
      </div>
      <input placeholder="Orientação desta prescrição (por exemplo, 30 s de cada lado)" value={o} onChange={e => setO(e.target.value)} onBlur={salvar} />
    </div>
  )
}

function EditorSequencia({ id, onVoltar, aba }) {
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
  const salvo = useSalvamento()
  const { confirmar } = useDialogo()
  const camposSalvos = useRef('')

  async function carregar() {
    const s = await supabase.from('sequencias_alongamento').select('*').eq('id', id).single()
    if (s.error) return setMsg(mensagemErro(s.error))
    setSeq(s.data); setCampos({ nome: s.data.nome, descricao: s.data.descricao || '' })
    camposSalvos.current = JSON.stringify({ nome: s.data.nome, descricao: s.data.descricao || null })
    const it = await supabase.from('sequencia_alongamento_itens')
      .select('*, alongamentos(nome, descricao, video_url)').eq('sequencia_id', id).order('ordem')
    if (it.error) return setMsg(mensagemErro(it.error))
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
    const dados = { nome: campos.nome.trim(), descricao: campos.descricao.trim() || null }
    const json = JSON.stringify(dados)
    if (json === camposSalvos.current) return
    const erro = await salvo.rodar(async () => { const { error } = await supabase.from('sequencias_alongamento').update(dados).eq('id', id); return error ? mensagemErro(error) : '' })
    if (!erro) camposSalvos.current = json
    setMsg(erro)
  }
  async function adicionar(a) {
    const { error } = await supabase.from('sequencia_alongamento_itens').insert({ sequencia_id: id, alongamento_id: a.id, ordem: itens.length })
    if (error) return setMsg(mensagemErro(error))
    setMsg(''); setAdicionando(false); setBusca(''); carregar()
  }
  async function moverItem(i, d) {
    const arr = mover(itens, i, d)
    if (arr === itens) return
    await Promise.all(arr.map((x, idx) => supabase.from('sequencia_alongamento_itens').update({ ordem: idx }).eq('id', x.id)))
    carregar()
  }
  async function remover(it) {
    if (!(await confirmar({ titulo: `Remover ${it.alongamentos ? it.alongamentos.nome : 'este exercício'}?`, texto: 'Sai desta sequência. Os registros já feitos pelas alunas continuam salvos.', acao: 'Remover', perigo: true }))) return
    const { error } = await supabase.from('sequencia_alongamento_itens').delete().eq('id', it.id)
    if (error) return setMsg(mensagemErro(error))
    carregar()
  }
  async function alternarAcesso(a) {
    const tem = !!acesso[a.id]
    const { error } = tem
      ? await supabase.from('sequencia_alongamento_alunas').delete().eq('sequencia_id', id).eq('aluna_id', a.id)
      : await supabase.from('sequencia_alongamento_alunas').insert({ sequencia_id: id, aluna_id: a.id })
    if (error) return setMsg(mensagemErro(error))
    setAcesso({ ...acesso, [a.id]: !tem })
  }
  async function alternarAtiva() {
    await supabase.from('sequencias_alongamento').update({ ativa: !seq.ativa }).eq('id', id)
    carregar()
  }

  const trilhaBase = [{ rotulo: 'Alongamentos', onClick: onVoltar }, { rotulo: (seq ? seq.modelo : aba === 'modelos') ? 'Modelos' : 'Sequências', onClick: onVoltar }]
  if (!seq) return <><CabecalhoPagina trilha={[...trilhaBase, { rotulo: 'Carregando…' }]} titulo="Sequência" /><p className="muted">{msg || 'Carregando…'}</p></>
  const filtrados = biblioteca.filter(x => x.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 30)

  return (
    <>
      <CabecalhoPagina trilha={[...trilhaBase, { rotulo: seq.nome }]} titulo={campos.nome || (seq.modelo ? 'Modelo de sequência' : 'Sequência')}
        subtitulo={seq.modelo ? 'Modelo de sequência: não aparece para as alunas.' : 'Sequência de alongamento prescrita às alunas marcadas.'}
        acoes={<span className="row" style={{ margin: 0 }}><StatusSalvo s={salvo} />{!seq.ativa && <Etiqueta>Desativada</Etiqueta>}</span>} />
      <div className="campos-seq">
      <label className="campo-rotulo">Nome da sequência
        <input value={campos.nome} onChange={e => setCampos({ ...campos, nome: e.target.value })} onBlur={salvarCampos} />
      </label>
      <label className="campo-rotulo">Descrição (opcional)
        <textarea rows="2" value={campos.descricao} onChange={e => setCampos({ ...campos, descricao: e.target.value })} onBlur={salvarCampos} />
      </label>
      </div>
      {msg && <p className="erro">{msg}</p>}

      <div className={seq.modelo ? '' : 'duas-colunas'}>
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
            <button className="btn sec sm" onClick={alternarAtiva}>{seq.ativa ? 'Desativar sequência' : 'Reativar sequência'}</button>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

// ---------- Listas de sequências e de modelos ----------
function Listas({ modelo, onAbrir }) {
  const [lista, setLista] = useState([])
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')
  const { confirmar, pedirTexto } = useDialogo()

  async function carregar() {
    const { data, error } = await supabase.from('sequencias_alongamento')
      .select('*, sequencia_alongamento_itens(id), sequencia_alongamento_alunas(aluna_id)')
      .eq('modelo', modelo).order('criado_em', { ascending: false })
    if (error) setMsg(MSG_MIGRACAO + error.message); else setLista(data)
  }
  useEffect(() => { carregar() }, [modelo])

  async function nova() {
    const nome = await pedirTexto({ titulo: modelo ? 'Novo modelo de sequência' : 'Nova sequência', rotulo: 'Nome', placeholder: 'Por exemplo, Mobilidade de quadril', acao: 'Criar' })
    if (!nome || !nome.trim()) return
    const { data, error } = await supabase.from('sequencias_alongamento').insert({ nome: nome.trim(), modelo }).select().single()
    if (error) return setMsg(mensagemErro(error))
    onAbrir(data.id)
  }
  async function copiar(s, paraModelo) {
    const nome = await pedirTexto({ titulo: paraModelo ? 'Salvar como modelo' : 'Usar modelo', texto: paraModelo ? 'O modelo fica na aba Modelos e não aparece para as alunas.' : 'Cria uma sequência nova a partir deste modelo. Depois, escolha as alunas.', rotulo: paraModelo ? 'Nome do modelo' : 'Nome da nova sequência', valor: s.nome, acao: paraModelo ? 'Salvar modelo' : 'Criar sequência' })
    if (nome === null) return
    const { data, error } = await supabase.rpc('copiar_sequencia', { p_origem: s.id, p_nome: nome.trim(), p_modelo: paraModelo })
    if (error) return setMsg(mensagemErro(error))
    setMsg(''); setOk(paraModelo ? 'Modelo salvo na aba Modelos.' : 'Sequência criada. Abra para escolher as alunas.')
    if (!paraModelo) onAbrir(data); else carregar()
  }
  async function excluir(s) {
    if (!(await confirmar({ titulo: `Excluir ${s.nome}?`, texto: 'Os registros já feitos pelas alunas continuam salvos.', acao: 'Excluir', perigo: true }))) return
    const { error } = await supabase.from('sequencias_alongamento').delete().eq('id', s.id)
    if (error) return setMsg(mensagemErro(error))
    carregar()
  }

  return (
    <>
      <div className="topo lista-topo">
        <span className="grow muted">{modelo ? 'Modelos para reutilizar. Eles não aparecem para as alunas.' : 'Sequências prescritas às alunas.'}</span>
        <button className="btn sm" style={{ flex: 'none' }} onClick={nova}><Icone nome="mais" tam={18} />{modelo ? 'Novo modelo' : 'Nova sequência'}</button>
      </div>
      {msg && <p className="erro">{msg}</p>}
      {ok && <p className="ok">{ok}</p>}
      {lista.length === 0 && !msg && <p className="lista-vazia">{modelo ? 'Nenhum modelo salvo ainda.' : 'Nenhuma sequência ainda.'}</p>}
      <div className="grade-cartoes">
      {lista.map(s => {
        const n = s.sequencia_alongamento_itens.length, a = s.sequencia_alongamento_alunas.length
        return (
          <div key={s.id} className={'card' + (s.ativa ? '' : ' off')}>
            <div className="topo">
              <div className="grow">
                <strong>{s.nome}</strong>
                <div className="muted">{n} {n === 1 ? 'exercício' : 'exercícios'}{!modelo ? `, ${a} ${a === 1 ? 'aluna' : 'alunas'}` : ''}</div>
              </div>
              {!s.ativa && <Etiqueta>Desativada</Etiqueta>}
            </div>
            <div className="acoes-cartao">
              {modelo
                ? <><button className="btn sm" onClick={() => copiar(s, false)}>Usar modelo</button><button className="btn sec sm" onClick={() => onAbrir(s.id)}>Editar</button></>
                : <button className="btn sm" onClick={() => onAbrir(s.id)}>Abrir</button>}
              <Menu rotulo={`Mais ações para ${s.nome}`} itens={[
                { rotulo: 'Salvar como modelo', onClick: () => copiar(s, true), oculto: modelo },
                { rotulo: modelo ? 'Excluir modelo' : 'Excluir sequência', onClick: () => excluir(s), perigo: true },
              ]} />
            </div>
          </div>
        )
      })}
      </div>
    </>
  )
}

export default function Alongamentos() {
  const [aba, setAba] = useState('sequencias')
  const [aberta, setAberta] = useState(null)
  if (aberta) return <EditorSequencia id={aberta} aba={aba} onVoltar={() => setAberta(null)} />
  return (
    <>
      <CabecalhoPagina titulo="Alongamentos e flexibilidade" subtitulo="Sequências prescritas às alunas, modelos para reutilizar e a biblioteca de exercícios de mobilidade." />
      <div className="chips abas" role="tablist" aria-label="Seções de alongamentos">
        {[['sequencias', 'Sequências'], ['modelos', 'Modelos'], ['exercicios', 'Exercícios']].map(([k, t]) => (
          <button key={k} role="tab" aria-selected={aba === k} className={aba === k ? 'on' : ''} onClick={() => setAba(k)}>{t}</button>
        ))}
      </div>
      {aba === 'exercicios' ? <Biblioteca /> : <Listas key={aba} modelo={aba === 'modelos'} onAbrir={setAberta} />}
    </>
  )
}
