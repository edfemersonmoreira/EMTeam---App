import { useRef, useState } from 'react'
import { supabase } from './supabase'
import Icone from './Icone'

function redimensionar(arquivo, lado = 320) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(arquivo)
    img.onload = () => {
      const m = Math.min(img.width, img.height)
      const c = document.createElement('canvas')
      c.width = c.height = lado
      c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, lado, lado)
      URL.revokeObjectURL(url)
      c.toBlob(b => (b ? resolve(b) : reject(new Error('Não foi possível processar a foto.'))), 'image/jpeg', 0.85)
    }
    img.onerror = () => reject(new Error('Arquivo de imagem inválido.'))
    img.src = url
  })
}

export default function Avatar({ perfil, onErro }) {
  const [url, setUrl] = useState(perfil.avatar_url || '')
  const [enviando, setEnviando] = useState(false)
  const ref = useRef(null)
  const iniciais = (perfil.nome || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')

  async function trocar(e) {
    const arquivo = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!arquivo) return
    setEnviando(true); onErro('')
    try {
      const blob = await redimensionar(arquivo)
      const caminho = `${perfil.id}/avatar.jpg`
      const up = await supabase.storage.from('avatares').upload(caminho, blob, { upsert: true, contentType: 'image/jpeg' })
      if (up.error) throw up.error
      const { data } = supabase.storage.from('avatares').getPublicUrl(caminho)
      const novo = `${data.publicUrl}?v=${Date.now()}`
      const r = await supabase.rpc('definir_avatar', { p_url: novo })
      if (r.error) throw r.error
      setUrl(novo)
    } catch (err) {
      onErro('Não foi possível enviar a foto. ' + (err.message || ''))
    }
    setEnviando(false)
  }

  return (
    <>
      <button className="avatar" onClick={() => ref.current.click()} disabled={enviando} aria-label="Trocar foto do perfil">
        {url ? <img src={url} alt="" /> : <span>{iniciais}</span>}
        <span className="cam"><Icone nome="camera" tam={12} /></span>
      </button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={trocar} />
    </>
  )
}
