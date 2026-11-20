import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import ErrorBoundary from './ErrorBoundary'
import './styles.css'
import { aplicarTema, temaSalvo } from './tema'
import './marca.css'
import './series.css'
aplicarTema(temaSalvo())
createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
