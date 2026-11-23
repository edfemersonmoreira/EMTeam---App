import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { mensagemErro } from './erros'
import Icone from './Icone'
import Voltar from './Voltar'
import Etiqueta from './Etiqueta'
import { useDialogo } from './Dialogo'
import { useSalvamento, StatusSalvo } from './Salvamento'
import { PSE_ROTULOS, rotuloPse, fmtDuracao, ativo } from './aerobicoUtil'
import './aerobico.css'

const MODALIDADES = ['Esteira', 'Bicicleta', 'Elíptico', 'Caminhada', 'Corrida', 'Escada', 'Remo', 'Natação', 'Outra']
const MSG_MIGRACAO = 'Rode a migração da Etapa 7.3 no Supabase para usar o aeróbico. '

function Prescricao({ p, onMudou, onErro }) {
  const [v, setV] = useState({
    modalidade: p.modalidade, tempo_previsto_min: p.tempo_previsto_min ?? '', intensidade: p.intensidade ?? '',
    pse_desejada: p.pse_desejada ?? '', orientacoes: p.orientacoes ?? '',
  })
  const salvo = useSalvamento()
  const { confirmar } = useDialogo()
  const dados = x => ({
    modalidade: x.modalidade.trim(),
    tempo_previsto_min: x.tempo_previsto_min === '' ? null : parseInt(x.tempo_previsto_min, 10) || null,
    intensidade: x.intensidade.trim() || null,
    pse_desejada: x.pse_desejada === '' ? null : parseInt(x.pse_desejada, 10),
    orientacoes: x.orientacoes.trim() || null,
  })
  const salvoJson = useRef(JSON.stringify(dados(v)))   // só grava quando algum valor mudou
  async function salvar(novo = {}) {
    const x = { ...v, ...novo }
    setV(x)
    if (!x.modalidade.trim()) return onErro('Informe a modalidade.')
    const d = dados(x), json = JSON.stringify(d)
    if (json === salvoJson.current) return
    const erro = await salvo.rodar(async () => { const { error } = await supabase.from('aerobico_prescricoes').update(d).eq('id', p.id); return error ? mensagemErro(error) : '' })
    if (!erro) salvoJson.current = json
    onErro(erro)
  }
  async function alternar() { await supabase.from('aerobico_prescricoes').update({ ativa: !p.ativa }).eq('id', p.id); onMudou() }
  async function excluir() {
    if (!(await confirmar({ titulo: `Excluir a prescrição de ${p.modalidade.toLowerCase()}?`, texto: 'As atividades já registradas pela aluna continuam salvas.', acao: 'Excluir', perigo: true }))) return
    const { error } = await supabase.from('aerobico_prescricoes').delete().eq('id', p.id)
    if (error) return onErro(mensagemErro(error))
    onMudou()
  }
  const set = c => e => setV({ ...v, [c]: e.target.value })
  return (
    <div className={'card' + (p.ativa ? '' : ' off')}>
      <div className="topo" style={{ marginBottom: 6 }}>
        <span className="row" style={{ margin: 0 }}>{!p.ativa && <Etiqueta>Desativada</Etiqueta>}</span>
        <StatusSalvo s={salvo} />
      </div>
      <div className="grid3">
        <label>Modalidade<input list="modalidades-aero" value={v.modalidade} onChange={set('modalidade')} onBlur={() => salvar()} /></label>
        <label>Tempo (min)<input type="number" min="1" value={v.tempo_previsto_min} onChange={set('tempo_previsto_min')} onBlur={() => salvar()} /></label>
        <label>PSE desejada
          <select value={v.pse_desejada} onChange={e => salvar({ pse_desejada: e.target.value })}>
            <option value="">Não definir</option>
            {PSE_ROTULOS.map((r, n) => <option key={n} value={n}>{n}, {r.toLowerCase()}</option>)}
          </select>
        </label>
      </div>
      <label className="campo-rotulo">Intensidade (opcional)
        <input placeholder="Por exemplo, ritmo leve em que consiga conversar" value={v.intensidade} onChange={set('intensidade')} onBlur={() => salvar()} />
      </label>
      <label className="campo-rotulo">Orientações
        <textarea rows="3" value={v.orientacoes} onChange={set('orientacoes')} onBlur={() => salvar()} />
      </label>
      <div className="row">
        <button className="btn sec sm" onClick={alternar}>{p.ativa ? 'Desativar' : 'Reativar'}</button>
        <button className="btn fantasma sm" onClick={excluir}><Icone nome="lixeira" tam={16} />Excluir</button>
      </div>
    </div>
  )
}

export default function AerobicoAdmin({ aluna, onVoltar }) {
  const [presc, setPresc] = useState([])
  const [regs, setRegs] = useState([])
  const [msg, setMsg] = useState('')

  async function carregar() {
    const [p, r] = await Promise.all([
      supabase.from('aerobico_prescricoes').select('*').eq('aluna_id', aluna.id).order('ordem').order('criado_em'),
      supabase.from('aerobico_registros').select('*').eq('aluna_id', aluna.id).order('iniciada_em', { ascending: false }).limit(60),
    ])
    if (p.error) return setMsg(MSG_MIGRACAO + p.error.message)
    setPresc(p.data); setRegs(r.data || [])
  }
  useEffect(() => { carregar() }, [])

  async function nova() {
    const { error } = await supabase.from('aerobico_prescricoes').insert({ aluna_id: aluna.id, modalidade: 'Esteira', tempo_previsto_min: 30, ordem: presc.length })
    if (error) return setMsg(mensagemErro(error))
    setMsg(''); carregar()
  }

  return (
    <>
      <Voltar onClick={onVoltar} rotulo="Alunas" />
      <h3>Aeróbico de {aluna.nome}</h3>
      {msg && <p className="erro">{msg}</p>}

      <datalist id="modalidades-aero">{MODALIDADES.map(m => <option key={m} value={m} />)}</datalist>
      <div className="topo"><strong>Prescrição</strong><button className="btn sm" onClick={nova}><Icone nome="mais" tam={18} />Nova prescrição</button></div>
      {presc.length === 0 && !msg && <p className="muted">Nenhum aeróbico prescrito para esta aluna ainda.</p>}
      {presc.map(p => <Prescricao key={p.id} p={p} onMudou={carregar} onErro={setMsg} />)}

      <h3 style={{ marginTop: 24 }}>Histórico de atividades</h3>
      <p className="muted">Independente do histórico de cargas.</p>
      {regs.length === 0 && <p className="muted">Nenhuma atividade registrada ainda.</p>}
      {regs.map(r => (
        <div key={r.id} className="card">
          <div className="topo">
            <strong>{r.modalidade}</strong>
            <span className="muted">{new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="muted">
            {ativo(r) ? 'Em andamento agora' : `${fmtDuracao(r.duracao_seg)}, ${r.pse == null ? 'PSE não informada' : `PSE ${r.pse} (${rotuloPse(r.pse).toLowerCase()})`}`}
            {r.tempo_previsto_min ? `, previsto ${r.tempo_previsto_min} min` : ''}
          </div>
          {r.observacoes && <p className="orient" style={{ margin: '8px 0 0' }}>{r.observacoes}</p>}
        </div>
      ))}
    </>
  )
}
