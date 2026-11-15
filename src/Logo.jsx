import { useState } from 'react'

// Cabeçalho: logo horizontal compacta (sem slogan). Login: logo empilhada com slogan.
// Se o arquivo não carregar, mostra apenas o nome em texto simples.
export default function Logo({ grande = false }) {
  const [ok, setOk] = useState(true)
  if (!ok) return <span className={'marca' + (grande ? ' grande' : '')}>EM Team</span>
  return (
    <img
      src={grande ? '/emteam-empilhada.svg' : '/emteam-horizontal-compacta.svg'}
      alt="EM Team"
      className={'logo' + (grande ? ' grande' : '')}
      onError={() => setOk(false)}
    />
  )
}
