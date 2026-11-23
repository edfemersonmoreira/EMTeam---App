import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { mensagemErro } from './erros'
import Icone from './Icone'
import Voltar from './Voltar'
import Etiqueta from './Etiqueta'
import { useDialogo } from './Dialogo'

export const PALETA = ['#20B2AA', '#008080', '#E0A93B', '#6FA8F5', '#A98BF0', '#E5635F', '#F0914B', '#4FC3E8', '#C8B08A', '#9BAAAA']

export default function Categorias({ onVoltar }) {
  const [lista, setLista] = useState([])
  const [msg, setMsg] = useState('')
  const [novo, setNovo] = useState({ nome: '', cor: PALETA[3] })
  const [corAberta, setCorAberta] = useState(null)
  const { confirmar } = useDialogo()

  async function carregar() {
    const { data, error } = await supabase.from('categorias_serie').select('*').order('ordem')
    if (error) setMsg('Não foi possível carregar as categorias. Rode a migração da Etapa 7.1 no Supabase. ' + error.message)
    else setLista(data)
  }
  useEffect(() => { carregar() }, [])

  const erro = e => (e.code === '23505' ? 'Já existe uma categoria com esse nome.' : mensagemErro(e))

  async function adicionar(e) {
    e.preventDefault()
    const nome = novo.nome.trim()
    if (!nome) return
    const ordem = lista.reduce((m, c) => Math.max(m, c.ordem), 0) + 1
    const { error } = await supabase.from('categorias_serie').insert({ nome, cor: novo.cor, ordem })
    if (error) return setMsg(erro(error))
    setNovo({ nome: '', cor: novo.cor }); setMsg(''); carregar()
  }

  async function atualizar(c, campos) {
    const { error } = await supabase.from('categorias_serie').update(campos).eq('id', c.id)
    if (error) setMsg(erro(error)); else { setMsg(''); carregar() }
  }

  async function mover(i, d) {
    const j = i + d
    if (j < 0 || j >= lista.length) return
    const arr = [...lista]; [arr[i], arr[j]] = [arr[j], arr[i]]
    await Promise.all(arr.map((c, idx) => (c.ordem !== idx + 1 ? supabase.from('categorias_serie').update({ ordem: idx + 1 }).eq('id', c.id) : null)))
    carregar()
  }

  async function excluir(c) {
    if (!(await confirmar({ titulo: `Excluir a categoria ${c.nome}?`, texto: 'Se ela já foi usada em prescrições ou registros, desative em vez de excluir.', acao: 'Excluir', perigo: true }))) return
    const { error } = await supabase.from('categorias_serie').delete().eq('id', c.id)
    if (error) return setMsg(error.code === '23503' ? 'Essa categoria já foi usada em prescrições ou registros. Desative-a em vez de excluir.' : mensagemErro(error))
    setMsg(''); carregar()
  }

  return (
    <>
      <Voltar onClick={onVoltar} />
      <h3>Tipos de série e técnicas</h3>
      <p className="muted">Cadastre as categorias que você usa na prescrição. Só a categoria Principal alimenta o histórico de cargas e os gráficos. As demais ficam registradas separadamente.</p>
      {msg && <p className="erro">{msg}</p>}

      {lista.map((c, i) => (
        <div key={c.id} className={'card' + (c.ativa ? '' : ' off')}>
          <div className="cat-linha">
            <button className="cat-cor" style={{ background: c.cor }} aria-label={`Escolher cor de ${c.nome}`} onClick={() => setCorAberta(corAberta === c.id ? null : c.id)} />
            <input key={c.id + c.nome} style={{ margin: 0, flex: 1, minWidth: 120 }} defaultValue={c.nome} disabled={c.principal} aria-label="Nome da categoria"
              onBlur={e => { const v = e.target.value.trim(); if (v && v !== c.nome) atualizar(c, { nome: v }) }} />
            {c.principal && <Etiqueta tipo="sucesso">Alimenta o histórico</Etiqueta>}
            {!c.ativa && <Etiqueta>Desativada</Etiqueta>}
            <button className="mini icone" disabled={i === 0} onClick={() => mover(i, -1)} aria-label={`Subir ${c.nome}`} title="Subir"><Icone nome="cima" tam={16} /></button>
            <button className="mini icone" disabled={i === lista.length - 1} onClick={() => mover(i, 1)} aria-label={`Descer ${c.nome}`} title="Descer"><Icone nome="baixo" tam={16} /></button>
            {!c.principal && <button className="mini" onClick={() => atualizar(c, { ativa: !c.ativa })}>{c.ativa ? 'Desativar' : 'Reativar'}</button>}
            {!c.principal && <button className="mini icone perigo" onClick={() => excluir(c)} aria-label={`Excluir ${c.nome}`} title="Excluir"><Icone nome="x" tam={16} /></button>}
          </div>
          {corAberta === c.id && (
            <div className="paleta">
              {PALETA.map(p => (
                <button key={p} className={p === c.cor ? 'on' : ''} style={{ background: p }} aria-label={p}
                  onClick={() => { atualizar(c, { cor: p }); setCorAberta(null) }} />
              ))}
            </div>
          )}
        </div>
      ))}

      <form onSubmit={adicionar} className="card">
        <strong>Nova categoria</strong>
        <input placeholder="Nome (por exemplo, Pré-exaustão)" value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} />
        <div className="paleta">
          {PALETA.map(p => (
            <button type="button" key={p} className={p === novo.cor ? 'on' : ''} style={{ background: p }} aria-label={p} onClick={() => setNovo({ ...novo, cor: p })} />
          ))}
        </div>
        <button className="btn" style={{ marginTop: 12 }}><Icone nome="mais" tam={18} />Adicionar categoria</button>
      </form>
    </>
  )
}
