import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function Alunas({ onFichas }) {
  const [lista, setLista] = useState([])
  const [edit, setEdit] = useState(null)
  const [msg, setMsg] = useState('')

  async function carregar() {
    const [p, u] = await Promise.all([
      supabase.from('profiles').select('*').eq('papel', 'aluna').order('nome'),
      supabase.from('ultimo_treino_por_aluna').select('*'),
    ])
    if (p.error) return setMsg(p.error.message)
    const mapa = Object.fromEntries((u.data || []).map(x => [x.aluna_id, x]))
    setLista(p.data.map(a => ({ ...a, ultimo: mapa[a.id]?.ultimo_treino_em, total: mapa[a.id]?.total_treinos || 0 })))
  }
  useEffect(() => { carregar() }, [])

  async function salvar(e) {
    e.preventDefault()
    const { error } = await supabase.from('profiles')
      .update({ nome: edit.nome, telefone: edit.telefone || null }).eq('id', edit.id)
    if (error) return setMsg(error.message)
    setEdit(null); setMsg(''); carregar()
  }

  async function alternar(a) {
    await supabase.from('profiles').update({ ativa: !a.ativa }).eq('id', a.id)
    carregar()
  }

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

  return (
    <>
      <p className="muted">Para cadastrar uma aluna nova, crie a conta dela em Authentication, Users, no painel do Supabase. Ela aparece aqui automaticamente.</p>
      {msg && <p className="erro">{msg}</p>}
      {lista.length === 0 && <p className="muted">Nenhuma aluna cadastrada ainda.</p>}
      {lista.map(a => (
        <div key={a.id} className={'card' + (a.ativa ? '' : ' off')}>
          <strong>{a.nome}</strong>
          <div className="muted">
            {a.telefone || 'sem telefone'} · {a.ultimo ? 'último treino em ' + new Date(a.ultimo).toLocaleDateString('pt-BR') : 'ainda não treinou'}
          </div>
          <div className="row">
            <button className="btn" onClick={() => onFichas(a)}>Fichas</button>
            <button className="btn sec" onClick={() => setEdit(a)}>Editar</button>
            <button className="btn sec" onClick={() => alternar(a)}>{a.ativa ? 'Desativar' : 'Reativar'}</button>
          </div>
        </div>
      ))}
    </>
  )
}
