import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** Fängt unerwartete Fehler ab und bietet „Erneut versuchen“ statt eines weißen Bildschirms */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unerwarteter Fehler', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    const chunkError = /dynamically imported module|Loading chunk|Failed to fetch/i.test(this.state.error.message)
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl" aria-hidden>
          🍽️
        </p>
        <h1 className="mt-4 text-xl font-bold">Da ist etwas schiefgelaufen</h1>
        <p className="mt-2 text-muted">
          {chunkError
            ? 'Dieser Bereich konnte nicht geladen werden – vermutlich fehlt gerade die Internetverbindung oder es gibt eine neue Version.'
            : 'Deine Daten sind sicher. Versuch es einfach noch einmal.'}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            className="min-h-11 rounded-2xl bg-brand px-5 font-semibold text-brand-ink"
            onClick={() => (chunkError ? window.location.reload() : this.setState({ error: null }))}
          >
            Erneut versuchen
          </button>
          <button type="button" className="min-h-11 rounded-2xl bg-surface-2 px-5 font-semibold" onClick={() => window.location.assign('/')}>
            Zur Startseite
          </button>
        </div>
      </main>
    )
  }
}
