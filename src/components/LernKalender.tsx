import { useState } from 'react';
import { tagAusSchluessel } from '../logic/datum';
import { formatDatumKurz } from '../logic/format';
import { kalenderStufe, kalenderWochen } from '../logic/motivation';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const STUFEN_FARBE = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3'] as const;

/**
 * Lernkalender der letzten Wochen: eine Farbe, hell → dunkel = wenig → viel.
 * Tagesziel erreicht zusätzlich mit ✓ (nicht nur über die Farbe). Antippen zeigt den Wert.
 */
export function LernKalender({ lernTage, tagesziel, jetzt }: { lernTage: Record<string, number>; tagesziel: number; jetzt: number }) {
  const wochen = kalenderWochen(jetzt, 5);
  const [auswahl, setAuswahl] = useState<string | null>(null);
  const beschreibung = (schluessel: string) => {
    const n = lernTage[schluessel] ?? 0;
    const ziel = n >= tagesziel ? ' · Tagesziel erreicht' : '';
    return `${formatDatumKurz(tagAusSchluessel(schluessel))}: ${n} ${n === 1 ? 'Frage' : 'Fragen'}${ziel}`;
  };

  return (
    <div>
      <div className="grid grid-cols-7 gap-[2px] text-center text-xs text-slate-500 dark:text-slate-400" role="group" aria-label="Lernkalender der letzten 5 Wochen">
        {WOCHENTAGE.map((t) => (
          <div key={t} className="pb-1" aria-hidden>
            {t}
          </div>
        ))}
        {wochen.flat().map(({ schluessel, zukunft }) => {
          const n = lernTage[schluessel] ?? 0;
          const stufe = kalenderStufe(n, tagesziel);
          if (zukunft) return <div key={schluessel} className="aspect-square" aria-hidden />;
          return (
            <button
              key={schluessel}
              type="button"
              aria-label={beschreibung(schluessel)}
              aria-pressed={auswahl === schluessel}
              onClick={() => setAuswahl(schluessel)}
              onMouseEnter={() => setAuswahl(schluessel)}
              onFocus={() => setAuswahl(schluessel)}
              className={`flex aspect-square items-center justify-center rounded-[4px] text-sm font-bold ${STUFEN_FARBE[stufe]} ${
                stufe === 3 ? 'text-white dark:text-slate-900' : ''
              } ${auswahl === schluessel ? 'ring-2 ring-slate-900 dark:ring-white' : ''}`}
            >
              {stufe === 3 ? '✓' : ''}
            </button>
          );
        })}
      </div>
      <p className="mt-2 min-h-5 text-sm text-slate-700 dark:text-slate-300" aria-live="polite">
        {auswahl ? beschreibung(auswahl) : 'Tag antippen für Details'}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          weniger
          {STUFEN_FARBE.map((f) => (
            <span key={f} className={`inline-block size-3.5 rounded-[3px] ${f}`} aria-hidden />
          ))}
          mehr
        </span>
        <span>✓ = Tagesziel ({tagesziel}) erreicht</span>
      </div>
    </div>
  );
}
