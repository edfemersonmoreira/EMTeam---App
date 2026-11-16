import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Categorias from './Categorias'
import './editor.css'

const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const DIAS = [['S', 1, 'Segunda'], ['T', 2, 'Terça'], ['Q', 3, 'Quarta'], ['Q', 4, 'Quinta'], ['S', 5, 'Sexta'], ['S', 6, 'Sábado'], ['D', 0, 'Domingo']]

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
function Bloco({ b, i, total, cats, onMove, onRemove, onErro, onGerenciar }) {
  const [v, setV] = useState({
    categoria_id: b.categoria_id, series: b.series, repeticoes: b.repeticoes ?? '',
    carga: b.carga ?? '', descanso_seg: b.descanso_seg ?? '', observacao: b.observacao ?? '',
  })
  const cat = cats.find(c => c.id === v.categoria_id)
  const opcoes = cats.filter(c => c.ativa || c.id === v.categoria_id)

  async function salvar(novo = {}) {
    const x = { ...v, ...novo }
    setV(x)
    const { error } = await supabase.from('treino_exercicio_series').update({
      categoria_id: x.categoria_id,
      series: parseInt(x.series, 10) || 1,
      repeticoes: x.repeticoes || null,
      carga: x.carga || null,
      descanso_seg: x.descanso_seg === '' ? null : parseInt(x.descanso_seg, 10),
      observacao: x.observacao || null,
    }).eq('id', b.id)
    onErro(error ? error.message : '')
  }
  const set = c => e => setV({ ...v, [c]: e.target.value })
  const trocar = e => { if (e.target.value === '__gerenciar') return onGerenciar(); salvar({ categoria_id: e.target.value }) }

  return (
    <div className="bloco-ed" style={{ '--cat': cat ? cat.cor : '#20B2AA' }}>
      <div className="topo">
        <div className="cat-sel">
          <i className="cat-dot" />
          <select value={v.categoria_id} onChange={trocar} aria-label="Tipo de série">
            {opcoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            <option value="__gerenciar">Gerenciar categorias…</option>
          </select>
        </div>
        <div className="row" style={{ margin: 0 }}>
          <button className="mini" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label="Subir tipo de série">↑</button>
          <button className="mini" disabled={i === total - 1} onClick={() => onMove(i, 1)} aria-label="Descer tipo de série">↓</button>
          <button className="mini" disabled={total <= 1} onClick={() => onRemove(b)} aria-label="Remover tipo de série">✕</button>
        </div>
      </div>
      <div className="grid4">
        <label>Séries<input type="number" min="1" value={v.series} onChange={set('series')} onBlur={() => salvar()} /></label>
        <label>Reps<input value={v.repeticoes} onChange={set('repeticoes')} onBlur={() => salvar()} /></label>
        <label>Carga<input placeholder="opcional" value={v.carga} onChange={set('carga')} onBlur={() => salvar()} /></label>
        <label>Desc. (s)<input type="number" min="0" value={v.descanso_seg} onChange={set('descanso_seg')} onBlur={() => salvar()} /></label>
      </div>
      <input placeholder="Instruções desta série (opcional)" value={v.observacao} onChange={set('observacao')} onBlur={() => salvar()} />
    </div>
  )
}

// Exercício dentro do treino: vários tipos de série (blocos) + observação geral
function Item({ it, i, total, cats, onMove, onRemove, onChange, onErro, onGerenciar }) {
  const blocos = blocosOrdenados(it)
  const legado = !it.blocos
  const [obs, setObs] = useState(it.observacao ?? '')
  const [v, setV] = useState({
    series: it.series, repeticoes: it.repeticoes,
    descanso_seg: it.descanso_seg ?? '',
  })

  async function salvarObs() {
    await supabase.from('treino_exercicios').update({ observacao: obs || null }).eq('id', it.id)
  }
  async function salvarLegado() {
    await supabase.from('treino_exercicios').update({
      series: parseInt(v.series, 10) || 1, repeticoes: v.repeticoes || '10',
      descanso_seg: v.descanso_seg === '' ? null : parseInt(v.descanso_seg, 10),
    }).eq('id', it.id)
  }

  async function addBloco() {
    const principal = cats.find(c => c.principal)
    const temPrincipal = blocos.some(b => principal && b.categoria_id === principal.id)
    const alvo = !temPrincipal ? principal : (cats.find(c => c.ativa && !c.principal) || principal)
    if (!alvo) return onErro('Cadastre uma categoria de série primeiro.')
    const { error } = await supabase.from('treino_exercicio_series').insert({
      treino_exercicio_id: it.id, categoria_id: alvo.id, ordem: blocos.length, series: 1, repeticoes: '10', descanso_seg: 60,
    })
    if (error) return onErro(error.message)
    onErro(''); onChange()
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
    const { error } = await supabase.from('treino_exercicio_series').delete().eq('id', b.id)
    if (error) return onErro(error.message)
    onChange()
  }

  return (
    <div className="item">
      <div className="topo">
        <strong>{it.exercicios?.nome}</strong>
        <div className="row" style={{ margin: 0 }}>
          <button className="mini" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label="Subir exercício">↑</button>
          <button className="mini" disabled={i === total - 1} onClick={() => onMove(i, 1)} aria-label="Descer exercício">↓</button>
          <button className="mini" onClick={() => onRemove(it)} aria-label="Remover exercício">✕</button>
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
            <Bloco key={b.id} b={b} i={j} total={blocos.length} cats={cats} onMove={moverBloco} onRemove={removerBloco} onErro={onErro} onGerenciar={onGerenciar} />
          ))}
          <button className="btn sec" style={{ marginTop: 6 }} onClick={addBloco}>+ Tipo de série</button>
        </>
      )}
      <input placeholder="Observação geral do exercício (opcional)" value={obs} onChange={e => setObs(e.target.value)} onBlur={salvarObs} />
    </div>
  )
}

function TreinoCard({ treino, biblioteca, cats, onChange, onGerenciar }) {
  const items = [...(treino.treino_exercicios || [])].sort((a, b) => a.ordem - b.ordem)
  const [modo, setModo] = useState(null)
  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [previa, setPrevia] = useState(null)
  const [modelos, setModelos] = useState([])
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')
  const principal = cats.find(c => c.principal)

  // Insere exercícios no treino, cada um com seus blocos de série (padrão: um bloco Principal)
  async function inserir(linhas) {
    const base = items.length
    for (let k = 0; k < linhas.length; k++) {
      const l = linhas[k]
      const { data, error } = await supabase.from('treino_exercicios').insert({
        treino_id: treino.id, exercicio_id: l.exercicio_id, ordem: base + k,
        series: l.series || 3, repeticoes: l.repeticoes || '10', descanso_seg: l.descanso_seg ?? null, observacao: l.observacao ?? null,
      }).select('id').single()
      if (error) return setMsg(error.message)
      if (cats.length) {
        const existentes = new Set(cats.map(c => c.id))
        const origem = (l.blocos && l.blocos.length ? l.blocos : [{ series: l.series || 3, repeticoes: l.repeticoes || '10', descanso_seg: l.descanso_seg ?? null }])
        const blocos = origem.map((b, j) => ({
          treino_exercicio_id: data.id,
          categoria_id: b.categoria_id && existentes.has(b.categoria_id) ? b.categoria_id : (principal ? principal.id : null),
          ordem: j, series: b.series || 1, repeticoes: b.repeticoes || null, carga: b.carga || null,
          descanso_seg: b.descanso_seg ?? null, observacao: b.observacao || null,
        }))
        const r2 = await supabase.from('treino_exercicio_series').insert(blocos)
        if (r2.error) return setMsg(r2.error.message)
      }
    }
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
    await supabase.from('treino_exercicios').delete().eq('id', it.id)
    onChange()
  }

  async function renomear(e) {
    const nome = e.target.value.trim()
    if (nome && nome !== treino.nome) await supabase.from('treinos').update({ nome }).eq('id', treino.id)
  }

  async function excluirTreino() {
    if (!window.confirm(`Excluir "${treino.nome}" e seus exercícios? O histórico de cargas da aluna é mantido.`)) return
    await supabase.from('treinos').delete().eq('id', treino.id)
    onChange()
  }

  async function salvarModelo() {
    if (!items.length) return setMsg('Adicione exercícios antes de salvar como modelo.')
    const nome = window.prompt('Nome do modelo:', treino.nome)
    if (!nome) return
    const { data, error } = await supabase.from('modelos').insert({ nome }).select().single()
    if (error) return setMsg(error.message)
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
    if (e2) setMsg(e2.message); else { setMsg(''); setOk('Modelo salvo.') }
  }

  async function abrirModelos() {
    setModo('modelo'); setOk('')
    const { data } = await supabase.from('modelos').select('*').order('criado_em', { ascending: false })
    setModelos(data || [])
  }

  async function usarModelo(m) {
    const { data, error } = await supabase.from('modelo_itens').select('*').eq('modelo_id', m.id).order('ordem')
    if (error) return setMsg(error.message)
    inserir(data.map(x => ({
      exercicio_id: x.exercicio_id, series: x.series, repeticoes: x.repeticoes,
      descanso_seg: x.descanso_seg, observacao: x.observacao, blocos: Array.isArray(x.blocos) ? x.blocos : [],
    })))
  }

  async function excluirModelo(m) {
    if (!window.confirm(`Excluir o modelo "${m.nome}"?`)) return
    await supabase.from('modelos').delete().eq('id', m.id)
    abrirModelos()
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
    <div className="card">
      <div className="topo">
        <input defaultValue={treino.nome} onBlur={renomear} style={{ fontWeight: 600 }} />
        <button className="mini" onClick={excluirTreino}>Excluir</button>
      </div>

      <div className="dias" aria-label="Dias da semana deste treino">
        {DIAS.map(([l, d, nome]) => (
          <button key={d} type="button" title={nome} aria-label={nome} aria-pressed={dias.includes(d)}
            className={'dia' + (dias.includes(d) ? ' on' : '')} onClick={() => toggleDia(d)}>{l}</button>
        ))}
      </div>

      {items.map((it, i) => (
        <Item key={it.id} it={it} i={i} total={items.length} cats={cats} onMove={mover} onRemove={remover}
          onChange={onChange} onErro={setMsg} onGerenciar={onGerenciar} />
      ))}
      {items.length === 0 && <p className="muted">Nenhum exercício neste treino ainda.</p>}

      <div className="row wrap">
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
              <button className="mini" onClick={() => excluirModelo(m)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Editor({ ficha, onVoltar }) {
  const [treinos, setTreinos] = useState([])
  const [biblioteca, setBiblioteca] = useState([])
  const [cats, setCats] = useState([])
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
    if (r.error) setMsg(r.error.message); else setTreinos(r.data)
  }
  async function carregarCats() {
    const { data, error } = await supabase.from('categorias_serie').select('*').order('ordem')
    setCats(error ? [] : data)
  }

  useEffect(() => {
    carregar(); carregarCats()
    supabase.from('exercicios').select('id, nome, grupo_muscular').eq('ativo', true).order('nome')
      .then(({ data }) => setBiblioteca(data || []))
  }, [])

  async function novoTreino() {
    const nome = 'Treino ' + String.fromCharCode(65 + treinos.length)
    const { error } = await supabase.from('treinos').insert({ ficha_id: ficha.id, nome, ordem: treinos.length })
    if (error) setMsg(error.message); else carregar()
  }

  if (gerenciar) return <Categorias onVoltar={() => { setGerenciar(false); carregarCats(); carregar() }} />

  return (
    <>
      <button className="btn sec" onClick={onVoltar}>← Voltar às fichas</button>
      <h3>{ficha.nome}</h3>
      {legado && <p className="erro">Para usar tipos de série (aquecimento, backoff, dropset e outros), rode a migração da Etapa 7.1 no Supabase.</p>}
      {msg && <p className="erro">{msg}</p>}
      {treinos.map(t => (
        <TreinoCard key={t.id} treino={t} biblioteca={biblioteca} cats={legado ? [] : cats} onChange={carregar} onGerenciar={() => setGerenciar(true)} />
      ))}
      <button className="btn" onClick={novoTreino}>+ Novo treino</button>
    </>
  )
}
