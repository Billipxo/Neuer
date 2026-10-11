import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { useDaten } from '../db/DatenContext';
import { knopf } from './ui';

/** Stündlich nach einer neuen Version schauen, solange die App offen ist */
const PRUEF_INTERVALL_MS = 60 * 60 * 1000;

/**
 * Registriert den Service Worker (Offline-Betrieb) und zeigt einen Hinweis,
 * wenn eine neue Version bereitsteht. Aktualisiert wird erst nach Bestätigung.
 */
export function UpdateHinweis() {
  const { zeigeHinweis } = useDaten();
  const [neueVersion, setNeueVersion] = useState(false);
  const aktualisieren = useRef<((neuLaden?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let intervall: ReturnType<typeof setInterval> | undefined;
    aktualisieren.current = registerSW({
      onNeedRefresh: () => setNeueVersion(true),
      onOfflineReady: () => zeigeHinweis('📴', 'Die App funktioniert jetzt auch offline'),
      onRegisteredSW: (_url, registrierung) => {
        if (registrierung) intervall = setInterval(() => registrierung.update().catch(() => {}), PRUEF_INTERVALL_MS);
      },
    });
    return () => clearInterval(intervall);
  }, []); // nur einmal beim Start

  if (!neueVersion) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[65] px-3 pt-[max(0.75rem,env(safe-area-inset-top))]" role="alert">
      <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-slate-900 p-3 text-white shadow-xl dark:bg-slate-800">
        <span className="flex-1 text-sm">
          <strong className="block">Neue Version verfügbar</strong>
          Dein Lernstand bleibt erhalten.
        </span>
        <button
          type="button"
          className="min-h-11 rounded-2xl px-3 text-sm font-semibold text-slate-300 hover:bg-white/10"
          onClick={() => setNeueVersion(false)}
        >
          Später
        </button>
        <button type="button" className={knopf('primaer', '', 'klein')} onClick={() => aktualisieren.current?.(true)}>
          Aktualisieren
        </button>
      </div>
    </div>
  );
}
