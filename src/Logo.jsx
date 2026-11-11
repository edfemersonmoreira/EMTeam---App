import { useState } from 'react'

// Usa o arquivo /public/logo.png. Se ele não existir, mostra apenas o nome em texto simples.
export default function Logo({ grande = false }) {
  const [ok, setOk] = useState(true)
  if (!ok) return <span className={'marca' + (grande ? ' grande' : '')}>EM Team</span>
  return (
    <img src="/logo.png" alt="EM Team" className={'logo' + (grande ? ' grande' : '')} onError={() => setOk(false)} />
  )
}
