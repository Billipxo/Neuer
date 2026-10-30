import { useEffect } from 'react';
import { useDaten } from '../db/DatenContext';

const MAX_HINWEISE = 3;

/** Kurze Hinweise oben im Bild (Tagesziel, Abzeichen, XP bei Karteikarten) – verschwinden von selbst. */
export function Hinweise() {
  const { hinweise } = useDaten();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
      aria-live="polite"
    >
      {hinweise.slice(-MAX_HINWEISE).map((h) => (
        <div
          key={h.id}
          className="anim-hinweis flex max-w-full items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-slate-900"
        >
          <span aria-hidden>{h.icon}</span>
          <span>{h.text}</span>
        </div>
      ))}
    </div>
  );
}

const AUFSTIEG_DAUER_MS = 2200;
const FUNKEN = [
  { links: '12%', oben: '30%', verzoegerung: '0ms' },
  { links: '80%', oben: '22%', verzoegerung: '120ms' },
  { links: '25%', oben: '70%', verzoegerung: '220ms' },
  { links: '70%', oben: '66%', verzoegerung: '80ms' },
  { links: '50%', oben: '8%', verzoegerung: '300ms' },
];

/** Kurze Erfolgsanimation beim Level-Aufstieg: schließt sich nach gut 2 s oder per Antippen. */
export function LevelAufstieg() {
  const { aufstieg, schliesseAufstieg } = useDaten();
  useEffect(() => {
    if (!aufstieg) return;
    const t = setTimeout(schliesseAufstieg, AUFSTIEG_DAUER_MS);
    return () => clearTimeout(t);
  }, [aufstieg]); // nur bei einem neuen Aufstieg neu starten

  if (!aufstieg) return null;
  return (
    <button
      type="button"
      onClick={schliesseAufstieg}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-6"
      aria-label="Schließen"
    >
      <div role="alert" className="anim-aufstieg relative w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900">
        {FUNKEN.map((f, i) => (
          <span
            key={i}
            aria-hidden
            className="anim-funke absolute text-xl"
            style={{ left: f.links, top: f.oben, animationDelay: f.verzoegerung }}
          >
            ✨
          </span>
        ))}
        <p className="text-6xl" aria-hidden>
          {aufstieg.icon}
        </p>
        <p className="mt-3 text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Aufgestiegen · Level {aufstieg.nr}
        </p>
        <p className="mt-1 text-2xl leading-tight font-bold">{aufstieg.titel}</p>
      </div>
    </button>
  );
}
