import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Exercicios from './Exercicios'
import Alunas from './Alunas'
import Fichas from './Fichas'
import Historico from './Historico'
import Aluna from './Aluna'
import Senha from './Senha'
import Logo from './Logo'

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
      <Logo grande />
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
  const [evolSel, setEvolSel] = useState(null)
  const [senhaAberta, setSenhaAberta] = useState(false)

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
  const irPara = a => { setAba(a); setAlunaSel(null); setEvolSel(null) }

  let conteudo
  if (senhaAberta) {
    conteudo = <main><Senha onFechar={() => setSenhaAberta(false)} /></main>
  } else if (admin) {
    conteudo = (
      <>
        <nav>
          <button className={aba === 'alunas' ? 'on' : ''} onClick={() => irPara('alunas')}>Alunas</button>
          <button className={aba === 'exercicios' ? 'on' : ''} onClick={() => irPara('exercicios')}>Exercícios</button>
        </nav>
        <main className="wide">
          {aba === 'exercicios' ? <Exercicios />
            : alunaSel ? <Fichas aluna={alunaSel} onVoltar={() => setAlunaSel(null)} />
            : evolSel ? <Historico alunaId={evolSel.id} titulo={`Evolução de ${evolSel.nome}`} onVoltar={() => setEvolSel(null)} />
            : <Alunas onFichas={setAlunaSel} onEvolucao={setEvolSel} />}
        </main>
      </>
    )
  } else if (perfil.ativa === false) {
    conteudo = <main><p>Seu acesso está desativado. Fale com o seu treinador.</p></main>
  } else {
    conteudo = <Aluna perfil={perfil} />
  }

  return (
    <div className="app">
      <header>
        <Logo />
        <span>
          <button className="link" onClick={() => setSenhaAberta(true)}>Senha</button>
          {' · '}
          <button className="link" onClick={() => supabase.auth.signOut()}>Sair</button>
        </span>
      </header>
      {conteudo}
    </div>
  )
}
