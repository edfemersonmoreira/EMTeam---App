import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { mensagemErro } from './erros'
import Categorias from './Categorias'
import Icone from './Icone'
import Menu from './Menu'
import Voltar from './Voltar'
import { CabecalhoPagina } from './Cabecalho'
import { useDialogo } from './Dialogo'
import { useSalvamento, StatusSalvo } from './Salvamento'
import { inserirExercicios, linhasDoModelo } from './prescricao'
import './editor.css'
import './treinoBloco.css'

const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const DIAS = [['Seg', 1, 'Segunda'], ['Ter', 2, 'Terça'], ['Qua', 3, 'Quarta'], ['Qui', 4, 'Quinta'], ['Sex', 5, 'Sexta'], ['Sáb', 6, 'Sábado'], ['Dom', 0, 'Domingo']]

// Lê linhas como: "Agachamento livre 3x10-12 60s com pausa no fundo"
export function parseLinhas(texto, biblioteca) {
  return texto.split('\n').map(l => l.trim()).filter(Boolean).map(linha => {
    const m = linha.match(/(\d+)\s*[xX×]\s*(\S+)/)
    if (!m) return { linha, erro: 'não achei séries x repetições (ex.: 3x12)' }
    const nomeTxt = linha.slice(0, m.index)
      .replace(/^\s*(?:[-–—•]|\d+[.)])\s*/, '')
      .replace(/[\s\-–—:;|,.]+$/, '')
    if (!nomeTxt) return { linha, erro: 'faltou o nome do exercício' }
    const resto = linha.slice(m.index + m[0].length)
    const d = resto.match(/(\d+)\s*(min|seg|s|m)\b/i)
    const descanso = d ? parseInt(d[1], 10) * (/^m/i.test(d[2]) ? 60 : 1) : null
    const obs = (d ? resto.replace(d[0], '') : resto).replace(/^[\s\-–—:;|,.]+|[\s\-–—:;|,.]+$/g, '')
    const alvo = norm(nomeTxt)
    let ex = biblioteca.find(e => norm(e.nome) === alvo)
    if (!ex && alvo.length >= 3) {
      const c = biblioteca.filter(e => norm(e.nome).includes(alvo))
      if (c.length === 1) ex = c[0]
    }
    if (!ex) return { linha, erro: `"${nomeTxt}" não está na biblioteca` }
    return {
      linha, ex,
      item: {
        exercicio_id: ex.id,
        series: parseInt(m[1], 10),
        repeticoes: m[2].replace(/[,;.]+$/, ''),
        descanso_seg: descanso,
        observacao: obs || null,
      },
    }
  })
}

const blocosOrdenados = it => [...(it.blocos || [])].sort((a, b) => a.ordem - b.ordem)

// Um tipo de série (bloco) dentro de um exercício: categoria, séries, repetições, carga, descanso e instruções
// Serve para fichas e para modelos: quem usa decide onde salvar, pela função onSalvar (devolve mensagem de erro ou '').
export function Bloco({ b, i, total, cats, onSalvar, onMove, onRemove, onErro, onGerenciar }) {
  const [v, setV] = useState({
    categoria_id: b.categoria_id, series: b.series, repeticoes: b.repeticoes ?? '',
    carga: b.carga ?? '', descanso_seg: b.descanso_seg ?? '', observacao: b.observacao ?? '',
  })
  const cat = cats.find(c => c.id === v.categoria_id)
  const opcoes = cats.filter(c => c.ativa || c.id === v.categoria_id)

  const dados = x => ({
    categoria_id: x.categoria_id,
    series: parseInt(x.series, 10) || 1,
    repeticoes: x.repeticoes || null,
    carga: x.carga || null,
    descanso_seg: x.descanso_seg === '' ? null : parseInt(x.descanso_seg, 10),
    observacao: x.observacao || null,
  })
  const salvoJson = useRef(JSON.stringify(dados(v)))   // só grava quando algum valor mudou
  async function salvar(novo = {}) {
    const x = { ...v, ...novo }
    setV(x)
    const d = dados(x), json = JSON.stringify(d)
    if (json === salvoJson.current) return
    const erro = await onSalvar(d)
    if (!erro) salvoJson.current = json
    onErro(erro || '')
  }
  const set = c => e => setV({ ...v, [c]: e.target.value })
  const trocar = e => { if (e.target.value === '__gerenciar') return onGerenciar(); salvar({ categoria_id: e.target.value }) }

  // No computador, tudo numa linha: tipo · séries · reps · carga · descanso · ações. A instrução da série
  // aparece quando já tem texto ou quando a pessoa pede ("+ Instrução").
  const [comObs, setComObs] = useState(!!(b.observacao))
  const nomeCat = cat ? cat.nome : 'série'
  return (
    <div className="bloco-ed" style={{ '--cat': cat ? cat.cor : '#20B2AA' }}>
      <div className="bloco-linha">
        <label className="cat-sel">
          <span className="rot">Tipo de série</span>
          <span className="cat-sel-campo">
            <i className="cat-dot" />
            <select value={v.categoria_id} onChange={trocar}>
              {opcoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              <option value="__gerenciar">Gerenciar categorias…</option>
            </select>
          </span>
        </label>
        <label className="campo-bloco"><span className="rot">Séries</span><input type="number" min="1" value={v.series} onChange={set('series')} onBlur={() => salvar()} /></label>
        <label className="campo-bloco"><span className="rot">Reps</span><input value={v.repeticoes} onChange={set('repeticoes')} onBlur={() => salvar()} /></label>
        <label className="campo-bloco"><span className="rot">Carga</span><input placeholder="opcional" value={v.carga} onChange={set('carga')} onBlur={() => salvar()} /></label>
        <label className="campo-bloco"><span className="rot">Descanso (s)</span><input type="number" min="0" value={v.descanso_seg} onChange={set('descanso_seg')} onBlur={() => salvar()} /></label>
        <div className="bloco-acoes">
          {!comObs && <button type="button" className="mini mais-obs" onClick={() => setComObs(true)}>+ Instrução</button>}
          <button className="mini icone" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label={`Subir ${nomeCat}`} title="Subir"><Icone nome="cima" tam={16} /></button>
          <button className="mini icone" disabled={i === total - 1} onClick={() => onMove(i, 1)} aria-label={`Descer ${nomeCat}`} title="Descer"><Icone nome="baixo" tam={16} /></button>
          <button className="mini icone perigo" disabled={total <= 1} onClick={() => onRemove(b)} aria-label={`Remover ${nomeCat}`} title="Remover"><Icone nome="x" tam={16} /></button>
        </div>
      </div>
      {comObs && <input className="bloco-obs" placeholder="Instruções desta série (opcional)" aria-label={`Instruções da série ${nomeCat}`} value={v.observacao} onChange={set('observacao')} onBlur={() => salvar()} autoFocus={!b.observacao} />}
    </div>
  )
}

// Exercício dentro do treino: vários tipos de série (blocos) + observação geral
function Item({ it, i, total, rotulo, cats, onMove, onRemove, onDuplicar, onChange, onErro, onGerenciar }) {
  const blocos = blocosOrdenados(it)
  const legado = !it.blocos
  const [obs, setObs] = useState(it.observacao ?? '')
  const [v, setV] = useState({
    series: it.series, repeticoes: it.repeticoes,
    descanso_seg: it.descanso_seg ?? '',
  })
  const salvo = useSalvamento()
  const { confirmar } = useDialogo()
  const nome = it.exercicios?.nome || 'exercício'
  const [comObs, setComObs] = useState(!!it.observacao)

  // Os campos salvam ao sair, como antes; o indicador ao lado do nome mostra o resultado.
  const erroDe = ({ error }) => (error ? mensagemErro(error) : '')
  const obsSalva = useRef(it.observacao ?? null)   // evita gravar (e piscar "Salvo") quando nada mudou
  async function salvarObs() {
    const novo = obs || null
    if (novo === obsSalva.current) return
    const erro = await salvo.rodar(async () => erroDe(await supabase.from('treino_exercicios').update({ observacao: novo }).eq('id', it.id)))
    if (!erro) obsSalva.current = novo
  }
  async function salvarLegado() {
    salvo.rodar(async () => erroDe(await supabase.from('treino_exercicios').update({
      series: parseInt(v.series, 10) || 1, repeticoes: v.repeticoes || '10',
      descanso_seg: v.descanso_seg === '' ? null : parseInt(v.descanso_seg, 10),
    }).eq('id', it.id)))
  }

  async function addBloco() {
    const principal = cats.find(c => c.principal)
    const temPrincipal = blocos.some(b => principal && b.categoria_id === principal.id)
    const alvo = !temPrincipal ? principal : (cats.find(c => c.ativa && !c.principal) || principal)
    if (!alvo) return onErro('Cadastre uma categoria de série primeiro.')
    const { error } = await supabase.from('treino_exercicio_series').insert({
      treino_exercicio_id: it.id, categoria_id: alvo.id, ordem: blocos.length, series: 1, repeticoes: '10', descanso_seg: 60,
    })
    if (error) return onErro(mensagemErro(error))
    onErro(''); onChange()
  }
  async function salvarBloco(b, campos) {
    return salvo.rodar(async () => {
      const { error } = await supabase.from('treino_exercicio_series').update(campos).eq('id', b.id)
      return error ? mensagemErro(error) : ''
    })
  }
  async function moverBloco(j, d) {
    const k = j + d
    if (k < 0 || k >= blocos.length) return
    const arr = [...blocos]; [arr[j], arr[k]] = [arr[k], arr[j]]
    await Promise.all(arr.map((b, idx) => supabase.from('treino_exercicio_series').update({ ordem: idx }).eq('id', b.id)))
    onChange()
  }
  async function removerBloco(b) {
    if (blocos.length <= 1) return onErro('O exercício precisa ter pelo menos um tipo de série.')
    const cat = cats.find(c => c.id === b.categoria_id)
    if (!(await confirmar({ titulo: `Remover ${cat ? cat.nome.toLowerCase() : 'este tipo de série'}?`, texto: `Sai de ${nome}. O histórico de cargas da aluna é mantido.`, acao: 'Remover', perigo: true }))) return
    const { error } = await supabase.from('treino_exercicio_series').delete().eq('id', b.id)
    if (error) return onErro(mensagemErro(error))
    onChange()
  }

  return (
    <div className="item item-ex">
      <div className="item-cab">
        <span className="ex-rotulo" title={`Exercício ${i + 1} deste treino`}>{rotulo}</span>
        <strong className="item-nome">{it.exercicios?.nome}</strong>
        <div className="item-acoes">
          <StatusSalvo s={salvo} />
          <button className="mini icone" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label={`Subir ${nome}`} title="Subir"><Icone nome="cima" tam={16} /></button>
          <button className="mini icone" disabled={i === total - 1} onClick={() => onMove(i, 1)} aria-label={`Descer ${nome}`} title="Descer"><Icone nome="baixo" tam={16} /></button>
          <Menu rotulo={`Mais ações para ${nome}`} itens={[
            { rotulo: 'Duplicar exercício', onClick: () => onDuplicar(it, i) },
            { rotulo: 'Remover exercício', onClick: () => onRemove(it), perigo: true },
          ]} />
        </div>
      </div>

      {legado ? (
        <div className="grid3">
          <label>Séries<input type="number" min="1" value={v.series} onChange={e => setV({ ...v, series: e.target.value })} onBlur={salvarLegado} /></label>
          <label>Reps<input value={v.repeticoes} onChange={e => setV({ ...v, repeticoes: e.target.value })} onBlur={salvarLegado} /></label>
          <label>Desc. (s)<input type="number" min="0" value={v.descanso_seg} onChange={e => setV({ ...v, descanso_seg: e.target.value })} onBlur={salvarLegado} /></label>
        </div>
      ) : (
        <>
          {blocos.map((b, j) => (
            <Bloco key={b.id} b={b} i={j} total={blocos.length} cats={cats} onMove={moverBloco} onRemove={removerBloco} onErro={onErro} onGerenciar={onGerenciar} onSalvar={campos => salvarBloco(b, campos)} />
          ))}
        </>
      )}
      {comObs && <input className="item-obs" placeholder="Observação geral do exercício (opcional)" aria-label={`Observação geral de ${nome}`} value={obs} onChange={e => setObs(e.target.value)} onBlur={salvarObs} autoFocus={!it.observacao} />}
      <div className="item-rodape">
        {!legado && <button type="button" className="mini" onClick={addBloco}><Icone nome="mais" tam={14} /> Tipo de série</button>}
        {!comObs && <button type="button" className="mini" onClick={() => setComObs(true)}><Icone nome="mais" tam={14} /> Observação do exercício</button>}
      </div>
    </div>
  )
}

// Um dia de treino: container próprio, com cabeçalho em destaque, exercícios identificados pela letra do dia e ações dentro do mesmo bloco
function TreinoCard({ treino, letra, proximaOrdem, biblioteca, cats, catsTreino, onChange, onGerenciar }) {
  const items = [...(treino.treino_exercicios || [])].sort((a, b) => a.ordem - b.ordem)
  const [modo, setModo] = useState(null)
  const [aberto, setAberto] = useState(true)
  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [previa, setPrevia] = useState(null)
  const [modelos, setModelos] = useState([])
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')
  const { confirmar, pedirTexto } = useDialogo()
  const salvoNome = useSalvamento()

  // Insere exercícios no fim do treino, cada um com seus tipos de série (padrão: um bloco Principal). Se algo falhar, desfaz o que foi copiado.
  async function inserir(linhas) {
    const erro = await inserirExercicios(treino.id, items.length, linhas, cats)
    if (erro) return setMsg(mensagemErro(erro))
    setMsg(''); setModo(null); setPrevia(null); setTexto(''); onChange()
  }

  async function mover(i, d) {
    const arr = [...items]; const j = i + d
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    await Promise.all(arr.map((x, idx) => supabase.from('treino_exercicios').update({ ordem: idx }).eq('id', x.id)))
    onChange()
  }

  async function remover(it) {
    if (!(await confirmar({ titulo: `Remover ${it.exercicios?.nome || 'este exercício'}?`, texto: `Sai de ${treino.nome}, com todos os tipos de série. O histórico de cargas da aluna é mantido.`, acao: 'Remover', perigo: true }))) return
    await supabase.from('treino_exercicios').delete().eq('id', it.id)
    onChange()
  }

  // Linhas (com tipos de série) de um ou mais exercícios do treino, prontas para inserirExercicios
  const linhaDe = x => ({
    exercicio_id: x.exercicio_id, series: x.series, repeticoes: x.repeticoes, descanso_seg: x.descanso_seg, observacao: x.observacao,
    blocos: blocosOrdenados(x).map(b => ({ categoria_id: b.categoria_id, series: b.series, repeticoes: b.repeticoes, carga: b.carga, descanso_seg: b.descanso_seg, observacao: b.observacao })),
  })

  // Duplica o exercício logo abaixo dele, com todos os tipos de série. Só cria registros novos: o histórico de cargas não é tocado.
  async function duplicarExercicio(it, pos) {
    const depois = items.slice(pos + 1)
    const r = await Promise.all(depois.map((x, k) => supabase.from('treino_exercicios').update({ ordem: pos + 2 + k }).eq('id', x.id)))
    const falha = r.find(x => x.error)
    if (falha) return setMsg(mensagemErro(falha.error))
    const erro = await inserirExercicios(treino.id, pos + 1, [linhaDe(it)], cats)
    if (erro) return setMsg(mensagemErro(erro))
    setMsg(''); onChange()
  }

  // Duplica o dia inteiro como um treino novo, sem dias da semana marcados (para não competir com o original).
  async function duplicarTreino() {
    const novo = { ficha_id: treino.ficha_id, nome: `${treino.nome} (cópia)`, ordem: proximaOrdem }
    if ('categoria_id' in treino && treino.categoria_id) novo.categoria_id = treino.categoria_id
    const { data, error } = await supabase.from('treinos').insert(novo).select('id').single()
    if (error) return setMsg(mensagemErro(error))
    const erro = await inserirExercicios(data.id, 0, items.map(linhaDe), cats)
    if (erro) {
      await supabase.from('treinos').delete().eq('id', data.id)   // não deixa um treino pela metade
      return setMsg('Não foi possível duplicar o treino e nada foi alterado na ficha. ' + mensagemErro(erro, ''))
    }
    setMsg(''); onChange()
  }

  async function renomear(e) {
    const nome = e.target.value.trim()
    if (nome && nome !== treino.nome) {
      salvoNome.rodar(async () => { const { error } = await supabase.from('treinos').update({ nome }).eq('id', treino.id); return error ? mensagemErro(error) : '' })
    }
  }

  async function excluirTreino() {
    if (!(await confirmar({ titulo: `Excluir ${treino.nome}?`, texto: 'O treino e os exercícios dele saem da ficha. O histórico de cargas da aluna é mantido.', acao: 'Excluir treino', perigo: true }))) return
    await supabase.from('treinos').delete().eq('id', treino.id)
    onChange()
  }

  async function salvarModelo() {
    if (!items.length) return setMsg('Adicione exercícios antes de salvar como modelo.')
    const nome = await pedirTexto({ titulo: 'Salvar como modelo', texto: 'O modelo fica na biblioteca de Modelos de treino, para usar em outras fichas.', rotulo: 'Nome do modelo', valor: treino.nome, acao: 'Salvar modelo' })
    if (!nome) return
    const { data, error } = await supabase.from('modelos').insert({ nome }).select().single()
    if (error) return setMsg(mensagemErro(error))
    const linhas = items.map((x, k) => {
      const l = {
        modelo_id: data.id, exercicio_id: x.exercicio_id, ordem: k, series: x.series,
        repeticoes: x.repeticoes, descanso_seg: x.descanso_seg, observacao: x.observacao,
      }
      if (x.blocos) l.blocos = blocosOrdenados(x).map(b => ({
        categoria_id: b.categoria_id, series: b.series, repeticoes: b.repeticoes, carga: b.carga, descanso_seg: b.descanso_seg, observacao: b.observacao,
      }))
      return l
    })
    const { error: e2 } = await supabase.from('modelo_itens').insert(linhas)
    if (e2) setMsg(mensagemErro(e2)); else { setMsg(''); setOk('Modelo salvo.') }
  }

  async function abrirModelos() {
    setModo('modelo'); setOk('')
    const { data } = await supabase.from('modelos').select('*').order('criado_em', { ascending: false })
    setModelos(data || [])
  }

  async function usarModelo(m) {
    const { data, error } = await supabase.from('modelo_itens').select('*').eq('modelo_id', m.id).order('ordem')
    if (error) return setMsg(mensagemErro(error))
    inserir(linhasDoModelo(data))
  }

  async function excluirModelo(m) {
    if (!(await confirmar({ titulo: `Excluir o modelo ${m.nome}?`, texto: 'As fichas que já receberam este modelo não mudam.', acao: 'Excluir', perigo: true }))) return
    await supabase.from('modelos').delete().eq('id', m.id)
    abrirModelos()
  }

  async function definirTipo(id) {
    const { error } = await supabase.from('treinos').update({ categoria_id: id || null }).eq('id', treino.id)
    if (error) setMsg('Não foi possível salvar o tipo do treino. Rode a migração da Etapa 8 no Supabase. ' + error.message)
    else { setMsg(''); onChange() }
  }

  const dias = treino.dias || []
  async function toggleDia(d) {
    const novo = dias.includes(d) ? dias.filter(x => x !== d) : [...dias, d].sort()
    const { error } = await supabase.from('treinos').update({ dias: novo }).eq('id', treino.id)
    if (error) setMsg('Não foi possível salvar os dias. Rode a migração da Etapa 6 no Supabase. ' + error.message)
    else { setMsg(''); onChange() }
  }

  const filtrados = biblioteca.filter(x =>
    `${x.nome} ${x.grupo_muscular || ''}`.toLowerCase().includes(busca.toLowerCase())).slice(0, 30)
  const reconhecidos = previa ? previa.filter(p => p.item) : []

  return (
    <section className="treino-bloco" id={`treino-${treino.id}`} aria-label={treino.nome}>
      <div className="treino-cab">
        <button className="treino-toggle" onClick={() => setAberto(!aberto)} aria-expanded={aberto} aria-label={aberto ? 'Recolher treino' : 'Expandir treino'}>
          <Icone nome="chevron" tam={18} />
        </button>
        <span className="treino-letra" aria-hidden="true">{letra}</span>
        <input className="treino-nome" defaultValue={treino.nome} onBlur={renomear} aria-label="Nome do treino" />
        <StatusSalvo s={salvoNome} />
        <span className="treino-contagem">{items.length} {items.length === 1 ? 'exercício' : 'exercícios'}</span>
        <div className="treino-cab-acoes">
          <Menu rotulo={`Mais ações para ${treino.nome}`} itens={[
            { rotulo: 'Duplicar treino', onClick: duplicarTreino },
            { rotulo: 'Excluir treino', onClick: excluirTreino, perigo: true },
          ]} />
        </div>
      </div>

      {aberto && (
        <div className="treino-corpo">

      {catsTreino.length > 0 && (
        <div className="faixa-chips" role="group" aria-label="Tipo do treino">
          <button type="button" className={'chip' + (!treino.categoria_id ? ' on' : '')} aria-pressed={!treino.categoria_id} onClick={() => definirTipo('')}>Sem tipo</button>
          {catsTreino.map(c => (
            <button key={c.id} type="button" className={'chip' + (treino.categoria_id === c.id ? ' on' : '')} aria-pressed={treino.categoria_id === c.id} onClick={() => definirTipo(c.id)}>
              <Icone nome={c.icone} tam={14} />{c.nome}
            </button>
          ))}
        </div>
      )}

      <div className="dias" role="group" aria-label="Dias da semana deste treino">
        {DIAS.map(([l, d, nome]) => (
          <button key={d} type="button" title={nome} aria-label={nome} aria-pressed={dias.includes(d)}
            className={'dia' + (dias.includes(d) ? ' on' : '')} onClick={() => toggleDia(d)}>{l}</button>
        ))}
      </div>

      {items.map((it, i) => (
        <Item key={it.id} it={it} i={i} total={items.length} rotulo={`${letra}${i + 1}`} cats={cats} onMove={mover} onRemove={remover} onDuplicar={duplicarExercicio}
          onChange={onChange} onErro={setMsg} onGerenciar={onGerenciar} />
      ))}
      {items.length === 0 && <p className="muted">Nenhum exercício neste treino ainda.</p>}

      <div className="row wrap treino-acoes">
        <button className="btn" onClick={() => { setModo(modo === 'add' ? null : 'add'); setMsg(''); setOk('') }}>+ Exercício</button>
        <button className="btn sec" onClick={() => { setModo(modo === 'importar' ? null : 'importar'); setPrevia(null); setMsg(''); setOk('') }}>Importar texto</button>
        <button className="btn sec" onClick={abrirModelos}>Usar modelo</button>
        <button className="btn sec" onClick={salvarModelo}>Salvar como modelo</button>
      </div>
      {msg && <p className="erro">{msg}</p>}
      {ok && <p className="ok">{ok}</p>}

      {modo === 'add' && (
        <>
          <input placeholder="Buscar exercício" value={busca} onChange={e => setBusca(e.target.value)} />
          <div className="pick">
            {filtrados.map(ex => (
              <div key={ex.id} onClick={() => inserir([{ exercicio_id: ex.id, series: 3, repeticoes: '10', descanso_seg: 60, observacao: null }])}>
                <strong>{ex.nome}</strong> <span className="muted">{ex.grupo_muscular}</span>
              </div>
            ))}
            {filtrados.length === 0 && <div className="muted">Nada encontrado. Cadastre o exercício na aba Exercícios.</div>}
          </div>
        </>
      )}

      {modo === 'importar' && (
        <>
          <p className="muted">Uma linha por exercício, por exemplo: Agachamento livre 3x10-12 60s pausa embaixo. Os nomes precisam existir na biblioteca. Cada exercício entra com um tipo de série Principal, e você acrescenta os demais depois.</p>
          <textarea rows="6" value={texto} onChange={e => setTexto(e.target.value)} placeholder={'Agachamento livre 3x12 60s\nCadeira extensora 4x10 90s última série até a falha'} />
          <button className="btn sec" onClick={() => setPrevia(parseLinhas(texto, biblioteca))}>Conferir</button>
          {previa && (
            <>
              {previa.map((p, k) => p.item
                ? <p key={k} className="ok">✓ {p.ex.nome}: {p.item.series}x{p.item.repeticoes}{p.item.descanso_seg ? `, ${p.item.descanso_seg}s` : ''}{p.item.observacao ? `, ${p.item.observacao}` : ''}</p>
                : <p key={k} className="erro">✗ {p.linha} → {p.erro}</p>)}
              {reconhecidos.length > 0 && (
                <button className="btn" onClick={() => inserir(reconhecidos.map(p => p.item))}>
                  Adicionar {reconhecidos.length} exercício(s)
                </button>
              )}
            </>
          )}
        </>
      )}

      {modo === 'modelo' && (
        <div className="pick">
          {modelos.length === 0 && <div className="muted">Nenhum modelo salvo ainda.</div>}
          {modelos.map(m => (
            <div key={m.id} className="topo">
              <span onClick={() => usarModelo(m)}><strong>{m.nome}</strong> <span className="muted">(toque para inserir)</span></span>
              <button className="mini icone perigo" onClick={() => excluirModelo(m)} aria-label={`Excluir o modelo ${m.nome}`} title="Excluir modelo"><Icone nome="x" tam={16} /></button>
            </div>
          ))}
        </div>
      )}
        </div>
      )}
    </section>
  )
}

// Letra do dia: vem do nome ("Treino B") quando existe; senão, da posição na ficha.
const letraDoTreino = (t, idx) => {
  const m = /^\s*treino\s+([a-z])\b/i.exec(t.nome || '')
  return m ? m[1].toUpperCase() : String.fromCharCode(65 + (idx % 26))
}

export default function Editor({ ficha, onVoltar, trilha }) {
  const [treinos, setTreinos] = useState([])
  const [biblioteca, setBiblioteca] = useState([])
  const [cats, setCats] = useState([])
  const [catsTreino, setCatsTreino] = useState([])
  const [legado, setLegado] = useState(false)
  const [gerenciar, setGerenciar] = useState(false)
  const [msg, setMsg] = useState('')

  async function carregar() {
    let r = await supabase.from('treinos')
      .select('*, treino_exercicios(*, exercicios(nome, grupo_muscular), blocos:treino_exercicio_series(*))')
      .eq('ficha_id', ficha.id).order('ordem')
    if (r.error) {   // banco ainda sem a migração da Etapa 7.1: mantém o editor simples
      r = await supabase.from('treinos').select('*, treino_exercicios(*, exercicios(nome, grupo_muscular))')
        .eq('ficha_id', ficha.id).order('ordem')
      setLegado(true)
    } else setLegado(false)
    if (r.error) setMsg(mensagemErro(r.error)); else setTreinos(r.data)
  }
  async function carregarCats() {
    const { data, error } = await supabase.from('categorias_serie').select('*').order('ordem')
    setCats(error ? [] : data)
  }

  async function carregarCatsTreino() {   // só existe depois da migração da Etapa 8
    const { data, error } = await supabase.from('categorias_treino').select('*').eq('ativa', true).order('ordem')
    setCatsTreino(error ? [] : data)
  }

  useEffect(() => {
    carregar(); carregarCats(); carregarCatsTreino()
    supabase.from('exercicios').select('id, nome, grupo_muscular').eq('ativo', true).order('nome')
      .then(({ data }) => setBiblioteca(data || []))
  }, [])

  async function novoTreino() {
    const nome = 'Treino ' + String.fromCharCode(65 + treinos.length)
    const { error } = await supabase.from('treinos').insert({ ficha_id: ficha.id, nome, ordem: treinos.length })
    if (error) setMsg(mensagemErro(error)); else carregar()
  }

  if (gerenciar) return <Categorias onVoltar={() => { setGerenciar(false); carregarCats(); carregar() }} />

  return (
    <>
      {trilha ? <CabecalhoPagina trilha={trilha} titulo={ficha.nome} subtitulo={`${treinos.length} ${treinos.length === 1 ? 'treino' : 'treinos'}${ficha.objetivo ? ` · ${ficha.objetivo}` : ''}`} />
        : <><Voltar onClick={onVoltar} rotulo="Fichas" /><h3>{ficha.nome}</h3></>}
      {legado && <p className="erro">Para usar tipos de série (aquecimento, backoff, dropset e outros), rode a migração da Etapa 7.1 no Supabase.</p>}
      {msg && <p className="erro">{msg}</p>}
      {treinos.length > 1 && (
        <div className="treino-nav" role="navigation" aria-label="Ir para o treino">
          {treinos.map((t, idx) => (
            <button key={t.id} className="chip" onClick={() => { const el = document.getElementById(`treino-${t.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
              {letraDoTreino(t, idx)} · {t.nome}
            </button>
          ))}
        </div>
      )}
      {treinos.map((t, idx) => (
        <TreinoCard key={t.id} treino={t} letra={letraDoTreino(t, idx)} proximaOrdem={treinos.reduce((m, x) => Math.max(m, (x.ordem ?? 0) + 1), 0)} biblioteca={biblioteca} cats={legado ? [] : cats} catsTreino={catsTreino} onChange={carregar} onGerenciar={() => setGerenciar(true)} />
      ))}
      <button className="btn sec" onClick={novoTreino}><Icone nome="mais" tam={18} />Novo treino</button>
    </>
  )
}
