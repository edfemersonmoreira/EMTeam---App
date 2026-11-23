import { useEffect, useRef, useState } from 'react'
import Icone from './Icone'
import { mensagemErro } from './erros'

// Indicador de salvamento automático. Os campos continuam salvando do mesmo jeito (ao sair do campo);
// isto só mostra o resultado: "Salvando…", "Salvo" (some sozinho) ou "Não salvou".
//
// Uso:  const salvo = useSalvamento()
//       salvo.rodar(async () => { const { error } = await supabase…; return error ? mensagemErro(error) : '' })
//       <StatusSalvo s={salvo} />
// rodar devolve a mesma mensagem de erro da função ('' quando deu certo).
export function useSalvamento() {
  const [estado, setEstado] = useState('ocioso')   // ocioso | salvando | salvo | erro
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  async function rodar(fn) {
    clearTimeout(timer.current)
    setEstado('salvando')
    let msg = ''
    try { msg = (await fn()) || '' } catch (e) { msg = mensagemErro(e) }
    setEstado(msg ? 'erro' : 'salvo')
    if (!msg) timer.current = setTimeout(() => setEstado('ocioso'), 2500)
    return msg
  }
  return { estado, rodar }
}

const TEXTO = { salvando: 'Salvando…', salvo: 'Salvo', erro: 'Não salvou' }

export function StatusSalvo({ s }) {
  return (
    <span className={'status-salvo ' + s.estado} role="status" aria-live="polite">
      {s.estado === 'salvo' && <Icone nome="check" tam={14} />}
      {TEXTO[s.estado] || ''}
    </span>
  )
}
