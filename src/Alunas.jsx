import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { mensagemErro } from './erros'
import Icone from './Icone'
import Etiqueta from './Etiqueta'
import Menu from './Menu'
import { CabecalhoPagina } from './Cabecalho'
import { buscarFichasAtivas } from './Inicio'
import { lembretesFichas, diasParaVencer, vencimentoDaFicha, fmtData, plural } from './painelUtil'
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
  const [fichas, setFichas] = useState(null)          // fichas ativas (mesma consulta do Início), para mostrar a situação de cada aluna
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todas')

  async function carregar() {
    const [p, u] = await Promise.all([
      supabase.from('profiles').select('*').eq('papel', 'aluna').order('nome'),
      supabase.from('ultimo_treino_por_aluna').select('*'),
    ])
    if (p.error) return setMsg(mensagemErro(p.error))
    const mapa = Object.fromEntries((u.data || []).map(x => [x.aluna_id, x]))
    setLista(p.data.map(a => ({ ...a, ultimo: mapa[a.id]?.ultimo_treino_em, total: mapa[a.id]?.total_treinos || 0 })))
    // Situação da ficha: se não carregar, a lista continua funcionando, só sem essa informação
    const f = await buscarFichasAtivas()
    setFichas(f.error ? null : (f.data || []))
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
    setSalvando(true)
    const { error } = await supabase.from('profiles')
      .update({ nome: edit.nome, telefone: edit.telefone || null }).eq('id', edit.id)
    setSalvando(false)
    if (error) return setMsg(mensagemErro(error))
    setEdit(null); setMsg(''); carregar()
  }

  async function alternar(a) {
    await supabase.from('profiles').update({ ativa: !a.ativa }).eq('id', a.id)
    carregar()
  }

  const voltarLista = () => { setNova(null); setEdit(null); setMsg('') }

  if (nova) return (
    <>
      <CabecalhoPagina trilha={[{ rotulo: 'Alunas', onClick: voltarLista }, { rotulo: 'Nova aluna' }]} titulo="Nova aluna" subtitulo="Ela recebe acesso ao app com o e-mail e a senha abaixo." />
      <form onSubmit={criar} className="card form-estreito">
        <label className="campo-rotulo">Nome
          <input value={nova.nome} onChange={e => setNova({ ...nova, nome: e.target.value })} required />
        </label>
        <label className="campo-rotulo">E-mail (será o login dela)
          <input type="email" value={nova.email} onChange={e => setNova({ ...nova, email: e.target.value })} required />
        </label>
        <label className="campo-rotulo">Senha inicial (mínimo 6 caracteres)
          <input value={nova.senha} onChange={e => setNova({ ...nova, senha: e.target.value })} required minLength={6} />
        </label>
        <label className="campo-rotulo">Telefone (opcional)
          <input value={nova.telefone} onChange={e => setNova({ ...nova, telefone: e.target.value })} />
        </label>
        {msg && <p className="erro">{msg}</p>}
        <div className="row">
          <button className="btn" disabled={salvando} aria-busy={salvando}>{salvando ? 'Cadastrando…' : 'Cadastrar'}</button>
          <button type="button" className="btn sec" onClick={voltarLista}>Cancelar</button>
        </div>
      </form>
    </>
  )

  if (edit) return (
    <>
      <CabecalhoPagina trilha={[{ rotulo: 'Alunas', onClick: voltarLista }, { rotulo: edit.nome || 'Editar aluna' }]} titulo="Editar dados" />
      <form onSubmit={salvar} className="card form-estreito">
        <label className="campo-rotulo">Nome
          <input value={edit.nome} onChange={e => setEdit({ ...edit, nome: e.target.value })} required />
        </label>
        <label className="campo-rotulo">Telefone
          <input value={edit.telefone || ''} onChange={e => setEdit({ ...edit, telefone: e.target.value })} />
        </label>
        {msg && <p className="erro">{msg}</p>}
        <div className="row">
          <button className="btn" disabled={salvando} aria-busy={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          <button type="button" className="btn sec" onClick={voltarLista}>Cancelar</button>
        </div>
      </form>
    </>
  )

  const ativas = lista.filter(a => a.ativa).length
  const inativas = lista.length - ativas
  // Pendências: exatamente a mesma regra do painel inicial (sem ficha ativa ou ficha vencendo em até 7 dias)
  const pendentes = new Set(fichas ? lembretesFichas(lista, fichas).map(l => l.alunaId) : [])
  const fichaDe = Object.fromEntries((fichas || []).map(f => [f.aluna_id, f]))

  function situacao(a) {
    if (!a.ativa || !fichas) return null
    const f = fichaDe[a.id]
    if (!f) return { tipo: 'destaque', txt: 'Sem ficha ativa' }
    const r = diasParaVencer(f)
    if (r == null) return { tipo: 'neutra', txt: 'Ficha sem validade' }
    if (r < 0) return { tipo: 'neutra', txt: `Ficha venceu em ${fmtData(vencimentoDaFicha(f))}` }
    if (r === 0) return { tipo: 'destaque', txt: 'Ficha vence hoje' }
    if (r === 1) return { tipo: 'destaque', txt: 'Ficha vence amanhã' }
    if (r <= 7) return { tipo: 'destaque', txt: `Ficha vence em ${r} dias` }
    return { tipo: 'sucesso', txt: `Ficha em dia até ${fmtData(vencimentoDaFicha(f))}` }
  }

  const termo = busca.trim().toLowerCase()
  const filtrada = lista.filter(a =>
    (filtro === 'todas' || (filtro === 'ativas' && a.ativa) || (filtro === 'inativas' && !a.ativa) || (filtro === 'pendencia' && pendentes.has(a.id))) &&
    (!termo || `${a.nome} ${a.telefone || ''}`.toLowerCase().includes(termo)))
  const filtros = [['todas', 'Todas', lista.length], ['ativas', 'Ativas', ativas], ['inativas', 'Inativas', inativas]]
  if (fichas) filtros.push(['pendencia', 'Com pendência', pendentes.size])

  return (
    <div className="alunas-lista">
      <CabecalhoPagina titulo="Alunas"
        subtitulo={lista.length === 0 ? 'Nenhuma aluna cadastrada ainda.' : `${plural(ativas, 'ativa', 'ativas')} · ${plural(inativas, 'inativa', 'inativas')}`}
        acoes={<button className="btn sm" onClick={() => { setNova({ nome: '', email: '', senha: '', telefone: '' }); setMsg(''); setOk('') }}><Icone nome="mais" tam={18} />Nova aluna</button>} />
      {lista.length > 0 && (
        <div className="ferramentas">
          <label className="busca">
            <Icone nome="busca" tam={18} />
            <input type="search" placeholder="Buscar por nome ou telefone" aria-label="Buscar aluna" value={busca} onChange={e => setBusca(e.target.value)} />
          </label>
          <div className="faixa-chips" role="group" aria-label="Filtrar alunas">
            {filtros.map(([id, rot, n]) => (
              <button key={id} type="button" className={'chip' + (filtro === id ? ' on' : '')} aria-pressed={filtro === id} onClick={() => setFiltro(id)}>{rot} <em>{n}</em></button>
            ))}
          </div>
        </div>
      )}
      {msg && <p className="erro">{msg}</p>}
      {ok && <p className="ok">{ok}</p>}
      {lista.length > 0 && filtrada.length === 0 && <p className="lista-vazia">Nenhuma aluna encontrada com esse filtro.</p>}
      {filtrada.map(a => {
        const sit = situacao(a)
        const detalhes = [a.telefone, a.ultimo ? 'Último treino em ' + new Date(a.ultimo).toLocaleDateString('pt-BR') : 'Ainda não treinou', a.total ? plural(a.total, 'treino', 'treinos') : null].filter(Boolean)
        return (
          <article key={a.id} className={'aluna-card' + (a.ativa ? '' : ' off')} aria-label={a.nome}>
            <div className="aluna-id">
              <span className="avatar sem-acao">{a.avatar_url ? <img src={a.avatar_url} alt="" /> : iniciais(a.nome)}</span>
              <div className="aluna-dados">
                <div className="aluna-nome">
                  <strong>{a.nome}</strong>
                  {!a.ativa && <Etiqueta>Inativa</Etiqueta>}
                </div>
                <div className="muted">{detalhes.join(' · ')}</div>
              </div>
            </div>
            <div className="aluna-situacao">{sit && <Etiqueta tipo={sit.tipo}>{sit.txt}</Etiqueta>}</div>

            {confirmar === a.id ? (
              <div className="aluna-confirma" role="alertdialog" aria-label={`Desativar ${a.nome}`}>
                <p><strong>Desativar {a.nome}?</strong> Ela perde o acesso ao app. O cadastro, as fichas e o histórico continuam guardados, e você pode reativá-la quando quiser.</p>
                <div className="row wrap">
                  <button className="btn perigo sm" onClick={() => { setConfirmar(null); alternar(a) }}>Sim, desativar</button>
                  <button className="btn sec sm" onClick={() => setConfirmar(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="aluna-acoes">
                <button className="acao principal" onClick={() => onFichas(a)} aria-label={`Treinos e fichas de ${a.nome}`}><Icone nome="dumbbell" tam={18} />Treinos</button>
                <button className="acao" onClick={() => onEvolucao(a)} aria-label={`Cargas e evolução de ${a.nome}`}><Icone nome="grafico" tam={18} />Cargas</button>
                <button className="acao" onClick={() => onAerobico(a)} aria-label={`Aeróbico de ${a.nome}`}><Icone nome="coracao" tam={18} />Aeróbico</button>
                <Menu rotulo={`Mais ações para ${a.nome}`} itens={[
                  { rotulo: 'Editar dados', onClick: () => setEdit(a) },
                  a.ativa
                    ? { rotulo: 'Desativar aluna', onClick: () => setConfirmar(a.id), perigo: true }
                    : { rotulo: 'Reativar aluna', onClick: () => alternar(a) },
                ]} />
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
