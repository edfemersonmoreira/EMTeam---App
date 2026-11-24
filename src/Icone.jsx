const P = {
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.7a3.5 3.5 0 010 6.6M18 14.3c2.2.6 3.5 2.4 3.5 5.7" /></>,
  dumbbell: <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />,
  grafico: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  conversa: <path d="M21 12a8.5 8.5 0 01-12.4 7.5L3 21l1.6-5.4A8.5 8.5 0 1121 12z" />,
  camera: <><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" /><circle cx="12" cy="13.5" r="3.5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  play: <path d="M8 5.5v13l11-6.5z" fill="currentColor" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  voltar: <path d="M19 12H5M11 6l-6 6 6 6" />,
  mais: <path d="M12 5v14M5 12h14" />,
  // Treino de superiores: braço flexionado, com o bíceps discretamente marcado
  superior: <><path d="M3 20h10.5c3.9 0 6.5-2.5 6.5-6.2V9c0-2.2-1.5-4-3.6-4h-1.2C14 5 13 6 13 7.2v.9c0 1.1.9 1.9 2 1.9h.5v2.6c-1-1.6-2.9-2.8-5.3-2.8-2.9 0-5.4 1.2-7.2 3.2V20z" /><path d="M8.6 15c1.4-.9 3.2-1 4.7-.2" /></>,
  // Treino de inferiores: perna de perfil (coxa, joelho, panturrilha), com o quadríceps discretamente marcado
  inferior: <><path d="M5.5 4.4L15.3 3c1.6 3 1.5 5.8 0 8.3-.4.7-.4 1.3-.2 1.9l.5 5.2c1.4.4 2.9.9 4 1.6.6.4.3 1.2-.4 1.2h-6.6c-.6 0-1-.5-.8-1.1.2-.7.2-1.4-.2-2-1.4-1.6-2-3.3-1.5-4.9.2-.7.5-1.2.5-1.9C8.7 9.6 6.3 7.5 5.5 4.4z" /><path d="M12.7 5.6c.8 1.5.8 3.3.1 4.9" /></>,
  coracao: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.3a4.3 4.3 0 017.5 2.5C19.5 15.4 12 20 12 20z" />,
  modelos: <><rect x="4" y="3.5" width="13" height="17" rx="2" /><path d="M8 8h5M8 12h5M8 16h3M20 7v12.5a1 1 0 01-1 1h-1.5" /></>,
  sino: <path d="M6 9a6 6 0 0112 0c0 5 2 6.5 2 6.5H4S6 14 6 9zM10 19a2 2 0 004 0" />,
  lapiz: <path d="M4 20h4L19.5 8.5a2.1 2.1 0 00-3-3L5 17v3zM14.5 7.5l3 3" />,
  desligar: <path d="M12 3v8M6.3 6.8a8 8 0 1011.4 0" />,
  sol: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" /></>,
  lua: <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />,
  alongar: <><circle cx="12" cy="4.5" r="2" /><path d="M4 9l8 2 8-2M12 11v5M8 21l4-5 4 5" /></>,
  inicio: <path d="M4 10.5L12 4l8 6.5V19a1 1 0 01-1 1h-4.5v-5.5h-5V20H5a1 1 0 01-1-1z" />,
  busca: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></>,
  usuario: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6" /></>,
  cima: <path d="M12 19V5M6 11l6-6 6 6" />,
  baixo: <path d="M12 5v14M6 13l6 6 6-6" />,
  menu: <><circle cx="5.5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="18.5" cy="12" r="1.4" fill="currentColor" /></>,
  lixeira: <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" />,
  copiar: <><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M15.5 8.5V6a1.5 1.5 0 00-1.5-1.5H6A1.5 1.5 0 004.5 6v8A1.5 1.5 0 006 15.5h2.5" /></>,
}

export default function Icone({ nome, tam = 20 }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      {P[nome] || P.dumbbell}
    </svg>
  )
}
