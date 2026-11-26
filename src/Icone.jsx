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
  // Treino de superiores: braço flexionado, contorno suave e arredondado
  superior: <><path d="M4.6 19.5H16.5C18.8 19.5 20.5 17.8 20.5 15.5V9C21.6 8.2 21.8 6.5 21 5.4C20 4 17.8 3.8 16.6 4.9C15.6 5.8 15.6 7.4 16.5 8.3L15.8 13C15.2 13.7 14.4 13.5 14 12.8C12.6 10.8 8.6 10.6 6.6 12.6C5.9 13.3 5.4 14 4.6 14C3.7 14 3 14.7 3 15.6V17.9C3 18.8 3.7 19.5 4.6 19.5Z" /><path d="M9.2 16.2C10.6 15.4 12.4 15.4 13.6 16.2" /></>,
  // Treino de inferiores: perna de perfil (coxa, joelho, panturrilha e pé), contorno suave e arredondado
  inferior: <><path d="M7.4 3.3C6.9 6.4 7.6 9.2 9.4 11.6C8.3 13.2 8.3 15.6 9.8 17.3L10.2 19.8C10.2 20.9 10.9 21.5 12 21.5H17.6C18.6 21.5 18.8 20.2 17.9 19.8L14 18.4L13.8 13.2C13.8 12.2 14.3 11.5 14.9 10.7C16.3 8.6 16.4 5.6 15.6 3.3C15.4 2.7 14.9 2.4 14.3 2.4H8.7C8 2.4 7.5 2.7 7.4 3.3Z" /></>,
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
