import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Zustand {
  fehler: Error | null;
}

/**
 * Fängt unerwartete Programmfehler ab und zeigt eine verständliche Meldung statt einer weißen
 * Seite. Der Lernstand liegt in der Datenbank und ist davon nicht betroffen.
 */
export class Fehlergrenze extends Component<{ children: ReactNode }, Zustand> {
  state: Zustand = { fehler: null };

  static getDerivedStateFromError(fehler: Error): Zustand {
    return { fehler };
  }

  componentDidCatch(fehler: Error, info: ErrorInfo) {
    console.error('TREI-Trainer: unerwarteter Fehler', fehler, info.componentStack);
  }

  render() {
    const { fehler } = this.state;
    if (!fehler) return this.props.children;
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center p-6 text-slate-900 dark:text-slate-100">
        <p className="text-4xl" aria-hidden="true">
          🔧
        </p>
        <h1 className="mt-3 text-2xl font-bold">Da ist etwas schiefgelaufen</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Dein Lernstand ist gespeichert. Lade die App neu – meist ist danach alles wieder in Ordnung.
        </p>
        <div className="mt-6 grid gap-3">
          <button
            type="button"
            className="min-h-14 rounded-2xl bg-yellow-400 px-5 text-lg font-semibold text-slate-900"
            onClick={() => location.reload()}
          >
            Neu laden
          </button>
          <button
            type="button"
            className="min-h-12 rounded-2xl px-5 font-semibold text-slate-700 ring-1 ring-slate-300 dark:text-slate-200 dark:ring-slate-700"
            onClick={() => {
              location.hash = '#/';
              location.reload();
            }}
          >
            Zur Startseite
          </button>
        </div>
        <p className="mt-6 text-xs break-words text-slate-500 dark:text-slate-400">
          Passiert das öfter, schick ein Foto von dieser Seite. Technische Meldung: {fehler.message}
        </p>
      </div>
    );
  }
}
