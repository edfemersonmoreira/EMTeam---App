import { useState } from 'react'
import { supabase } from './supabase'

export default function Senha({ onFechar }) {
  const [s1, setS1] = useState('')
  const [s2, setS2] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    if (s1.length < 6) return setMsg('Use pelo menos 6 caracteres.')
    if (s1 !== s2) return setMsg('As senhas não conferem.')
    const { error } = await supabase.auth.updateUser({ password: s1 })
    if (error) return setMsg(error.message)
    setMsg(''); setOk(true)
  }

  return (
    <form onSubmit={salvar} className="card">
      <h3>Trocar senha</h3>
      <input type="password" placeholder="Nova senha" value={s1} onChange={e => setS1(e.target.value)} required />
      <input type="password" placeholder="Repita a nova senha" value={s2} onChange={e => setS2(e.target.value)} required />
      {msg && <p className="erro">{msg}</p>}
      {ok && <p className="ok">Senha alterada com sucesso.</p>}
      <div className="row">
        {!ok && <button className="btn">Salvar</button>}
        <button type="button" className="btn sec" onClick={onFechar}>{ok ? 'Voltar' : 'Cancelar'}</button>
      </div>
    </form>
  )
}
