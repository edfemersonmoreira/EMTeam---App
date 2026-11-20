import { useState } from 'react'

// Cabeçalho: logo horizontal compacta (sem slogan). Login: logo empilhada com slogan.
// Se o arquivo não carregar, mostra apenas o nome em texto simples.
export default function Logo({ grande = false }) {
  const [ok, setOk] = useState(true)
  if (!ok) return <span className={'marca' + (grande ? ' grande' : '')}>EM Team</span>
  // A empilhada tem duas versões (o slogan muda de cor no tema claro); o CSS mostra a do tema atual.
  const img = grande ? (
    <>
      <img src="/emteam-empilhada.svg" alt="EM Team" className="logo grande so-escuro" onError={() => setOk(false)} />
      <img src="/emteam-empilhada-claro.svg" alt="" aria-hidden="true" className="logo grande so-claro" />
    </>
  ) : (
    <img src="/emteam-horizontal-compacta.svg" alt="EM Team" className="logo" onError={() => setOk(false)} />
  )
  // Logo grande (login): fica dentro de um quadro próprio, e a anilha é desenhada em relação a esse quadro.
  // Assim a logo e a anilha mantêm o mesmo centro em qualquer tamanho de tela.
  return grande ? <div className="logo-marca">{img}</div> : img
}
