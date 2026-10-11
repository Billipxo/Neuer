import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FrageMitLoesung, FrageWerkzeuge } from '../components/FrageTeile';
import { Karte, Seite } from '../components/Seite';
import { StatusPunkt, knopf } from '../components/ui';
import { useDaten } from '../db/DatenContext';
import { formatDatumZeit, formatFaelligkeit } from '../logic/format';
import { MAX_BOX } from '../logic/leitner';
import type { Fortschritt } from '../types';

const KARTE_TEXT = { gewusst: 'gewusst', teilweise: 'teilweise', nicht: 'nicht gewusst' } as const;

export function FrageDetailSeite() {
  const { id = '' } = useParams();
  const { fragen, fortschritte, aendereFortschritt } = useDaten();
  const navigate = useNavigate();
  const location = useLocation();
  const frage = fragen.find((f) => f.id === id);

  // „Zurück“ führt dorthin, woher man kam (z. B. gefilterter Katalog); ohne Verlauf zum Katalog
  const zurueck = () => (location.key !== 'default' ? navigate(-1) : navigate('/mehr/katalog'));
  const zurueckKnopf = (
    <button type="button" onClick={zurueck} className="-mt-2 mb-3 inline-block text-sm text-slate-500 dark:text-slate-400">
      ‹ Zurück
    </button>
  );

  if (!frage) {
    return (
      <Seite titel="Frage nicht gefunden">
        {zurueckKnopf}
        <p className="text-slate-500 dark:text-slate-400">Die Frage „{id}“ gibt es nicht (mehr).</p>
      </Seite>
    );
  }
  const fp = fortschritte.get(frage.id);

  const lernstandZuruecksetzen = () => {
    if (!window.confirm('Lernstand dieser Frage zurücksetzen? Markierung, Notiz und Meldung bleiben erhalten.')) return;
    aendereFortschritt(frage.id, {
      status: 'neu',
      box: 0,
      richtigInFolge: 0,
      versuche: 0,
      richtigGesamt: 0,
      zuletzt: null,
      faelligAb: 0,
      kartenBewertung: null,
    });
  };

  return (
    <Seite titel="Frage">
      {zurueckKnopf}
      <Karte>
        <FrageMitLoesung frage={frage} />
        <div className="mt-4">
          <FrageWerkzeuge frageId={frage.id} />
        </div>
      </Karte>

      {fp?.fehlerMeldung && (
        <Karte className="mt-4 ring-red-300! dark:ring-red-800!">
          <p className="mb-1 font-semibold text-red-700 dark:text-red-400">⚑ Gemeldeter Fehler</p>
          <p className="whitespace-pre-line">{fp.fehlerMeldung}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Bearbeiten oder löschen über „Gemeldet“ oben.</p>
        </Karte>
      )}

      <NotizFeld key={frage.id} frageId={frage.id} gespeichert={fp?.notiz ?? ''} />

      <Lernstand fp={fp} />

      <Karte className="mt-4">
        <h2 className="mb-2 font-semibold">Angaben</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-slate-500 dark:text-slate-400">ID</dt>
          <dd className="font-mono">{frage.id}</dd>
          {frage.unterthema && (
            <>
              <dt className="text-slate-500 dark:text-slate-400">Unterthema</dt>
              <dd>{frage.unterthema}</dd>
            </>
          )}
          <dt className="text-slate-500 dark:text-slate-400">Stand</dt>
          <dd>{frage.stand}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Herkunft</dt>
          <dd>
            {frage.herkunft === 'eigen' ? 'selbst angelegt' : 'mitgeliefert'}
            {frage.herkunft === 'mitgeliefert' && frage.bearbeitet ? ', in der App bearbeitet' : ''}
          </dd>
        </dl>
      </Karte>

      <div className="mt-6 grid gap-3">
        <Link
          to={`/sitzung?${new URLSearchParams({ ids: frage.id, zurueck: `/mehr/frage/${frage.id}` })}`}
          className={knopf('primaer')}
        >
          ▶ Diese Frage üben
        </Link>
        {fp && fp.versuche > 0 && (
          <button type="button" className={knopf('leise', 'text-base')} onClick={lernstandZuruecksetzen}>
            Lernstand dieser Frage zurücksetzen
          </button>
        )}
      </div>
    </Seite>
  );
}

function NotizFeld({ frageId, gespeichert }: { frageId: string; gespeichert: string }) {
  const { aendereFortschritt } = useDaten();
  const [text, setText] = useState(gespeichert);
  const [meldung, setMeldung] = useState('');
  const geaendert = text.trim() !== gespeichert;

  const speichern = async () => {
    await aendereFortschritt(frageId, { notiz: text.trim() });
    setMeldung('Gespeichert ✓');
    setTimeout(() => setMeldung(''), 2000);
  };

  return (
    <Karte className="mt-4">
      <label htmlFor="notiz" className="mb-2 block font-semibold">
        ✎ Notiz
      </label>
      <textarea
        id="notiz"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Eigene Merkhilfe, Seitenzahl im Kursordner …"
        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base dark:border-slate-700 dark:bg-slate-950"
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" className={knopf('sekundaer', 'min-h-11 px-4 text-base')} disabled={!geaendert} onClick={speichern}>
          Notiz speichern
        </button>
        <span className="text-sm text-green-700 dark:text-green-400" role="status">
          {meldung}
        </span>
      </div>
    </Karte>
  );
}

function Lernstand({ fp }: { fp: Fortschritt | undefined }) {
  const zeilen: [string, ReactNode][] = [
    ['Status', <StatusPunkt key="s" status={fp?.status ?? 'neu'} />],
    ['Wiederholung', formatFaelligkeit(fp)],
    ['Beantwortet', fp?.versuche ? `${fp.versuche}× (davon ${fp.richtigGesamt}× richtig)` : '–'],
    ['Richtig in Folge', String(fp?.richtigInFolge ?? 0)],
    ['Leitner-Box', `${fp?.box ?? 0} von ${MAX_BOX}`],
    ['Zuletzt', fp?.zuletzt ? formatDatumZeit(fp.zuletzt) : '–'],
  ];
  if (fp?.kartenBewertung) zeilen.push(['Selbstbewertung', KARTE_TEXT[fp.kartenBewertung]]);
  return (
    <Karte className="mt-4">
      <h2 className="mb-2 font-semibold">Lernstand</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {zeilen.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </Karte>
  );
}
