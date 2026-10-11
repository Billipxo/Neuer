import { useState } from 'react';
import { useDaten } from '../db/DatenContext';
import { formatToleranz, formatZahl } from '../logic/bewertung';
import { THEMEN, type Frage, type RechenLoesung } from '../types';
import { Dialog, StatusPunkt, knopf } from './ui';

export const TYP_TEXT = {
  einfach: 'Einfachauswahl',
  mehrfach: 'Mehrfachauswahl',
  rechnen: 'Rechenaufgabe',
  karte: 'Karteikarte',
} as const;

export function themaTitel(id: string): string {
  return THEMEN.find((t) => t.id === id)?.titel ?? id;
}

/** Kopfzeile einer Frage: Thema, Typ, Schwierigkeit, geprüft, Lernstatus */
export function FrageKopf({ frage }: { frage: Frage }) {
  const { fortschritte } = useDaten();
  const status = fortschritte.get(frage.id)?.status ?? 'neu';
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
      <span className="font-semibold text-slate-700 dark:text-slate-300">{themaTitel(frage.thema)}</span>
      <span>{TYP_TEXT[frage.typ]}</span>
      <span title={`Schwierigkeit ${frage.schwierigkeit} von 3`} aria-label={`Schwierigkeit ${frage.schwierigkeit} von 3`}>
        {'★'.repeat(frage.schwierigkeit)}
        <span className="opacity-30">{'★'.repeat(3 - frage.schwierigkeit)}</span>
      </span>
      <StatusPunkt status={status} />
      {!frage.geprueft && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          ungeprüft
        </span>
      )}
    </div>
  );
}

/** Optionales Bild zur Frage, antippen zum Vergrößern */
export function FrageBild({ bild }: { bild: string | null }) {
  const [gross, setGross] = useState(false);
  if (!bild) return null;
  return (
    <>
      <button type="button" onClick={() => setGross(true)} className="mb-4 block w-full" aria-label="Bild vergrößern">
        <img src={bild} alt="Abbildung zur Frage" className="mx-auto max-h-64 rounded-xl bg-white object-contain p-1" />
      </button>
      {gross && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2"
          onClick={() => setGross(false)}
          aria-label="Bild schließen"
        >
          <img src={bild} alt="Abbildung zur Frage (groß)" className="max-h-full max-w-full rounded bg-white object-contain" />
        </button>
      )}
    </>
  );
}

/** Erklärung mit Quelle; hebt den Hinweis „Stand prüfen“ hervor. */
export function Erklaerung({ frage }: { frage: Frage }) {
  const standPruefen = /stand prüfen/i.test(frage.erklaerung);
  return (
    <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800/60">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">Erklärung</h3>
        {standPruefen && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            ⚠ Stand prüfen
          </span>
        )}
      </div>
      <p className="whitespace-pre-line leading-relaxed">{frage.erklaerung}</p>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        <span className="font-medium">Quelle:</span> {frage.quelle}
      </p>
    </div>
  );
}

/** Markieren und „Fehler melden“ – an jeder Frage verfügbar. */
export function FrageWerkzeuge({ frageId }: { frageId: string }) {
  const { fortschritte, aendereFortschritt } = useDaten();
  const fp = fortschritte.get(frageId);
  const markiert = fp?.markiert ?? false;
  const meldung = fp?.fehlerMeldung ?? '';
  const [offen, setOffen] = useState(false);
  const [text, setText] = useState('');

  const oeffnen = () => {
    setText(meldung);
    setOffen(true);
  };
  const speichern = async (wert: string) => {
    await aendereFortschritt(frageId, { fehlerMeldung: wert.trim() });
    setOffen(false);
  };

  const werkzeug =
    'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-2 font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800';
  return (
    <div className="flex gap-2">
      <button
        type="button"
        className={werkzeug}
        aria-pressed={markiert}
        onClick={() => aendereFortschritt(frageId, { markiert: !markiert })}
      >
        <span className={markiert ? 'text-marke-500' : ''}>{markiert ? '★' : '☆'}</span>
        {markiert ? 'Markiert' : 'Markieren'}
      </button>
      <button type="button" className={werkzeug} onClick={oeffnen}>
        <span className={meldung ? 'text-red-500' : ''}>⚑</span>
        {meldung ? 'Gemeldet' : 'Fehler melden'}
      </button>

      <Dialog offen={offen} titel="Fehler melden" onSchliessen={() => setOffen(false)}>
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
          Was stimmt an der Frage nicht? Die Notiz bleibt an der Frage gespeichert, damit du sie später mit deinen
          Kursunterlagen korrigieren kannst.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          autoFocus
          className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base dark:border-slate-700 dark:bg-slate-950"
          placeholder="z. B. Grenzwert laut TAB 2023 anders …"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={knopf('primaer', 'flex-1')} disabled={!text.trim()} onClick={() => speichern(text)}>
            Speichern
          </button>
          {meldung && (
            <button type="button" className={knopf('sekundaer', 'flex-1')} onClick={() => speichern('')}>
              Meldung löschen
            </button>
          )}
          <button type="button" className={knopf('leise', 'flex-1')} onClick={() => setOffen(false)}>
            Abbrechen
          </button>
        </div>
      </Dialog>
    </div>
  );
}

/** Richtige Lösung je Fragetyp (für Katalog, Detailansicht und Auswertung) */
export function Loesung({ frage }: { frage: Frage }) {
  if (frage.typ === 'rechnen') {
    const l = frage.richtig as RechenLoesung;
    return (
      <p className="rounded-2xl bg-green-50 p-3 ring-1 ring-green-300 dark:bg-green-500/10 dark:ring-green-700">
        Lösung:{' '}
        <strong>
          {formatZahl(l.wert)} {l.einheit}
        </strong>{' '}
        <span className="text-sm text-slate-500 dark:text-slate-400">({formatToleranz(l)})</span>
      </p>
    );
  }
  if (frage.typ === 'karte') {
    return (
      <div className="rounded-2xl bg-green-50 p-3 ring-1 ring-green-300 dark:bg-green-500/10 dark:ring-green-700">
        <p className="mb-1 text-sm font-semibold">Musterantwort</p>
        <p className="leading-relaxed whitespace-pre-line">{frage.richtig as string}</p>
      </div>
    );
  }
  const richtig = frage.richtig as number[];
  return (
    <ul className="space-y-2">
      {frage.antworten.map((a, i) => {
        const ok = richtig.includes(i);
        return (
          <li
            key={i}
            className={`flex items-start gap-3 rounded-2xl border-2 p-3 ${
              ok ? 'border-green-500 bg-green-50 dark:bg-green-500/10' : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center text-sm font-bold ${
                ok ? 'rounded-full bg-green-600 text-white' : 'text-slate-400'
              }`}
              aria-label={ok ? 'richtig' : 'falsch'}
            >
              {ok ? '✓' : '–'}
            </span>
            <span className="leading-snug">{a}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Frage komplett mit Lösung und Erklärung */
export function FrageMitLoesung({ frage }: { frage: Frage }) {
  return (
    <div className="space-y-4">
      <div>
        <FrageKopf frage={frage} />
        <FrageBild bild={frage.bild} />
        <p className="text-lg leading-snug font-semibold">{frage.frage}</p>
      </div>
      <Loesung frage={frage} />
      <Erklaerung frage={frage} />
    </div>
  );
}
