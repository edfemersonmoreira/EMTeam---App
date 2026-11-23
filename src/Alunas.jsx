import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { mensagemErro } from './erros'
import Icone from './Icone'
import './alunas.css'

const iniciais = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()

export default function Alunas({ onFichas, onEvolucao, onAerobico }) {
  const [lista, setLista] = useState([])
  const [edit, setEdit] = useState(null)
  const [nova, setNova] = useState(null)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmar, setConfirmar] = useState(null)   // id da aluna que está aguardando confirmação para desativar

  async function carregar() {
    const [p, u] = await Promise.all([
      supabase.from('profiles').select('*').eq('papel', 'aluna').order('nome'),
      supabase.from('ultimo_treino_por_aluna').select('*'),
    ])
    if (p.error) return setMsg(mensagemErro(p.error))
    const mapa = Object.fromEntries((u.data || []).map(x => [x.aluna_id, x]))
    setLista(p.data.map(a => ({ ...a, ultimo: mapa[a.id]?.ultimo_treino_em, total: mapa[a.id]?.total_treinos || 0 })))
  }
  useEffect(() => { carregar() }, [])

  async function criar(e) {
    e.preventDefault()
    setSalvando(true); setMsg(''); setOk('')
    const { error } = await supabase.functions.invoke('criar-aluna', { body: nova })
    setSalvando(false)
    if (error) {
      let m = mensagemErro(error)
      try { const j = await error.context.json(); if (j.erro) m = j.erro } catch (_) {}
      return setMsg(m)
    }
    setOk(`${nova.nome} cadastrada. Envie a ela o e-mail e a senha.`)
    setNova(null); carregar()
  }

  async function salvar(e) {
    e.preventDefault()
    const { error } = await supabase.from('profiles')
      .update({ nome: edit.nome, telefone: edit.telefone || null }).eq('id', edit.id)
    if (error) return setMsg(mensagemErro(error))
    setEdit(null); setMsg(''); carregar()
  }

  async function alternar(a) {
    await supabase.from('profiles').update({ ativa: !a.ativa }).eq('id', a.id)
    carregar()
  }

  if (nova) return (
    <form onSubmit={criar} className="card">
      <h3>Nova aluna</h3>
      <input placeholder="Nome" value={nova.nome} onChange={e => setNova({ ...nova, nome: e.target.value })} required />
      <input type="email" placeholder="E-mail (será o login dela)" value={nova.email} onChange={e => setNova({ ...nova, email: e.target.value })} required />
      <input placeholder="Senha inicial (mínimo 6 caracteres)" value={nova.senha} onChange={e => setNova({ ...nova, senha: e.target.value })} required minLength={6} />
      <input placeholder="Telefone (opcional)" value={nova.telefone} onChange={e => setNova({ ...nova, telefone: e.target.value })} />
      {msg && <p className="erro">{msg}</p>}
      <div className="row">
        <button className="btn" disabled={salvando}>{salvando ? 'Cadastrando…' : 'Cadastrar'}</button>
        <button type="button" className="btn sec" onClick={() => { setNova(null); setMsg('') }}>Cancelar</button>
      </div>
    </form>
  )

  if (edit) return (
    <form onSubmit={salvar} className="card">
      <h3>Editar aluna</h3>
      <input placeholder="Nome" value={edit.nome} onChange={e => setEdit({ ...edit, nome: e.target.value })} required />
      <input placeholder="Telefone" value={edit.telefone || ''} onChange={e => setEdit({ ...edit, telefone: e.target.value })} />
      {msg && <p className="erro">{msg}</p>}
      <div className="row">
        <button className="btn">Salvar</button>
        <button type="button" className="btn sec" onClick={() => setEdit(null)}>Cancelar</button>
      </div>
    </form>
  )

  const ativas = lista.filter(a => a.ativa).length
  const inativas = lista.length - ativas

  return (
    <div className="alunas-lista">
      <div className="alunas-topo">
        <div>
          <h2>Alunas</h2>
          <div className="muted">{lista.length === 0 ? 'Nenhuma aluna cadastrada ainda.' : `${ativas} ${ativas === 1 ? 'ativa' : 'ativas'} · ${inativas} ${inativas === 1 ? 'inativa' : 'inativas'}`}</div>
        </div>
        <button className="btn" onClick={() => { setNova({ nome: '', email: '', senha: '', telefone: '' }); setMsg(''); setOk('') }}>+ Nova aluna</button>
      </div>
      {msg && <p className="erro">{msg}</p>}
      {ok && <p className="ok">{ok}</p>}
      {lista.map(a => (
        <article key={a.id} className={'aluna-card' + (a.ativa ? '' : ' off')} aria-label={a.nome}>
          <div className="aluna-id">
            <span className="avatar sem-acao">{a.avatar_url ? <img src={a.avatar_url} alt="" /> : iniciais(a.nome)}</span>
            <div className="aluna-dados">
              <div className="aluna-nome">
                <strong>{a.nome}</strong>
                {!a.ativa && <span className="badge inativa">Inativa</span>}
              </div>
              <div className="muted">{a.telefone || 'sem telefone'}</div>
              <div className="muted">
                {a.ultimo ? 'Último treino em ' + new Date(a.ultimo).toLocaleDateString('pt-BR') : 'Ainda não treinou'}
                {a.total ? ` · ${a.total} ${a.total === 1 ? 'treino' : 'treinos'}` : ''}
              </div>
            </div>
          </div>

          {confirmar === a.id ? (
            <div className="aluna-confirma" role="alertdialog" aria-label={`Desativar ${a.nome}`}>
              <p><strong>Desativar {a.nome}?</strong> Ela perde o acesso ao app. O cadastro, as fichas e o histórico continuam guardados, e você pode reativá-la quando quiser.</p>
              <div className="row wrap">
                <button className="btn perigo" onClick={() => { setConfirmar(null); alternar(a) }}>Sim, desativar</button>
                <button className="btn sec" onClick={() => setConfirmar(null)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="aluna-acoes">
              <button className="acao principal" onClick={() => onFichas(a)} aria-label={`Treinos e fichas de ${a.nome}`}><Icone nome="dumbbell" tam={18} />Treinos</button>
              <button className="acao" onClick={() => onEvolucao(a)} aria-label={`Cargas e evolução de ${a.nome}`}><Icone nome="grafico" tam={18} />Cargas</button>
              <button className="acao" onClick={() => onAerobico(a)} aria-label={`Aeróbico de ${a.nome}`}><Icone nome="coracao" tam={18} />Aeróbico</button>
              <button className="acao" onClick={() => setEdit(a)} aria-label={`Editar dados de ${a.nome}`}><Icone nome="lapiz" tam={18} />Editar</button>
              {a.ativa
                ? <button className="acao desativar" onClick={() => setConfirmar(a.id)} aria-label={`Desativar ${a.nome}`}><Icone nome="desligar" tam={18} />Desativar</button>
                : <button className="acao" onClick={() => alternar(a)} aria-label={`Reativar ${a.nome}`}><Icone nome="desligar" tam={18} />Reativar</button>}
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
