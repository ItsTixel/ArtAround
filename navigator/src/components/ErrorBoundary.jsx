import { Component } from 'react'

// Rete di sicurezza: un errore di render in una pagina (es. un dato inatteso
// dal backend) verrebbe altrimenti mostrato come schermata bianca. Qui viene
// intercettato e sostituito da un fallback con un pulsante per ricaricare.
// Deve restare un class component: getDerivedStateFromError/componentDidCatch
// non hanno equivalente fra gli hook.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Lasciato in console per la diagnosi durante demo/correzione.
    console.error('ErrorBoundary ha intercettato un errore:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-text">Qualcosa è andato storto</h1>
          <p className="mt-2 text-sm text-text-muted">
            Si è verificato un errore imprevisto. Prova a ricaricare la pagina.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-gradient-to-br from-accent to-accent-hover px-4 py-2 text-sm font-medium text-on-accent shadow-lg shadow-black/10 dark:shadow-black/30"
        >
          Ricarica
        </button>
      </div>
    )
  }
}

export default ErrorBoundary
