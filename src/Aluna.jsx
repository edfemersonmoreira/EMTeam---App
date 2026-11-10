import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Executar from './Executar'
import Historico from './Historico'

export default function Aluna({ perfil }) {
  const [aba, setAba] = useState('treinos')
  const [ficha, setFicha] = useState(undefined)
  const [treinos, setTreinos] = useState([])
  const [ultimas, setUltimas] = useState({})
  const [exec, setExec] = useState(null)
  const [msg, setMsg] = useState('')

  async function carregar() {
    const f = await supabase.from('fichas').select('*').eq('aluna_id', perfil.id).eq('ativa', true).maybeSingle()
    if (f.error) return setMsg(f.error.message)
    setFicha(f.data)
    if (!f.data) return
    const t = await supabase.from('treinos').select('*, treino_exercicios(id)').eq('ficha_id', f.data.id).order('ordem')
    if (t.error) return setMsg(t.error.message)
    setTreinos(t.data)
    const s = await supabase.from('sessoes').select('treino_id, finalizada_em').eq('aluna_id', perfil.id)
      .not('finalizada_em', 'is', null).order('finalizada_em', { ascending: false }).limit(60)
    const m = {}
    ;(s.data || []).forEach(x => { if (x.treino_id && !m[x.treino_id]) m[x.treino_id] = x.finalizada_em })
    setUltimas(m)
  }
  useEffect(() => { carregar() }, [])

  if (exec) return <Executar treino={exec} perfil={perfil} onSair={() => { setExec(null); carregar() }} />

  return (
    <>
      <nav>
        <button className={aba === 'treinos' ? 'on' : ''} onClick={() => setAba('treinos')}>Treinos</button>
        <button className={aba === 'historico' ? 'on' : ''} onClick={() => setAba('historico')}>Histórico</button>
      </nav>
      <main>
        {aba === 'historico' ? <Historico alunaId={perfil.id} /> : (
          <>
            <h2 style={{ marginBottom: 4 }}>Olá, {perfil.nome}!</h2>
            {msg && <p className="erro">{msg}</p>}
            {ficha === undefined && !msg && <p className="muted">Carregando…</p>}
            {ficha === null && <p className="muted">Você ainda não tem uma ficha ativa. Fale com o seu treinador.</p>}
            {ficha && <p className="muted">{ficha.nome}</p>}
            {treinos.map(t => (
              <div key={t.id} className="card">
                <div className="row between" style={{ cursor: 'default', margin: 0 }}>
                  <div>
                    <strong>{t.nome}</strong>
                    <div className="muted">
                      {t.treino_exercicios.length} exercício(s)
                      {ultimas[t.id] ? ` · último em ${new Date(ultimas[t.id]).toLocaleDateString('pt-BR')}` : ''}
                    </div>
                  </div>
                  <button className="btn" onClick={() => setExec(t)}>Iniciar</button>
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </>
  )
}
