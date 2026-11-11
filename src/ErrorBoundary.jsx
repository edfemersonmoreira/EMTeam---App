import { Component } from 'react'

// Se alguma tela falhar, mostra uma mensagem em vez de deixar a tela preta.
export default class ErrorBoundary extends Component {
  state = { erro: null }
  static getDerivedStateFromError(erro) { return { erro } }
  componentDidCatch(erro) { console.error(erro) }
  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="login">
        <h3>Algo deu errado</h3>
        <p className="muted">Recarregue a página. Se o problema continuar, envie o texto abaixo ao seu treinador.</p>
        <p className="erro" style={{ wordBreak: 'break-word' }}>{String(this.state.erro?.message || this.state.erro)}</p>
        <button className="btn" onClick={() => window.location.reload()}>Recarregar</button>
      </div>
    )
  }
}
