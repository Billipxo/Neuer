import type { FormEvent, ReactNode } from 'react';
import { formatToleranz, formatZahl, parseZahl } from '../logic/bewertung';
import type { Ergebnis } from '../logic/leitner';
import type { RechenLoesung } from '../types';

export const BUCHSTABEN = 'ABCDEFGHIJ';

/**
 * Eine Antwortmöglichkeit (Einfach- oder Mehrfachauswahl).
 * aufgeloest = Lösung anzeigen (richtig/falsch/verpasst).
 */
export function AntwortOption({
  buchstabe,
  text,
  mehrfach,
  ausgewaehlt,
  richtig,
  aufgeloest,
  onClick,
}: {
  buchstabe: string;
  text: ReactNode;
  mehrfach: boolean;
  ausgewaehlt: boolean;
  richtig: boolean;
  aufgeloest: boolean;
  onClick: () => void;
}) {
  let rahmen = ausgewaehlt
    ? 'border-marke-500 bg-marke-50 dark:bg-marke-500/10'
    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900';
  let hinweis: string | null = null;
  if (aufgeloest) {
    if (richtig && ausgewaehlt) {
      rahmen = 'border-green-500 bg-green-50 dark:bg-green-500/15';
    } else if (richtig) {
      rahmen = 'border-green-500 border-dashed bg-white dark:bg-slate-900';
      hinweis = 'richtig – nicht angekreuzt';
    } else if (ausgewaehlt) {
      rahmen = 'border-red-500 bg-red-50 dark:bg-red-500/15';
      hinweis = 'falsch angekreuzt';
    } else {
      rahmen = 'border-slate-200 bg-white opacity-60 dark:border-slate-800 dark:bg-slate-900';
    }
  }
  const symbol = aufgeloest ? (richtig ? '✓' : ausgewaehlt ? '✗' : '') : ausgewaehlt ? '✓' : '';
  const symbolFarbe = aufgeloest
    ? richtig
      ? 'border-green-600 bg-green-600 text-white'
      : ausgewaehlt
        ? 'border-red-600 bg-red-600 text-white'
        : 'border-slate-300 dark:border-slate-600'
    : ausgewaehlt
      ? 'border-marke-500 bg-marke-500 text-slate-900'
      : 'border-slate-300 dark:border-slate-600';

  return (
    <button
      type="button"
      role={mehrfach ? 'checkbox' : 'radio'}
      aria-checked={ausgewaehlt}
      disabled={aufgeloest}
      onClick={onClick}
      className={`flex min-h-14 w-full items-start gap-3 rounded-2xl border-2 p-3 text-left transition disabled:cursor-default ${rahmen}`}
    >
      <span
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center border-2 text-sm font-bold ${mehrfach ? 'rounded-md' : 'rounded-full'} ${symbolFarbe}`}
        aria-hidden
      >
        {symbol || buchstabe}
      </span>
      <span className="flex-1 pt-0.5">
        <span className="block leading-snug">{text}</span>
        {hinweis && (
          <span className={`mt-1 block text-xs font-semibold ${richtig ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
            {hinweis}
          </span>
        )}
      </span>
    </button>
  );
}

export function RechenEingabe({
  loesung,
  eingabe,
  setEingabe,
  fehler,
  aufgeloest,
  ergebnis,
  onSubmit,
}: {
  loesung: RechenLoesung;
  eingabe: string;
  setEingabe: (s: string) => void;
  fehler: boolean;
  aufgeloest: boolean;
  ergebnis: Ergebnis | null;
  onSubmit: (e: FormEvent) => void;
}) {
  const wert = parseZahl(eingabe);
  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="rechen-eingabe" className="mb-2 block text-sm text-slate-500 dark:text-slate-400">
        Dein Ergebnis {loesung.einheit && `in ${loesung.einheit}`}
      </label>
      <div className="flex items-center gap-3">
        <input
          id="rechen-eingabe"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          value={eingabe}
          disabled={aufgeloest}
          onChange={(e) => setEingabe(e.target.value)}
          className={`min-h-14 w-full rounded-2xl border-2 bg-white px-4 text-xl tabular-nums dark:bg-slate-900 ${
            aufgeloest
              ? ergebnis === 'richtig'
                ? 'border-green-500'
                : 'border-red-500'
              : fehler
                ? 'border-red-500'
                : 'border-slate-300 focus:border-marke-500 dark:border-slate-700'
          }`}
          placeholder="z. B. 15,9"
          autoFocus
        />
        <span className="min-w-10 text-xl font-semibold">{loesung.einheit}</span>
      </div>
      {fehler && <p className="mt-2 text-sm text-red-600 dark:text-red-400">Bitte eine Zahl eingeben, z. B. 2,5</p>}
      {aufgeloest && (
        <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p>
            Deine Eingabe: <strong>{wert !== null ? formatZahl(wert) : eingabe} {loesung.einheit}</strong>
          </p>
          <p>
            Lösung:{' '}
            <strong>
              {formatZahl(loesung.wert)} {loesung.einheit}
            </strong>{' '}
            <span className="text-sm text-slate-500 dark:text-slate-400">({formatToleranz(loesung)})</span>
          </p>
        </div>
      )}
      {/* versteckter Submit, damit „Enter“ auf der Tastatur prüft */}
      <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
    </form>
  );
}
