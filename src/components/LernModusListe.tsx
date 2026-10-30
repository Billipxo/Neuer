import { Link } from 'react-router-dom';
import type { LernModus } from '../logic/sitzung';

const MODI: { modus: LernModus; titel: string; text: string; icon: string }[] = [
  { modus: 'empfohlen', titel: 'Weiterlernen', text: 'Falsche und fällige Fragen zuerst, dann neue', icon: '▶' },
  { modus: 'reihe', titel: 'Alle der Reihe nach', text: 'Jede Frage einmal, wie im Fragenkatalog – mit Lesezeichen', icon: '📋' },
  { modus: 'neu', titel: 'Nur neue Fragen', text: 'Noch nie beantwortet', icon: '✨' },
  { modus: 'falsch', titel: 'Fehler wiederholen', text: 'Alle zuletzt falsch beantworteten Fragen', icon: '🔁' },
  { modus: 'faellig', titel: 'Fällige Wiederholungen', text: 'Laut Leitner-System heute wieder dran', icon: '⏰' },
  { modus: 'markiert', titel: 'Markierte Fragen', text: 'Deine mit ★ markierten Fragen', icon: '★' },
  { modus: 'karten', titel: 'Karteikarten', text: 'Offene Fragen fürs Fachgespräch', icon: '🗂️' },
];

/**
 * Liste der Lernmodi mit Anzahl passender Fragen; ein Eintrag startet eine Lernrunde.
 * auswahl: Teil der Adresse für die Lernrunde, z. B. „thema=recht“ oder „thema=recht&bereich=recht-nav“.
 */
export function LernModusListe({
  auswahl,
  anzahl,
  sitzungsLaenge,
  ohne = [],
}: {
  auswahl: string;
  anzahl: (modus: LernModus) => number;
  sitzungsLaenge: number;
  ohne?: readonly LernModus[];
}) {
  return (
    <ul className="space-y-2">
      {MODI.filter((m) => !ohne.includes(m.modus)).map((m) => {
        const n = anzahl(m.modus);
        if (m.modus === 'karten' && n === 0) return null;
        const hervor = m.modus === 'empfohlen';
        const inhalt = (
          <>
            <span className="w-8 shrink-0 text-center text-2xl" aria-hidden>
              {m.icon}
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{m.titel}</span>
              <span className={`block text-sm ${hervor ? 'text-slate-800' : 'text-slate-500 dark:text-slate-400'}`}>{m.text}</span>
            </span>
            <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${hervor ? 'bg-white/60' : 'bg-slate-100 dark:bg-slate-800'}`}>
              {m.modus === 'empfohlen' ? Math.min(n, sitzungsLaenge) : n}
            </span>
          </>
        );
        const klassen =
          'flex min-h-16 w-full items-center gap-3 rounded-2xl p-4 text-left ring-1 transition ' +
          (hervor ? 'bg-marke-400 text-slate-900 ring-marke-500' : 'bg-white ring-slate-200 dark:bg-slate-900 dark:ring-slate-800');
        return (
          <li key={m.modus}>
            {n > 0 ? (
              <Link to={`/sitzung?${auswahl}&modus=${m.modus}`} className={`${klassen} active:scale-[0.99]`}>
                {inhalt}
              </Link>
            ) : (
              <div className={`${klassen} opacity-50`} aria-disabled>
                {inhalt}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
