import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import ErrorBoundary from './ErrorBoundary'
import { DialogoProvider } from './Dialogo'
import './styles.css'
import { aplicarTema, temaSalvo } from './tema'
import './marca.css'
import './series.css'
import './ui.css'
aplicarTema(temaSalvo())
createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <DialogoProvider>
      <App />
    </DialogoProvider>
  </ErrorBoundary>
)
