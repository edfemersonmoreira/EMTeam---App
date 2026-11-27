import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { mensagemErro } from './erros'
import Icone from './Icone'
import Menu from './Menu'
import Voltar from './Voltar'
import { CabecalhoPagina } from './Cabecalho'
import { useDialogo } from './Dialogo'
import { useSalvamento, StatusSalvo } from './Salvamento'
import Categorias from './Categorias'
import CategoriaTreino from './CategoriaTreino'
import { Bloco } from './Editor'
import { inserirExercicios, linhasDoModelo } from './prescricao'
import { mover, descreverBlocos } from './seriesUtil'
import CampoOrientacoes from './Orientacoes'
import { GruposPrescricao, PainelVolume } from './VolumeGrupos'
import Etiqueta from './Etiqueta'
import { unidades, moverUnidade, podeFazerBiset, novoGrupo } from './bisetUtil'
import './series.css'
import './modelos.css'

const MSG_MIGRACAO = 'Rode a migração da Etapa 8 no Supabase para usar categorias de modelos. '
const chave = () => Math.random().toString(36).slice(2)

// Blocos de um item de modelo (com chave estável para a tela). Item antigo, sem blocos, vira um bloco Principal.
const blocosDe = (it, principalId) => {
  const base = Array.isArray(it.blocos) && it.blocos.length
    ? it.blocos
    : [{ series: it.series || 3, repeticoes: it.repeticoes || '10', descanso_seg: it.descanso_seg ?? null, carga: null, observacao: null }]
  return base.map(b => ({ ...b, categoria_id: b.categoria_id || principalId || '', _k: b._k || chave() }))
}
const limpar = blocos => blocos.map(({ _k, ...b }) => b)

function useCategorias() {
  const [cats, setCats] = useState([])
  const [catsTreino, setCatsTreino] = useState([])
  const [pronto, setPronto] = useState(false)
  async function recarregar() {
    const a = await supabase.from('categorias_serie').select('*').order('ordem')
    setCats(a.error ? [] : a.data)
    const b = await supabase.from('categorias_treino').select('*').eq('ativa', true).order('ordem')   // só existe depois da migração da Etapa 8
    setCatsTreino(b.error ? [] : b.data)
    setPronto(true)
  }
  useEffect(() => { recarregar() }, [])
  return { cats, catsTreino, pronto, recarregar }
}

// ---------- Exercício dentro do modelo ----------
function ItemModelo({ it, i, cats, onMove, onRemove, onErro, onAtualizar, onGerenciar, podeSubir, podeDescer, biset, podeBiset, onBiset, onDesfazerBiset, onTrocarBiset }) {
  const principal = cats.find(c => c.principal)
  const [blocos, setBlocos] = useState(() => blocosDe(it, principal && principal.id))
  const [obs, setObs] = useState(it.observacao ?? '')
  const salvo = useSalvamento()
  const { confirmar } = useDialogo()
  const nome = it.exercicios ? it.exercicios.nome : 'exercício'
  const [comObs, setComObs] = useState(!!it.observacao)

  async function persistir(novos) {
    setBlocos(novos)
    const p = novos.find(b => { const c = cats.find(x => x.id === b.categoria_id); return c && c.principal }) || novos[0]
    const erro = await salvo.rodar(async () => {
      const { error } = await supabase.from('modelo_itens').update({
        blocos: limpar(novos), series: p.series || 1, repeticoes: p.repeticoes || '10', descanso_seg: p.descanso_seg ?? null,
      }).eq('id', it.id)
      return error ? mensagemErro(error) : ''
    })
    if (!erro) onAtualizar(it.id, { blocos: limpar(novos) })   // atualiza o volume por grupamento do modelo
    return erro
  }
  const salvarBloco = async (k, campos) => persistir(blocos.map(b => (b._k === k ? { ...b, ...campos } : b)))
  async function addBloco() {
    const temPrincipal = blocos.some(b => principal && b.categoria_id === principal.id)
    const alvo = !temPrincipal ? principal : (cats.find(c => c.ativa && !c.principal) || principal)
    if (!alvo) return onErro('Cadastre uma categoria de série primeiro.')
    onErro(await persistir([...blocos, { _k: chave(), categoria_id: alvo.id, series: 1, repeticoes: '10', descanso_seg: 60, carga: null, observacao: null }]))
  }
  async function moverBloco(j, d) { onErro(await persistir(mover(blocos, j, d))) }
  async function removerBloco(b) {
    if (blocos.length <= 1) return onErro('O exercício precisa ter pelo menos um tipo de série.')
    const cat = cats.find(c => c.id === b.categoria_id)
    if (!(await confirmar({ titulo: `Remover ${cat ? cat.nome.toLowerCase() : 'este tipo de série'}?`, texto: `Sai de ${nome} neste modelo.`, acao: 'Remover', perigo: true }))) return
    onErro(await persistir(blocos.filter(x => x._k !== b._k)))
  }
  const obsSalva = useRef(it.observacao ?? null)
  async function salvarObs() {
    const novo = obs || null
    if (novo === obsSalva.current) return
    const erro = await salvo.rodar(async () => { const { error } = await supabase.from('modelo_itens').update({ observacao: novo }).eq('id', it.id); return error ? mensagemErro(error) : '' })
    if (!erro) obsSalva.current = novo
  }

  return (
    <div className="item">
      <div className="topo">
        <strong>{i + 1}. {it.exercicios ? it.exercicios.nome : ''}</strong>
        <div className="row" style={{ margin: 0 }}>
          <StatusSalvo s={salvo} />
          <button className="mini icone" disabled={!podeSubir} onClick={() => onMove(i, -1)} aria-label={biset ? `Subir o bi-set com ${nome}` : `Subir ${nome}`} title="Subir"><Icone nome="cima" tam={16} /></button>
          <button className="mini icone" disabled={!podeDescer} onClick={() => onMove(i, 1)} aria-label={biset ? `Descer o bi-set com ${nome}` : `Descer ${nome}`} title="Descer"><Icone nome="baixo" tam={16} /></button>
          <Menu rotulo={`Mais ações para ${nome}`} itens={[
            { rotulo: 'Fazer bi-set com o próximo exercício', onClick: () => onBiset(i), oculto: !podeBiset },
            { rotulo: 'Trocar a ordem do bi-set', onClick: () => onTrocarBiset(it), oculto: !biset },
            { rotulo: 'Desfazer bi-set', onClick: () => onDesfazerBiset(it), oculto: !biset },
            { rotulo: 'Remover exercício', onClick: () => onRemove(it), perigo: true },
          ]} />
        </div>
      </div>
      {biset === 'primeiro' && <p className="biset-nota">Sem intervalo depois deste: a aluna segue direto para o próximo exercício.</p>}
      {biset === 'segundo' && <p className="biset-nota">O descanso deste exercício vale para o bi-set inteiro.</p>}
      {blocos.map((b, j) => (
        <Bloco key={b._k} b={b} i={j} total={blocos.length} cats={cats} onMove={moverBloco} onRemove={removerBloco}
          onErro={onErro} onGerenciar={onGerenciar} onSalvar={campos => salvarBloco(b._k, campos)} />
      ))}
      <GruposPrescricao doLivro={it.exercicios?.grupo_muscular} principal={it.grupo_principal} secundarios={it.grupos_secundarios} nome={nome}
        salvar={async campos => {
          const erro = await salvo.rodar(async () => { const { error } = await supabase.from('modelo_itens').update(campos).eq('id', it.id); return error ? mensagemErro(error) : '' })
          if (!erro) onAtualizar(it.id, campos)
          return erro
        }} />
      <CampoOrientacoes valor={it.orientacoes} daBiblioteca={it.exercicios?.orientacoes} nome={nome}
        salvar={novo => salvo.rodar(async () => { const { error } = await supabase.from('modelo_itens').update({ orientacoes: novo }).eq('id', it.id); return error ? mensagemErro(error) : '' })} />
      {comObs && <input className="item-obs" placeholder="Observação geral do exercício (opcional)" aria-label={`Observação geral de ${nome}`} value={obs} onChange={e => setObs(e.target.value)} onBlur={salvarObs} autoFocus={!it.observacao} />}
      <div className="item-rodape">
        <button type="button" className="mini" onClick={addBloco}><Icone nome="mais" tam={14} /> Tipo de série</button>
        {!comObs && <button type="button" className="mini" onClick={() => setComObs(true)}><Icone nome="mais" tam={14} /> Observação do exercício</button>}
      </div>
    </div>
  )
}

// ---------- Editor de um modelo ----------
function EditorModelo({ id, onVoltar }) {
  const { cats, catsTreino, pronto } = useCategorias()
  const [modelo, setModelo] = useState(null)
  const [itens, setItens] = useState([])
  const [biblioteca, setBiblioteca] = useState([])
  const [sugestoes, setSugestoes] = useState([])
  const [campos, setCampos] = useState({ nome: '', categoria: '', categoria_treino_id: '' })
  const [adicionando, setAdicionando] = useState(false)
  const [busca, setBusca] = useState('')
  const [gerenciar, setGerenciar] = useState(false)
  const [msg, setMsg] = useState('')
  const [recarga, setRecarga] = useState(0)
  const salvo = useSalvamento()
  const { confirmar } = useDialogo()
  const migrado = !!modelo && 'categoria' in modelo   // false enquanto a migração da Etapa 8 não foi rodada

  async function carregar() {
    const m = await supabase.from('modelos').select('*').eq('id', id).single()
    if (m.error) return setMsg(mensagemErro(m.error))
    setModelo(m.data)
    setCampos({ nome: m.data.nome, categoria: m.data.categoria || '', categoria_treino_id: m.data.categoria_treino_id || '' })
    const it = await supabase.from('modelo_itens').select('*, exercicios(nome, grupo_muscular, orientacoes)').eq('modelo_id', id).order('ordem')
    if (it.error) return setMsg(mensagemErro(it.error))
    setItens(it.data); setRecarga(r => r + 1)
  }
  useEffect(() => {
    carregar()
    supabase.from('exercicios').select('id, nome, grupo_muscular, orientacoes').eq('ativo', true).order('nome').then(({ data }) => setBiblioteca(data || []))
    supabase.from('modelos').select('categoria').then(({ data }) => setSugestoes([...new Set((data || []).map(x => x.categoria).filter(Boolean))]))
  }, [])

  async function salvarCampos(novo = {}) {
    const x = { ...campos, ...novo }
    setCampos(x)
    if (!x.nome.trim()) return setMsg('Dê um nome ao modelo.')
    const dados = { nome: x.nome.trim() }
    if (migrado) { dados.categoria = x.categoria.trim() || null; dados.categoria_treino_id = x.categoria_treino_id || null; dados.atualizado_em = new Date().toISOString() }
    const erro = await salvo.rodar(async () => { const { error } = await supabase.from('modelos').update(dados).eq('id', id); return error ? mensagemErro(error) : '' })
    setMsg(erro || (!migrado && (novo.categoria !== undefined || novo.categoria_treino_id !== undefined) ? MSG_MIGRACAO : ''))
  }
  async function adicionar(ex) {
    const principal = cats.find(c => c.principal)
    const bloco = { categoria_id: principal ? principal.id : null, series: 3, repeticoes: '10', descanso_seg: 60, carga: null, observacao: null }
    const { error } = await supabase.from('modelo_itens').insert({
      modelo_id: id, exercicio_id: ex.id, ordem: itens.length, series: 3, repeticoes: '10', descanso_seg: 60, blocos: [bloco],
      orientacoes: ex.orientacoes || '',   // copiadas da biblioteca; vazio se não houver
    })
    if (error) return setMsg(mensagemErro(error))
    setMsg(''); setAdicionando(false); setBusca(''); carregar()
  }
  // Um bi-set se move inteiro, como no editor de fichas
  async function moverItem(i, d) {
    const arr = moverUnidade(itens, i, d)
    if (arr === itens) return
    await Promise.all(arr.map((x, idx) => (x.ordem !== idx ? supabase.from('modelo_itens').update({ ordem: idx }).eq('id', x.id) : null)))
    carregar()
  }
  const parDe = it => (it.biset_grupo ? itens.find(x => x.biset_grupo === it.biset_grupo && x.id !== it.id) : null)
  async function remover(it) {
    const par = parDe(it)
    const texto = `Sai deste modelo.${par ? ` O bi-set com ${par.exercicios ? par.exercicios.nome : 'o outro exercício'} é desfeito.` : ''} As fichas que já receberam o modelo não mudam.`
    if (!(await confirmar({ titulo: `Remover ${it.exercicios ? it.exercicios.nome : 'este exercício'}?`, texto, acao: 'Remover', perigo: true }))) return
    const { error } = await supabase.from('modelo_itens').delete().eq('id', it.id)
    if (error) return setMsg(mensagemErro(error))
    if (par) await supabase.from('modelo_itens').update({ biset_grupo: null }).eq('id', par.id)
    carregar()
  }
  async function fazerBiset(i) {
    if (!podeFazerBiset(itens, i)) return
    const g = novoGrupo()
    const r = await Promise.all([itens[i], itens[i + 1]].map(x => supabase.from('modelo_itens').update({ biset_grupo: g }).eq('id', x.id)))
    const falha = r.find(x => x.error)
    if (falha) return setMsg(mensagemErro(falha.error))
    setMsg(''); carregar()
  }
  async function desfazerBiset(it) {
    const { error } = await supabase.from('modelo_itens').update({ biset_grupo: null }).eq('modelo_id', id).eq('biset_grupo', it.biset_grupo)
    if (error) return setMsg(mensagemErro(error))
    setMsg(''); carregar()
  }
  async function trocarBiset(it) {
    const par = parDe(it)
    if (!par) return
    const r = await Promise.all([supabase.from('modelo_itens').update({ ordem: par.ordem }).eq('id', it.id), supabase.from('modelo_itens').update({ ordem: it.ordem }).eq('id', par.id)])
    const falha = r.find(x => x.error)
    if (falha) return setMsg(mensagemErro(falha.error))
    setMsg(''); carregar()
  }

  if (gerenciar) return <Categorias onVoltar={() => setGerenciar(false)} />
  const trilhaModelo = [{ rotulo: 'Modelos de treino', onClick: onVoltar }]
  if (!modelo || !pronto) return <><CabecalhoPagina trilha={[...trilhaModelo, { rotulo: 'Carregando…' }]} titulo="Modelo de treino" /><p className="muted">{msg || 'Carregando…'}</p></>
  const filtrados = biblioteca.filter(x => `${x.nome} ${x.grupo_muscular || ''}`.toLowerCase().includes(busca.toLowerCase())).slice(0, 30)

  return (
    <>
      <CabecalhoPagina trilha={[...trilhaModelo, { rotulo: modelo.nome }]} titulo={campos.nome || 'Modelo de treino'} subtitulo="As alterações salvam sozinhas ao sair de cada campo." acoes={<StatusSalvo s={salvo} />} />
      <div className="campos-modelo">
        <label className="campo-rotulo">Nome do modelo
          <input value={campos.nome} onChange={e => setCampos({ ...campos, nome: e.target.value })} onBlur={() => salvarCampos()} />
        </label>
        <label className="campo-rotulo">Categoria (opcional)
          <input list="categorias-modelo" placeholder="Por exemplo, Hipertrofia" value={campos.categoria} disabled={!migrado}
            onChange={e => setCampos({ ...campos, categoria: e.target.value })} onBlur={() => salvarCampos()} />
        </label>
        <datalist id="categorias-modelo">{sugestoes.map(s => <option key={s} value={s} />)}</datalist>
        {migrado && catsTreino.length > 0 && (
          <label className="campo-rotulo">Tipo de treino
          <select value={campos.categoria_treino_id} onChange={e => salvarCampos({ categoria_treino_id: e.target.value })}>
            <option value="">Superiores ou inferiores</option>
            {catsTreino.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          </label>
        )}
      </div>
      {!migrado && <p className="muted">Categorias do modelo e tipo de treino ficam disponíveis depois da migração da Etapa 8 no Supabase.</p>}
      {msg && <p className="erro">{msg}</p>}

      <section className="card">
        <div className="topo"><strong>Exercícios do modelo</strong><span className="muted">{itens.length}</span></div>
        <div>
          {(() => {
            const us = unidades(itens)
            const item = (it, i, u, k, pos) => (
              <ItemModelo key={it.id + ':' + recarga} it={it} i={i} cats={cats} onMove={moverItem} onRemove={remover}
                onAtualizar={(id, campos) => setItens(xs => xs.map(x => (x.id === id ? { ...x, ...campos } : x)))}
                onErro={setMsg} onGerenciar={() => setGerenciar(true)}
                podeSubir={k > 0} podeDescer={k < us.length - 1}
                biset={u.tipo === 'biset' ? (pos === 0 ? 'primeiro' : 'segundo') : null}
                podeBiset={podeFazerBiset(itens, i)} onBiset={fazerBiset} onDesfazerBiset={desfazerBiset} onTrocarBiset={trocarBiset} />
            )
            return us.map((u, k) => u.tipo === 'biset' ? (
              <div key={u.grupo} className="biset-grupo" role="group" aria-label={`Bi-set: ${u.itens.map(x => x.exercicios ? x.exercicios.nome : '').join(' e ')}`}>
                <div className="biset-cab"><Etiqueta tipo="destaque">Bi-set</Etiqueta><span className="muted pequeno">Os dois em sequência, sem intervalo entre eles</span></div>
                {u.itens.map((it, pos) => item(it, u.inicio + pos, u, k, pos))}
              </div>
            ) : item(u.itens[0], u.inicio, u, k, 0))
          })()}
          {itens.length === 0 && <p className="muted">Nenhum exercício neste modelo ainda.</p>}
          <PainelVolume itens={itens} cats={cats} />
          <div className="row"><button className="btn" onClick={() => setAdicionando(!adicionando)}>+ Exercício</button></div>
          {adicionando && (
            <>
              <input placeholder="Buscar exercício" value={busca} onChange={e => setBusca(e.target.value)} />
              <div className="pick">
                {filtrados.map(ex => <div key={ex.id} onClick={() => adicionar(ex)}><strong>{ex.nome}</strong> <span className="muted">{ex.grupo_muscular}</span></div>)}
                {filtrados.length === 0 && <div className="muted">Nada encontrado. Cadastre o exercício na aba Exercícios.</div>}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}

// ---------- Inserir um modelo na ficha de uma aluna (sempre uma cópia independente) ----------
function InserirModelo({ modelo, cats, onFechar }) {
  const [itens, setItens] = useState([])
  const [alunas, setAlunas] = useState([])
  const [alunaId, setAlunaId] = useState('')
  const [fichas, setFichas] = useState([])
  const [fichaId, setFichaId] = useState('')
  const [treinos, setTreinos] = useState([])
  const [treinoId, setTreinoId] = useState('novo')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    supabase.from('modelo_itens').select('*, exercicios(nome)').eq('modelo_id', modelo.id).order('ordem').then(({ data }) => setItens(data || []))
    supabase.from('profiles').select('id, nome').eq('papel', 'aluna').order('nome').then(({ data }) => setAlunas(data || []))
  }, [])
  useEffect(() => {
    setFichaId(''); setFichas([]); setTreinos([]); setTreinoId('novo')
    if (!alunaId) return
    supabase.from('fichas').select('id, nome, ativa, arquivada_em').eq('aluna_id', alunaId).order('criado_em', { ascending: false }).then(({ data }) => setFichas(data || []))
  }, [alunaId])
  useEffect(() => {
    setTreinos([]); setTreinoId('novo')
    if (!fichaId) return
    supabase.from('treinos').select('id, nome, ordem').eq('ficha_id', fichaId).order('ordem').then(({ data }) => setTreinos(data || []))
  }, [fichaId])

  async function inserir() {
    setSalvando(true); setMsg(''); setOk('')
    let alvo = treinoId, base = 0, nomeAlvo = ''
    if (treinoId === 'novo') {
      const novo = { ficha_id: fichaId, nome: modelo.nome, ordem: treinos.length }
      if (modelo.categoria_treino_id) novo.categoria_id = modelo.categoria_treino_id
      const { data, error } = await supabase.from('treinos').insert(novo).select('id, nome').single()
      if (error) { setSalvando(false); return setMsg(mensagemErro(error)) }
      alvo = data.id; nomeAlvo = data.nome
    } else {
      const c = await supabase.from('treino_exercicios').select('id', { count: 'exact', head: true }).eq('treino_id', treinoId)
      base = c.count || 0
      nomeAlvo = (treinos.find(t => t.id === treinoId) || {}).nome || ''
      if (modelo.categoria_treino_id) {
        const t = await supabase.from('treinos').select('categoria_id').eq('id', treinoId).single()
        if (t.data && !t.data.categoria_id) await supabase.from('treinos').update({ categoria_id: modelo.categoria_treino_id }).eq('id', treinoId)
      }
    }
    const erro = await inserirExercicios(alvo, base, linhasDoModelo(itens), cats)
    if (erro) {
      // Nada fica pela metade: remove o treino que acabou de ser criado (o inserirExercicios já desfaz os exercícios copiados)
      if (treinoId === 'novo') await supabase.from('treinos').delete().eq('id', alvo)
      setSalvando(false)
      return setMsg('Não foi possível inserir o modelo e nada foi alterado na ficha. ' + mensagemErro(erro, ''))
    }
    setSalvando(false)
    setOk(`Pronto. A ficha recebeu uma cópia independente em "${nomeAlvo}". Alterar o modelo depois não muda esse treino.`)
  }

  return (
    <>
      <CabecalhoPagina trilha={[{ rotulo: 'Modelos de treino', onClick: onFechar }, { rotulo: modelo.nome }, { rotulo: 'Inserir em ficha' }]} titulo={`Inserir ${modelo.nome} em uma ficha`} subtitulo="A ficha recebe uma cópia independente: alterar o modelo depois não muda o treino da aluna." />
      <div className="duas-colunas">
      <div className="card">
        <strong>O que será copiado</strong>
        {itens.map((it, i) => (
          <div key={it.id} className="item">
            <div><strong>{i + 1}. {it.exercicios ? it.exercicios.nome : ''}</strong>{it.biset_grupo && <> <Etiqueta tipo="destaque">Bi-set</Etiqueta></>}</div>
            <div className="muted">{(Array.isArray(it.blocos) && it.blocos.length) ? descreverBlocos(it.blocos, cats) : `${it.series}×${it.repeticoes}`}</div>
          </div>
        ))}
        {itens.length === 0 && <p className="muted">Este modelo ainda não tem exercícios.</p>}
      </div>
      <div className="card">
        <label className="muted">Aluna</label>
        <select value={alunaId} onChange={e => setAlunaId(e.target.value)}>
          <option value="">Escolha a aluna</option>
          {alunas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        {alunaId && <>
          <label className="muted">Ficha</label>
          <select value={fichaId} onChange={e => setFichaId(e.target.value)}>
            <option value="">Escolha a ficha</option>
            {fichas.map(f => <option key={f.id} value={f.id}>{f.nome}{f.ativa ? ' (ativa)' : ''}{f.arquivada_em ? ' (arquivada)' : ''}</option>)}
          </select>
          {fichas.length === 0 && <p className="muted">Esta aluna ainda não tem fichas. Crie uma ficha em Alunas, Fichas.</p>}
        </>}
        {fichaId && <>
          <label className="muted">Em qual treino</label>
          <select value={treinoId} onChange={e => setTreinoId(e.target.value)}>
            <option value="novo">Criar um treino novo com o nome do modelo</option>
            {treinos.map(t => <option key={t.id} value={t.id}>Adicionar ao fim de {t.nome}</option>)}
          </select>
        </>}
        {msg && <p className="erro">{msg}</p>}
        {ok && <p className="ok">{ok}</p>}
        <button className="btn" style={{ width: '100%', marginTop: 10 }} disabled={!fichaId || !itens.length || salvando} onClick={inserir}>
          {salvando ? 'Inserindo…' : 'Inserir na ficha'}
        </button>
      </div>
      </div>
    </>
  )
}

// ---------- Biblioteca de modelos ----------
function Biblioteca({ cats, onEditar, onInserir }) {
  const [lista, setLista] = useState([])
  const [catsTreino, setCatsTreino] = useState([])
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('')
  const [aberto, setAberto] = useState(null)
  const [previa, setPrevia] = useState({})
  const [msg, setMsg] = useState('')
  const { confirmar, pedirTexto } = useDialogo()

  async function carregar() {
    const { data, error } = await supabase.from('modelos').select('*, modelo_itens(id)').order('criado_em', { ascending: false })
    if (error) return setMsg(mensagemErro(error))
    setLista(data)
    const ct = await supabase.from('categorias_treino').select('*')
    setCatsTreino(ct.error ? [] : ct.data)
  }
  useEffect(() => { carregar() }, [])

  async function novo() {
    const nome = await pedirTexto({ titulo: 'Novo modelo de treino', rotulo: 'Nome do modelo', placeholder: 'Por exemplo, Inferiores, foco em glúteos', acao: 'Criar modelo' })
    if (!nome || !nome.trim()) return
    const { data, error } = await supabase.from('modelos').insert({ nome: nome.trim() }).select().single()
    if (error) return setMsg(mensagemErro(error))
    onEditar(data.id)
  }
  async function visualizar(m) {
    if (aberto === m.id) return setAberto(null)
    setAberto(m.id)
    if (!previa[m.id]) {
      const { data } = await supabase.from('modelo_itens').select('*, exercicios(nome)').eq('modelo_id', m.id).order('ordem')
      setPrevia(p => ({ ...p, [m.id]: data || [] }))
    }
  }
  async function duplicar(m) {
    const nome = await pedirTexto({ titulo: `Duplicar ${m.nome}`, rotulo: 'Nome da cópia', valor: `${m.nome} (cópia)`, acao: 'Duplicar' })
    if (!nome || !nome.trim()) return
    let r = await supabase.from('modelos').insert({ nome: nome.trim(), categoria: m.categoria ?? null, categoria_treino_id: m.categoria_treino_id ?? null }).select().single()
    if (r.error) r = await supabase.from('modelos').insert({ nome: nome.trim() }).select().single()   // banco sem a migração da Etapa 8
    if (r.error) return setMsg(mensagemErro(r.error))
    const it = await supabase.from('modelo_itens').select('*').eq('modelo_id', m.id).order('ordem')
    if (it.error) { await supabase.from('modelos').delete().eq('id', r.data.id); return setMsg(mensagemErro(it.error)) }
    if (it.data.length) {
      const e2 = await supabase.from('modelo_itens').insert(it.data.map(x => ({
        modelo_id: r.data.id, exercicio_id: x.exercicio_id, ordem: x.ordem, series: x.series, repeticoes: x.repeticoes,
        descanso_seg: x.descanso_seg, observacao: x.observacao, blocos: x.blocos || [],
        biset_grupo: x.biset_grupo || null, orientacoes: x.orientacoes ?? null,
        grupo_principal: x.grupo_principal || null, grupos_secundarios: x.grupos_secundarios || null,
      })))
      if (e2.error) { await supabase.from('modelos').delete().eq('id', r.data.id); return setMsg(mensagemErro(e2.error)) }   // não deixa um modelo pela metade
    }
    setMsg(''); carregar()
  }
  async function excluir(m) {
    if (!(await confirmar({ titulo: `Excluir o modelo ${m.nome}?`, texto: 'As fichas que já receberam este modelo não mudam.', acao: 'Excluir', perigo: true }))) return
    const { error } = await supabase.from('modelos').delete().eq('id', m.id)
    if (error) return setMsg(mensagemErro(error))
    carregar()
  }

  const categorias = [...new Set(lista.map(m => m.categoria).filter(Boolean))].sort()
  const filtrados = lista.filter(m => (!filtro || m.categoria === filtro) && m.nome.toLowerCase().includes(busca.toLowerCase()))
  const tipoDe = m => catsTreino.find(c => c.id === m.categoria_treino_id) || null

  return (
    <>
      <CabecalhoPagina titulo="Modelos de treino" subtitulo="Estruturas reutilizáveis. Ao inserir em uma ficha, a aluna recebe uma cópia independente do modelo."
        acoes={<button className="btn sm" onClick={novo}><Icone nome="mais" tam={18} />Novo modelo</button>} />
      <div className="ferramentas">
        <label className="busca">
          <Icone nome="busca" tam={18} />
          <input type="search" placeholder="Buscar modelo" aria-label="Buscar modelo" value={busca} onChange={e => setBusca(e.target.value)} />
        </label>
        {categorias.length > 0 && (
          <div className="faixa-chips" role="group" aria-label="Filtrar por categoria">
            <button className={'chip' + (filtro === '' ? ' on' : '')} aria-pressed={filtro === ''} onClick={() => setFiltro('')}>Todos</button>
            {categorias.map(c => <button key={c} className={'chip' + (filtro === c ? ' on' : '')} aria-pressed={filtro === c} onClick={() => setFiltro(filtro === c ? '' : c)}>{c}</button>)}
          </div>
        )}
      </div>
      {msg && <p className="erro">{msg}</p>}
      {filtrados.length === 0 && !msg && <p className="lista-vazia">{lista.length ? 'Nenhum modelo encontrado.' : 'Nenhum modelo ainda. Use "Novo modelo", ou "Salvar como modelo" dentro de um treino.'}</p>}
      <div className="grade-cartoes">
      {filtrados.map(m => {
        const n = m.modelo_itens.length
        return (
          <div key={m.id} className="card">
            <div className="topo">
              <div className="grow">
                <strong>{m.nome}</strong>
                <div className="muted">{n} {n === 1 ? 'exercício' : 'exercícios'}{m.categoria ? `, ${m.categoria}` : ''}</div>
              </div>
              <CategoriaTreino categoria={tipoDe(m)} />
            </div>
            <div className="acoes-cartao">
              <button className="btn sm" onClick={() => onInserir(m)}>Inserir em ficha</button>
              <button className="btn sec sm" onClick={() => onEditar(m.id)}>Editar</button>
              <button className="btn fantasma sm" onClick={() => visualizar(m)} aria-expanded={aberto === m.id}>{aberto === m.id ? 'Ocultar exercícios' : 'Ver exercícios'}</button>
              <Menu rotulo={`Mais ações para ${m.nome}`} itens={[
                { rotulo: 'Duplicar modelo', onClick: () => duplicar(m) },
                { rotulo: 'Excluir modelo', onClick: () => excluir(m), perigo: true },
              ]} />
            </div>
            {aberto === m.id && (
              <div style={{ marginTop: 8 }}>
                {(previa[m.id] || []).map((it, i) => (
                  <div key={it.id} className="item">
                    <strong>{i + 1}. {it.exercicios ? it.exercicios.nome : ''}</strong>{it.biset_grupo && <> <Etiqueta tipo="destaque">Bi-set</Etiqueta></>}
                    <div className="muted">{(Array.isArray(it.blocos) && it.blocos.length) ? descreverBlocos(it.blocos, cats) : `${it.series}×${it.repeticoes}${it.descanso_seg ? `, descanso ${it.descanso_seg} s` : ''}`}</div>
                    {it.observacao && <div className="muted">{it.observacao}</div>}
                  </div>
                ))}
                {(previa[m.id] || []).length === 0 && <p className="muted">Este modelo ainda não tem exercícios.</p>}
              </div>
            )}
          </div>
        )
      })}
      </div>
    </>
  )
}

export default function Modelos() {
  const { cats, pronto } = useCategorias()
  const [editando, setEditando] = useState(null)
  const [inserindo, setInserindo] = useState(null)
  if (!pronto) return <p className="muted">Carregando…</p>
  if (editando) return <EditorModelo id={editando} onVoltar={() => setEditando(null)} />
  if (inserindo) return <InserirModelo modelo={inserindo} cats={cats} onFechar={() => setInserindo(null)} />
  return (
    <>
      <Biblioteca cats={cats} onEditar={setEditando} onInserir={setInserindo} />
    </>
  )
}
