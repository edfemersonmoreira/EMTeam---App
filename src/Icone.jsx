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
  // Treino de superiores: braço flexionado (Hugeicons "biceps-flexed", licença MIT)
  superior: <g strokeWidth="1.5"><path d="M14.057 13.5c.982-.637 2.203-1.015 3.526-1.015q.461 0 .903.07c2.058.316 3.014 2.582 3.014 4.733c0 2.152-.977 4.39-3.041 4.656a7 7 0 0 1-.876.056c-1.505 0-2.905-.212-3.944-1.016c-1.687.727-5.692 1.254-9.776-1.44c-1.298-.857-1.662-2.585-1.122-4.075A49.4 49.4 0 0 1 8.124 4.832l.644-.962c.056-.084.085-.126.114-.165a1.97 1.97 0 0 1 .903-.679c.045-.016.092-.031.187-.06l2.01-.624c.802-.249 1.203-.373 1.586-.335c.291.028.573.124.825.28c.33.205.58.551 1.082 1.243l.388.535c.215.297.323.446.387.584a1.56 1.56 0 0 1-.337 1.78c-.11.102-.263.198-.571.389a3 3 0 0 1-.273.16a1.43 1.43 0 0 1-.944.107a3 3 0 0 1-.3-.095l-.727-.25c-.697-.24-1.046-.36-1.373-.233c-.327.128-.5.438-.847 1.057c-.855 1.526-1.782 3.628-2.152 6.306c1.31-.847 4.52-1.829 6.878 1.016" /></g>,
  // Treino de inferiores: perna (Hugeicons "body-part-leg", licença MIT)
  inferior: <g strokeWidth="1.5"><path d="M5.002 2c2.691.314 8.897 1.896 11.64 5.746c.337.47.69.804 1.27.95c.724.18 1.324.666 1.542 1.4c.232.798.66 1.64.524 2.494c-.052.327-.212.628-.532 1.23L15.099 22" /><path d="M4.002 12c1 1.726 4.164 2.596 8 1.726a10.1 10.1 0 0 0-2.685 2.225c-.559.646-.797 1.544-.836 2.452c-.052 1.212-.232 2.53-.854 3.597M5.002 7s1.959.29 3.5 1.5c1 .786 2.916 1.31 3.5 1.5" /></g>,
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
