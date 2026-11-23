import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { mensagemErro } from './erros'
import Icone from './Icone'
import './painel.css'
import {
  agruparConcluidos, ehNovo, marcarVistos, lembretesFichas, resumoAlunas, rotuloQuando, primeiroNome, plural, fmtData, fichasSemValidade,
  JANELA_CONCLUIDOS_DIAS,
} from './painelUtil'

const CHAVE_VISTOS = 'emteam-admin-vistos'
const lerVistos = () => { try { return JSON.parse(localStorage.getItem(CHAVE_VISTOS) || '{}') || {} } catch { return {} } }
const gravarVistos = v => { try { localStorage.setItem(CHAVE_VISTOS, JSON.stringify(v)) } catch { /* sem armazenamento: vale só nesta sessão */ } }
const iniciais = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
const LIMITE = 6

// Antes de a coluna validade_em existir no banco, a consulta cai para o formato antigo (as fichas usam o prazo padrão de 5 semanas).
export async function buscarFichasAtivas() {
  const r = await supabase.from('fichas').select('id, aluna_id, nome, criado_em, validade_em').eq('ativa', true)
  if (!r.error) return r
  return supabase.from('fichas').select('id, aluna_id, nome, criado_em').eq('ativa', true)
}

function Foto({ nome, url }) {
  return (
    <span className="mini-avatar" aria-hidden="true">
      {url ? <img src={url} alt="" /> : iniciais(nome)}
    </span>
  )
}

// Tela inicial do administrador: notificações e pendências reais + acesso rápido às áreas.
export default function Inicio({ perfil, irPara, abrirAluna }) {
  const [dados, setDados] = useState(null)
  const [erros, setErros] = useState([])
  const [vistos, setVistos] = useState(lerVistos)
  const [todas, setTodas] = useState(false)

  const carregar = useCallback(async () => {
    const desde = new Date(Date.now() - JANELA_CONCLUIDOS_DIAS * 86400000).toISOString()
    const [p, s, a, f, ex, m, al] = await Promise.all([
      supabase.from('profiles').select('id, nome, ativa, avatar_url').eq('papel', 'aluna').order('nome'),
      supabase.from('sessoes').select('id, aluna_id, treino_nome, finalizada_em, cansaco')
        .not('finalizada_em', 'is', null).gte('finalizada_em', desde).order('finalizada_em', { ascending: false }).limit(200),
      supabase.from('aerobico_registros').select('id, aluna_id, modalidade, finalizada_em, duracao_seg, pse')
        .eq('status', 'finalizada').not('finalizada_em', 'is', null).gte('finalizada_em', desde).order('finalizada_em', { ascending: false }).limit(200),
      buscarFichasAtivas(),
      supabase.from('exercicios').select('id, ativo'),
      supabase.from('modelos').select('id', { count: 'exact', head: true }),
      supabase.from('alongamentos').select('id, ativo'),
    ])
    const falhas = []
    const ok = (r, rotulo) => { if (r.error) { falhas.push(`${rotulo}: ${mensagemErro(r.error)}`); return [] } return r.data || [] }
    const alunas = ok(p, 'alunas')
    const nomes = Object.fromEntries(alunas.map(x => [x.id, x]))
    const exercicios = ok(ex, 'exercícios')
    const along = ok(al, 'alongamentos')
    setErros(falhas)
    setDados({
      alunas,
      concluidos: agruparConcluidos(ok(s, 'treinos concluídos'), ok(a, 'aeróbicos concluídos'), nomes),
      lembretes: lembretesFichas(alunas, ok(f, 'fichas')),
      lembretesOk: !p.error && !f.error,
      semValidade: fichasSemValidade(alunas, ok(f, 'fichas')),
      concluidosOk: !p.error && !s.error,
      exercicios: ex.error ? null : { ativos: exercicios.filter(x => x.ativo).length, total: exercicios.length },
      modelos: m.error ? null : (m.count ?? 0),
      along: al.error ? null : { ativos: along.filter(x => x.ativo).length, total: along.length },
    })
  }, [])

  useEffect(() => {
    carregar()
    // Ao voltar para o app (ou para a aba), atualiza, para as notificações refletirem o que as alunas acabaram de fazer.
    const f = () => { if (document.visibilityState === 'visible') carregar() }
    document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [carregar])

  const marcar = chaves => { const n = marcarVistos(dados.concluidos, vistos, chaves); setVistos(n); gravarVistos(n) }
  const abrir = item => { marcar([item.chave]); abrirAluna('evolucao', { id: item.alunaId, nome: item.nome }) }

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const novas = dados ? dados.concluidos.filter(i => ehNovo(i, vistos)).length : 0
  const pend = dados ? dados.lembretes.length : 0
  const res = dados ? resumoAlunas(dados.alunas) : null
  const lista = dados ? (todas ? dados.concluidos : dados.concluidos.slice(0, LIMITE)) : []

  return (
    <main className="painel">
      <div className="perfil">
        <span className="avatar sem-acao">{iniciais(perfil.nome)}</span>
        <div className="grow">
          <h2>Olá, {primeiroNome(perfil.nome)}</h2>
          <div className="muted">
            {hoje}{dados ? ` · ${plural(novas, 'notificação nova', 'notificações novas')}${pend ? ` · ${plural(pend, 'pendência', 'pendências')}` : ''}` : ''}
          </div>
        </div>
      </div>

      {erros.length > 0 && <p className="erro">Não foi possível carregar tudo: {erros.join(' · ')}</p>}

      <div className="painel-acessos">
        <button className="atalho" onClick={() => irPara('alunas')}>
          <span className="ico"><Icone nome="users" /></span>
          <span><strong>Alunas</strong>
            <small>{res ? `${res.ativas} ${res.ativas === 1 ? 'ativa' : 'ativas'} · ${res.inativas} ${res.inativas === 1 ? 'inativa' : 'inativas'}` : 'Carregando…'}</small></span>
        </button>
        <button className="atalho" onClick={() => irPara('exercicios')}>
          <span className="ico"><Icone nome="dumbbell" /></span>
          <span><strong>Exercícios</strong>
            <small>{dados?.exercicios ? `${dados.exercicios.ativos} ativos de ${dados.exercicios.total}` : dados ? 'Biblioteca' : 'Carregando…'}</small></span>
        </button>
        <button className="atalho" onClick={() => irPara('modelos')}>
          <span className="ico"><Icone nome="modelos" /></span>
          <span><strong>Modelos de treino</strong>
            <small>{dados?.modelos != null ? plural(dados.modelos, 'modelo salvo', 'modelos salvos') : dados ? 'Biblioteca' : 'Carregando…'}</small></span>
        </button>
        <button className="atalho" onClick={() => irPara('alongamentos')}>
          <span className="ico"><Icone nome="alongar" /></span>
          <span><strong>Alongamentos</strong>
            <small>{dados?.along ? `${dados.along.ativos} ${dados.along.ativos === 1 ? 'ativo' : 'ativos'} de ${dados.along.total}` : dados ? 'Biblioteca e sequências' : 'Carregando…'}</small></span>
        </button>
      </div>

      <div className="painel-colunas">
        <section className="painel-card" aria-labelledby="t-fichas">
          <div className="painel-cab">
            <h3 id="t-fichas"><Icone nome="modelos" tam={18} /> Fichas e pendências</h3>
          </div>
          <div className="muted pequeno">Fichas que vencem em até 7 dias e alunas sem ficha ativa</div>
          {!dados && <p className="painel-vazio">Carregando…</p>}
          {dados && !dados.lembretesOk && <p className="painel-vazio">Não foi possível carregar as fichas.</p>}
          {dados && dados.lembretesOk && dados.lembretes.length === 0 && (
            <div className="bloco calmo painel-ok"><h3>Tudo em dia</h3><p>Nenhuma ficha precisa de atualização agora.</p></div>
          )}
          {dados && dados.lembretes.map(l => (
            <button key={l.chave} className={'notif lembrete ' + l.nivel} onClick={() => abrirAluna('fichas', { id: l.alunaId, nome: l.nome })}>
              <Foto nome={l.nome} url={l.avatar} />
              <span className="notif-txt">
                <span className="notif-t"><strong>{l.nome}</strong></span>
                <span className="notif-d">
                  {l.nivel === 'sem-ficha' ? 'Sem ficha ativa'
                    : `${l.ficha} · ${l.restam < 0 ? 'venceu em' : 'vence em'} ${fmtData(l.vence)}`}
                </span>
              </span>
              <span className="notif-q">
                <em className={'pilula ' + l.nivel}>
                  {l.nivel === 'sem-ficha' ? 'Criar ficha' : l.nivel === 'vencida' ? 'Vencida' : l.restam === 0 ? 'Vence hoje' : l.restam === 1 ? 'Vence amanhã' : `Vence em ${l.restam} dias`}
                </em>
              </span>
            </button>
          ))}
          {dados && dados.lembretesOk && dados.semValidade > 0 && (
            <p className="muted pequeno painel-nota">
              {plural(dados.semValidade, 'ficha ativa está sem validade definida e não gera lembrete', 'fichas ativas estão sem validade definida e não geram lembrete')}. Defina em Alunas › Treinos › Alterar validade.
            </p>
          )}
        </section>

        <section className="bloco painel-notif" aria-labelledby="t-concl">
          <div className="painel-cab">
            <h3 id="t-concl"><Icone nome="sino" tam={18} /> Treinos concluídos</h3>
            {novas > 0 && <button className="painel-link" onClick={() => marcar(null)}>Marcar como vistas</button>}
          </div>
          <div className="data">Últimos {JANELA_CONCLUIDOS_DIAS} dias{novas > 0 ? ` · ${plural(novas, 'nova', 'novas')}` : ''}</div>
          {!dados && <p className="painel-vazio">Carregando…</p>}
          {dados && !dados.concluidosOk && <p className="painel-vazio">Não foi possível carregar as notificações.</p>}
          {dados && dados.concluidosOk && dados.concluidos.length === 0 && <p className="painel-vazio">Nenhum treino concluído nos últimos {JANELA_CONCLUIDOS_DIAS} dias.</p>}
          {lista.map(i => {
            const novo = ehNovo(i, vistos)
            return (
              <button key={i.chave} className={'notif' + (novo ? ' nova' : '')} onClick={() => abrir(i)}>
                <Foto nome={i.nome} url={i.avatar} />
                <span className="notif-txt">
                  <span className="notif-t"><strong>{primeiroNome(i.nome)}</strong>{' '}
                    {i.tipo === 'aerobico' ? 'concluiu o aeróbico' : i.n > 1 ? `concluiu ${i.n} treinos` : 'concluiu o treino'}</span>
                  <span className="notif-d">{i.detalhes.join(' · ')}</span>
                </span>
                <span className="notif-q">{novo && <em className="pilula">Novo</em>}{rotuloQuando(i.quando)}</span>
              </button>
            )
          })}
          {dados && dados.concluidos.length > LIMITE && (
            <button className="painel-link mais" onClick={() => setTodas(!todas)}>{todas ? 'Mostrar menos' : `Mostrar todas (${dados.concluidos.length})`}</button>
          )}
        </section>
      </div>
    </main>
  )
}
