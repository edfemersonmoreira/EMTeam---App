import { useEffect, useState } from 'react'
import Icone from './Icone'
import { temaAtual, trocarTema, observarTema } from './tema'

// Alternância entre tema escuro e claro (no cabeçalho, ao lado de Senha e Sair).
export default function TemaBotao() {
  const [tema, setTema] = useState(temaAtual())
  useEffect(() => observarTema(setTema), [])
  const claro = tema === 'claro'
  const rotulo = claro ? 'Mudar para o tema escuro' : 'Mudar para o tema claro'
  return (
    <button className="cab-btn" onClick={() => setTema(trocarTema())} aria-label={rotulo} title={rotulo}>
      <Icone nome={claro ? 'lua' : 'sol'} tam={18} />
    </button>
  )
}
