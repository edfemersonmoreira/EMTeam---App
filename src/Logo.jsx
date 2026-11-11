import { useState } from 'react'

// Usa as logos em /public: versão horizontal no cabeçalho e empilhada no login.
// Se o arquivo não carregar, mostra apenas o nome em texto simples.
export default function Logo({ grande = false }) {
  const [ok, setOk] = useState(true)
  if (!ok) return <span className={'marca' + (grande ? ' grande' : '')}>EM Team</span>
  return (
    <img
      src={grande ? '/logo-empilhada.png' : '/logo-horizontal.png'}
      alt="EM Team"
      className={'logo' + (grande ? ' grande' : '')}
      onError={() => setOk(false)}
    />
  )
}
