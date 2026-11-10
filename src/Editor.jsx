import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './editor.css'

const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

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

function Item({ it, i, total, onMove, onRemove }) {
  const [v, setV] = useState({
    series: it.series, repeticoes: it.repeticoes,
    descanso_seg: it.descanso_seg ?? '', observacao: it.observacao ?? '',
  })
  async function salvar() {
    await supabase.from('treino_exercicios').update({
      series: parseInt(v.series, 10) || 1,
      repeticoes: v.repeticoes || '10',
      descanso_seg: v.descanso_seg === '' ? null : parseInt(v.descanso_seg, 10),
      observacao: v.observacao || null,
    }).eq('id', it.id)
  }
  const set = c => e => setV({ ...v, [c]: e.target.value })
  return (
    <div className="item">
      <div className="topo">
        <strong>{it.exercicios?.nome}</strong>
        <div className="row" style={{ margin: 0 }}>
          <button className="mini" disabled={i === 0} onClick={() => onMove(i, -1)}>↑</button>
          <button className="mini" disabled={i === total - 1} onClick={() => onMove(i, 1)}>↓</button>
          <button className="mini" onClick={() => onRemove(it)}>✕</button>
        </div>
      </div>
      <div className="grid3">
        <label>Séries<input type="number" min="1" value={v.series} onChange={set('series')} onBlur={salvar} /></label>
        <label>Reps<input value={v.repeticoes} onChange={set('repeticoes')} onBlur={salvar} /></label>
        <label>Desc. (s)<input type="number" min="0" value={v.descanso_seg} onChange={set('descanso_seg')} onBlur={salvar} /></label>
      </div>
      <input placeholder="Observação" value={v.observacao} onChange={set('observacao')} onBlur={salvar} />
    </div>
  )
}

function TreinoCard({ treino, biblioteca, onChange }) {
  const items = [...(treino.treino_exercicios || [])].sort((a, b) => a.ordem - b.ordem)
  const [modo, setModo] = useState(null)
  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [previa, setPrevia] = useState(null)
  const [modelos, setModelos] = useState([])
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')

  async function inserir(linhas) {
    const base = items.length
    const rows = linhas.map((l, k) => ({ ...l, treino_id: treino.id, ordem: base + k }))
    const { error } = await supabase.from('treino_exercicios').insert(rows)
    if (error) return setMsg(error.message)
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
    const { error: e2 } = await supabase.from('modelo_itens').insert(items.map((x, k) => ({
      modelo_id: data.id, exercicio_id: x.exercicio_id, ordem: k, series: x.series,
      repeticoes: x.repeticoes, descanso_seg: x.descanso_seg, observacao: x.observacao,
    })))
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
      descanso_seg: x.descanso_seg, observacao: x.observacao,
    })))
  }

  async function excluirModelo(m) {
    if (!window.confirm(`Excluir o modelo "${m.nome}"?`)) return
    await supabase.from('modelos').delete().eq('id', m.id)
    abrirModelos()
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

      {items.map((it, i) => (
        <Item key={it.id} it={it} i={i} total={items.length} onMove={mover} onRemove={remover} />
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
          <p className="muted">Uma linha por exercício, por exemplo: Agachamento livre 3x10-12 60s pausa embaixo. Os nomes precisam existir na biblioteca.</p>
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
  const [msg, setMsg] = useState('')

  async function carregar() {
    const { data, error } = await supabase.from('treinos')
      .select('*, treino_exercicios(*, exercicios(nome, grupo_muscular))')
      .eq('ficha_id', ficha.id).order('ordem')
    if (error) setMsg(error.message); else setTreinos(data)
  }

  useEffect(() => {
    carregar()
    supabase.from('exercicios').select('id, nome, grupo_muscular').eq('ativo', true).order('nome')
      .then(({ data }) => setBiblioteca(data || []))
  }, [])

  async function novoTreino() {
    const nome = 'Treino ' + String.fromCharCode(65 + treinos.length)
    const { error } = await supabase.from('treinos').insert({ ficha_id: ficha.id, nome, ordem: treinos.length })
    if (error) setMsg(error.message); else carregar()
  }

  return (
    <>
      <button className="btn sec" onClick={onVoltar}>← Voltar às fichas</button>
      <h3>{ficha.nome}</h3>
      {msg && <p className="erro">{msg}</p>}
      {treinos.map(t => <TreinoCard key={t.id} treino={t} biblioteca={biblioteca} onChange={carregar} />)}
      <button className="btn" onClick={novoTreino}>+ Novo treino</button>
    </>
  )
}
