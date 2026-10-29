import type { Bereich } from '../types';
import { Karte } from './Seite';

/** Die Erklärung zu einem Themenbereich: Abschnitte mit Text und Stichpunkten, „Merke“ hervorgehoben. */
export function BereichErklaerung({ bereich }: { bereich: Bereich }) {
  return (
    <div className="space-y-3">
      {bereich.erklaerung.map((a, i) => {
        const inhalt = (
          <>
            <h3 className="font-semibold">{a.titel}</h3>
            {a.text && <p className="mt-1 leading-relaxed">{a.text}</p>}
            {a.punkte && (
              <ul className="mt-2 space-y-2">
                {a.punkte.map((p, j) => (
                  <li key={j} className="flex gap-2 leading-relaxed">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-marke-500" aria-hidden />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        );
        return a.titel.startsWith('Merke') ? (
          <div key={i} className="rounded-2xl bg-marke-50 p-4 ring-1 ring-marke-400 dark:bg-marke-500/10 dark:ring-marke-500/40">
            {inhalt}
          </div>
        ) : (
          <Karte key={i}>{inhalt}</Karte>
        );
      })}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Quelle: {bereich.quelle} · Stand: {bereich.stand}. Zusammenfassung zum Lernen – gleiche sie mit deinen
        Kursunterlagen ab. Maßgeblich sind immer die aktuellen Normen, TAB und Gesetze.
      </p>
    </div>
  );
}
