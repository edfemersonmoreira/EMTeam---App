import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Exercicios from './Exercicios'
import Alunas from './Alunas'
import Fichas from './Fichas'

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  async function entrar(e) {
    e.preventDefault()
    setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('E-mail ou senha incorretos.')
  }
  return (
    <div className="login">
      <h1>Minha Consultoria</h1>
      <form onSubmit={entrar}>
        <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} required />
        {erro && <p className="erro">{erro}</p>}
        <button className="btn">Entrar</button>
      </form>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [perfil, setPerfil] = useState(null)
  const [aba, setAba] = useState('alunas')
  const [alunaSel, setAlunaSel] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setPerfil(null); return }
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => setPerfil(data))
  }, [session])

  if (session === undefined) return <p className="center">Carregando…</p>
  if (!session) return <Login />
  if (!perfil) return <p className="center">Carregando…</p>

  const admin = perfil.papel === 'admin'
  return (
    <div className="app">
      <header>
        <strong>Minha Consultoria</strong>
        <button className="link" onClick={() => supabase.auth.signOut()}>Sair</button>
      </header>
      {admin ? (
        <>
          <nav>
            <button className={aba === 'alunas' ? 'on' : ''} onClick={() => { setAba('alunas'); setAlunaSel(null) }}>Alunas</button>
            <button className={aba === 'exercicios' ? 'on' : ''} onClick={() => setAba('exercicios')}>Exercícios</button>
          </nav>
          <main>{aba === 'alunas'
            ? (alunaSel ? <Fichas aluna={alunaSel} onVoltar={() => setAlunaSel(null)} /> : <Alunas onFichas={setAlunaSel} />)
            : <Exercicios />}</main>
        </>
      ) : (
        <main>
          <h2>Olá, {perfil.nome}!</h2>
          <p>Seus treinos aparecerão aqui nas próximas etapas.</p>
        </main>
      )}
    </div>
  )
}
