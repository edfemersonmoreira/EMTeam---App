import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Exercicios from './Exercicios'
import Alunas from './Alunas'
import Fichas from './Fichas'
import Historico from './Historico'
import Alongamentos from './Alongamentos'
import AerobicoAdmin from './AerobicoAdmin'
import Modelos from './Modelos'
import Inicio from './Inicio'
import Icone from './Icone'
import Aluna from './Aluna'
import Senha from './Senha'
import Logo from './Logo'
import TemaBotao from './TemaBotao'

const NOME_AREA = { alunas: 'Alunas', exercicios: 'Exercícios', modelos: 'Modelos de treino', alongamentos: 'Alongamentos' }

function Login({ aviso }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)
  async function entrar(e) {
    e.preventDefault()
    setErro(''); setEntrando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setEntrando(false)
    if (error) setErro('E-mail ou senha incorretos.')
  }
  return (
    <div className="login">
      <Logo grande />
      <form onSubmit={entrar}>
        <input type="email" placeholder="E-mail" aria-label="E-mail" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Senha" aria-label="Senha" autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} required />
        {erro && <p className="erro">{erro}</p>}
        {aviso && !erro && <p className="muted">{aviso}</p>}
        <button className="btn" disabled={entrando} aria-busy={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [perfil, setPerfil] = useState(null)
  const [aba, setAba] = useState('inicio')
  const [alunaSel, setAlunaSel] = useState(null)
  const [evolSel, setEvolSel] = useState(null)
  const [aeroSel, setAeroSel] = useState(null)
  const [senhaAberta, setSenhaAberta] = useState(false)
  const [deInicio, setDeInicio] = useState(false)   // aluna/ficha aberta a partir de uma notificação: "Voltar" retorna ao Início
  const [aviso, setAviso] = useState('')
  const [erroPerfil, setErroPerfil] = useState('')
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // A sessão do Supabase Auth já fica guardada no aparelho e é renovada sozinha. Aqui só tratamos o caso
  // de a conta não existir mais ou a sessão ser inválida (volta para o login) e o de falha de conexão
  // (mantém a sessão e oferece tentar de novo, sem desconectar a aluna).
  useEffect(() => {
    if (!session) { setPerfil(null); setErroPerfil(''); return }
    let vivo = true
    supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data, error }) => {
      if (!vivo) return
      if (error || !data) {
        const invalida = error && (error.code === 'PGRST116' || /jwt|token/i.test(error.message || ''))
        if (invalida) { supabase.auth.signOut(); setAviso('Sua sessão não é mais válida. Entre novamente.') }
        else setErroPerfil('Não foi possível carregar seus dados. Verifique a conexão.')
        return
      }
      setErroPerfil(''); setAviso(''); setPerfil(data)
    })
    return () => { vivo = false }
  }, [session, tentativa])

  if (session === undefined) return <p className="center">Carregando…</p>
  if (!session) return <Login aviso={aviso} />
  if (!perfil && erroPerfil) {
    return (
      <div className="login">
        <p className="muted">{erroPerfil}</p>
        <button className="btn" onClick={() => { setErroPerfil(''); setTentativa(t => t + 1) }}>Tentar de novo</button>
        <button className="link-texto" onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>
    )
  }
  if (!perfil) return <p className="center">Carregando…</p>

  const admin = perfil.papel === 'admin'
  const irPara = a => { setAba(a); setAlunaSel(null); setEvolSel(null); setAeroSel(null); setDeInicio(false) }
  // Abre a ficha ou a evolução de uma aluna direto de uma notificação do Início
  const abrirAluna = (tipo, aluna) => {
    setAba('alunas'); setAlunaSel(null); setEvolSel(null); setAeroSel(null); setDeInicio(true)
    if (tipo === 'fichas') setAlunaSel(aluna); else setEvolSel(aluna)
  }
  const voltar = limpar => () => { limpar(); if (deInicio) { setAba('inicio'); setDeInicio(false) } }

  let conteudo
  if (senhaAberta) {
    conteudo = <main><Senha onFechar={() => setSenhaAberta(false)} /></main>
  } else if (admin) {
    conteudo = (
      <>
        {/* As áreas (Alunas, Exercícios, Modelos, Alongamentos) abrem pelos cards do Início. Dentro delas, a barra mostra onde a administradora está e leva de volta ao Início. */}
        {aba !== 'inicio' && (
          <nav className="nav-area" aria-label="Navegação do administrador">
            <button onClick={() => irPara('inicio')}><Icone nome="voltar" tam={18} />Início</button>
            <span className="nav-area-atual" aria-current="page">{NOME_AREA[aba]}</span>
          </nav>
        )}
        {aba === 'inicio' ? <Inicio perfil={perfil} irPara={irPara} abrirAluna={abrirAluna} /> : (
        <main className="wide">
          {aba === 'alongamentos' ? <Alongamentos />
            : aba === 'modelos' ? <Modelos />
            : aba === 'exercicios' ? <Exercicios />
            : aeroSel ? <AerobicoAdmin aluna={aeroSel} onVoltar={() => setAeroSel(null)} />
            : alunaSel ? <Fichas aluna={alunaSel} onVoltar={voltar(() => setAlunaSel(null))} />
            : evolSel ? <Historico alunaId={evolSel.id} titulo={`Evolução de ${evolSel.nome}`} onVoltar={voltar(() => setEvolSel(null))} />
            : <Alunas onFichas={setAlunaSel} onEvolucao={setEvolSel} onAerobico={setAeroSel} />}
        </main>
        )}
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
        <span className="cab-acoes">
          <TemaBotao />
          <button className="link" onClick={() => setSenhaAberta(true)}>Senha</button>
          {' · '}
          <button className="link" onClick={() => supabase.auth.signOut()}>Sair</button>
        </span>
      </header>
      {conteudo}
    </div>
  )
}
