import type { Bereich, ErklaerungsAbschnitt } from '../types';
import { FormelText } from './Formeln';
import { Karte } from './Seite';

/** Die Erklärung zu einem Themenbereich: Abschnitte mit Text und Stichpunkten, „Merke“ hervorgehoben. */
export function BereichErklaerung({ bereich }: { bereich: Bereich }) {
  return (
    <div className="space-y-3">
      {bereich.erklaerung.map((a, i) => (
        <ErklaerungsBlock key={i} {...a} />
      ))}
      <QuellenHinweis bereich={bereich} />
    </div>
  );
}

/** Ein Abschnitt der Erklärung oder ein Teil davon (`zusatz` z. B. „2/3“); „Merke“ hervorgehoben. */
export function ErklaerungsBlock({ titel, text, punkte, zusatz }: ErklaerungsAbschnitt & { zusatz?: string }) {
  const inhalt = (
    <>
      <h3 className="font-semibold">
        {titel}
        {zusatz && <span className="font-normal text-slate-500 dark:text-slate-400"> · {zusatz}</span>}
      </h3>
      {text && (
        <p className="mt-1 leading-relaxed">
          <FormelText text={text} />
        </p>
      )}
      {punkte && punkte.length > 0 && (
        <ul className="mt-2 space-y-2">
          {punkte.map((p, j) => (
            <li key={j} className="flex gap-2 leading-relaxed">
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-marke-500" aria-hidden />
              <span>
                <FormelText text={p} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
  return titel.startsWith('Merke') ? (
    <div className="rounded-2xl bg-marke-50 p-4 ring-1 ring-marke-400 dark:bg-marke-500/10 dark:ring-marke-500/40">{inhalt}</div>
  ) : (
    <Karte>{inhalt}</Karte>
  );
}

export function QuellenHinweis({ bereich }: { bereich: Pick<Bereich, 'quelle' | 'stand'> }) {
  return (
    <p className="text-xs text-slate-500 dark:text-slate-400">
      Quelle: {bereich.quelle} · Stand: {bereich.stand}. Zusammenfassung zum Lernen – gleiche sie mit deinen
      Kursunterlagen ab. Maßgeblich sind immer die aktuellen Normen, TAB und Gesetze.
    </p>
  );
}
