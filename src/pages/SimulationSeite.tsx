import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AntwortOption, BUCHSTABEN, RechenEingabe } from '../components/Antworten';
import { FrageBild, FrageKopf, FrageWerkzeuge } from '../components/FrageTeile';
import { Dialog, knopf } from '../components/ui';
import { useDaten } from '../db/DatenContext';
import { holeLaufendeSimulation, loescheLaufendeSimulation, speichereLaufendeSimulation } from '../db/db';
import { parseZahl } from '../logic/bewertung';
import { formatRestzeit, istBeantwortet, restzeitMs } from '../logic/simulation';
import type { LaufendeSimulation, RechenLoesung } from '../types';

/** Ab hier wird die Uhr gelb, mit einem kurzen Hinweis */
const WARNUNG_MS = 5 * 60_000;
/** Ab hier wird die Uhr rot */
const KNAPP_MS = 60_000;

export function SimulationSeite() {
  const { db } = useDaten();
  const [sim, setSim] = useState<LaufendeSimulation | null | undefined>(undefined);
  useEffect(() => {
    holeLaufendeSimulation(db).then(setSim);
  }, [db]);
  if (sim === undefined) return <div className="p-6 text-center text-slate-500">Lade …</div>;
  if (sim === null) return <Navigate to="/pruefung" replace />;
  return <Pruefungslauf anfang={sim} />;
}

function Pruefungslauf({ anfang }: { anfang: LaufendeSimulation }) {
  const { db, fragen, simulationSpeichern, zeigeHinweis } = useDaten();
  const navigate = useNavigate();
  const nachId = useMemo(() => new Map(fragen.map((f) => [f.id, f])), [fragen]);
  const [sim, setSim] = useState(anfang);
  const aktuell = useRef(sim);
  aktuell.current = sim;
  const [jetzt, setJetzt] = useState(() => Date.now());
  const [uebersichtOffen, setUebersichtOffen] = useState(false);
  const [abgebenOffen, setAbgebenOffen] = useState(false);
  const [verlassenOffen, setVerlassenOffen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const abgegeben = useRef(false);
  const gewarnt = useRef(restzeitMs(anfang, Date.now()) <= WARNUNG_MS);

  useEffect(() => {
    const t = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const rest = restzeitMs(sim, jetzt);
  const abgelaufen = rest === 0;
  const warnung = rest <= WARNUNG_MS;

  async function einreichen() {
    if (abgegeben.current) return;
    abgegeben.current = true;
    setSpeichert(true);
    const r = await simulationSpeichern(aktuell.current);
    navigate(`/pruefung/ergebnis/${r.ergebnis.id}`, { replace: true, state: { ereignis: r.ereignis } });
  }

  useEffect(() => {
    if (abgelaufen) {
      zeigeHinweis('⏱', 'Zeit abgelaufen – wird ausgewertet');
      einreichen();
    } else if (warnung && !gewarnt.current) {
      gewarnt.current = true;
      zeigeHinweis('⏱', 'Noch 5 Minuten');
    }
  }, [abgelaufen, warnung]); // nur beim Wechsel der Zeitstufe

  const aendern = (neu: LaufendeSimulation) => {
    setSim(neu);
    speichereLaufendeSimulation(db, neu);
  };

  const eintrag = sim.fragen[sim.pos];
  const frage = nachId.get(eintrag.id);
  const antwort = sim.antworten[eintrag.id];
  const beantwortet = sim.fragen.filter(({ id }) => {
    const f = nachId.get(id);
    return !!f && istBeantwortet(f, sim.antworten[id]);
  }).length;
  const offen = sim.fragen.length - beantwortet;
  const gemerkt = sim.gemerkt.includes(eintrag.id);
  const letzte = sim.pos === sim.fragen.length - 1;

  const setzeAntwort = (a: number[] | string) => aendern({ ...sim, antworten: { ...sim.antworten, [eintrag.id]: a } });
  const waehle = (orig: number) => {
    if (!frage) return;
    const alt = Array.isArray(antwort) ? antwort : [];
    setzeAntwort(frage.typ === 'einfach' ? [orig] : alt.includes(orig) ? alt.filter((i) => i !== orig) : [...alt, orig]);
  };
  const gehe = (pos: number) => {
    aendern({ ...sim, pos });
    window.scrollTo(0, 0);
  };
  const merken = () =>
    aendern({ ...sim, gemerkt: gemerkt ? sim.gemerkt.filter((id) => id !== eintrag.id) : [...sim.gemerkt, eintrag.id] });

  const uhrFarbe =
    rest <= KNAPP_MS ? 'bg-red-600 text-white' : warnung ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 dark:bg-slate-800';
  const eingabe = typeof antwort === 'string' ? antwort : '';

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-10 bg-slate-50/95 px-4 pt-3 pb-2 backdrop-blur dark:bg-slate-950/95">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVerlassenOffen(true)}
            className="-ml-2 flex size-11 items-center justify-center rounded-full text-2xl"
            aria-label="Simulation verlassen"
          >
            ✕
          </button>
          <span className="flex-1 font-semibold tabular-nums">
            <span className="sr-only">Frage </span>
            {sim.pos + 1}
            <span className="sr-only"> von </span>
            <span aria-hidden> / </span>
            {sim.fragen.length}
          </span>
          <button
            type="button"
            onClick={merken}
            aria-pressed={gemerkt}
            className={`flex min-h-10 items-center gap-1 rounded-full px-3 text-sm font-medium ring-1 ${
              gemerkt ? 'bg-marke-400 text-slate-900 ring-marke-500' : 'ring-slate-300 dark:ring-slate-700'
            }`}
          >
            🔖 {gemerkt ? 'Gemerkt' : 'Merken'}
          </button>
          <span role="timer" aria-label={`Restzeit ${formatRestzeit(rest)}`} className={`rounded-full px-3 py-1.5 font-semibold tabular-nums ${uhrFarbe}`}>
            ⏱ {formatRestzeit(rest)}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-daten-spur">
          <div className="h-full rounded-full bg-daten transition-[width]" style={{ width: `${(beantwortet / sim.fragen.length) * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {beantwortet} von {sim.fragen.length} beantwortet
        </p>
      </header>

      <main className="flex-1 px-4 pt-2 pb-36" key={eintrag.id}>
        {!frage ? (
          <p className="mt-6 text-slate-500 dark:text-slate-400">Diese Frage wurde inzwischen gelöscht und wird nicht gewertet.</p>
        ) : (
          <>
            <FrageKopf frage={frage} ohneStatus />
            <FrageBild bild={frage.bild} />
            <h1 className="mb-4 text-xl leading-snug font-semibold">{frage.frage}</h1>
            {(frage.typ === 'einfach' || frage.typ === 'mehrfach') && (
              <>
                <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                  {frage.typ === 'einfach' ? 'Eine Antwort ist richtig.' : 'Mehrere Antworten können richtig sein – alle richtigen ankreuzen.'}
                </p>
                <div className="space-y-2" role={frage.typ === 'einfach' ? 'radiogroup' : 'group'}>
                  {eintrag.reihenfolge.map((orig, i) => (
                    <AntwortOption
                      key={orig}
                      buchstabe={BUCHSTABEN[i]}
                      text={frage.antworten[orig]}
                      mehrfach={frage.typ === 'mehrfach'}
                      ausgewaehlt={Array.isArray(antwort) && antwort.includes(orig)}
                      richtig={false}
                      aufgeloest={false}
                      onClick={() => waehle(orig)}
                    />
                  ))}
                </div>
              </>
            )}
            {frage.typ === 'rechnen' && (
              <RechenEingabe
                loesung={frage.richtig as RechenLoesung}
                eingabe={eingabe}
                setEingabe={setzeAntwort}
                fehler={eingabe.trim() !== '' && parseZahl(eingabe) === null}
                aufgeloest={false}
                ergebnis={null}
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  if (!letzte) gehe(sim.pos + 1);
                }}
              />
            )}
            <div className="mt-6">
              <FrageWerkzeuge frageId={frage.id} />
            </div>
          </>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto grid max-w-xl grid-cols-[auto_1fr_auto] gap-2">
          <button type="button" className={knopf('sekundaer')} disabled={sim.pos === 0} onClick={() => gehe(sim.pos - 1)} aria-label="Vorherige Frage">
            ‹
          </button>
          {letzte ? (
            <button type="button" className={knopf('primaer')} onClick={() => setAbgebenOffen(true)}>
              Abgeben
            </button>
          ) : (
            <button type="button" className={knopf('primaer')} onClick={() => gehe(sim.pos + 1)}>
              Weiter ›
            </button>
          )}
          <button type="button" className={knopf('sekundaer')} onClick={() => setUebersichtOffen(true)} aria-label="Übersicht aller Fragen">
            ☰
          </button>
        </div>
      </footer>

      <Dialog offen={uebersichtOffen} titel="Übersicht" onSchliessen={() => setUebersichtOffen(false)}>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
          {beantwortet} beantwortet · {offen} offen · {sim.gemerkt.length} gemerkt
        </p>
        <div className="grid grid-cols-6 gap-2">
          {sim.fragen.map(({ id }, i) => {
            const f = nachId.get(id);
            const ok = !!f && istBeantwortet(f, sim.antworten[id]);
            const m = sim.gemerkt.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  gehe(i);
                  setUebersichtOffen(false);
                }}
                aria-label={`Frage ${i + 1}: ${ok ? 'beantwortet' : 'offen'}${m ? ', gemerkt' : ''}`}
                aria-current={i === sim.pos ? 'step' : undefined}
                className={`relative flex aspect-square items-center justify-center rounded-xl text-sm font-semibold ${
                  ok ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-white ring-1 ring-slate-300 dark:bg-slate-900 dark:ring-slate-600'
                } ${i === sim.pos ? 'outline-2 outline-offset-2 outline-marke-500' : ''}`}
              >
                {i + 1}
                {m && (
                  <span className="absolute -top-1.5 -right-1.5 text-xs" aria-hidden>
                    🔖
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Dunkel = beantwortet, hell = offen, 🔖 = gemerkt</p>
        <button
          type="button"
          className={knopf('primaer', 'mt-4 w-full')}
          onClick={() => {
            setUebersichtOffen(false);
            setAbgebenOffen(true);
          }}
        >
          Abgeben
        </button>
      </Dialog>

      <Dialog offen={abgebenOffen} titel="Simulation abgeben?" onSchliessen={() => setAbgebenOffen(false)}>
        <p className="text-slate-700 dark:text-slate-300">
          {offen > 0 ? (
            <>
              <strong>{offen === 1 ? '1 Frage ist' : `${offen} Fragen sind`} noch offen</strong> und {offen === 1 ? 'zählt' : 'zählen'} als
              falsch.
            </>
          ) : (
            'Alle Fragen sind beantwortet.'
          )}
          {sim.gemerkt.length > 0 && ` ${sim.gemerkt.length} gemerkte Frage${sim.gemerkt.length === 1 ? '' : 'n'} zum Nachsehen.`}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Restzeit {formatRestzeit(rest)}</p>
        <div className="mt-4 grid gap-2">
          <button type="button" className={knopf('primaer')} onClick={einreichen} disabled={speichert}>
            Jetzt abgeben
          </button>
          <button type="button" className={knopf('leise')} onClick={() => setAbgebenOffen(false)}>
            Weiter bearbeiten
          </button>
        </div>
      </Dialog>

      <Dialog offen={verlassenOffen} titel="Simulation verlassen?" onSchliessen={() => setVerlassenOffen(false)}>
        <p className="text-slate-700 dark:text-slate-300">
          Die Zeit läuft weiter. Du kannst die Simulation später unter „Prüfung“ fortsetzen.
        </p>
        <div className="mt-4 grid gap-2">
          <button type="button" className={knopf('primaer')} onClick={() => setVerlassenOffen(false)}>
            Weiter bearbeiten
          </button>
          <button type="button" className={knopf('sekundaer')} onClick={() => navigate('/pruefung')}>
            Später fortsetzen
          </button>
          <button
            type="button"
            className={knopf('gefahr', '', 'mittel')}
            onClick={async () => {
              await loescheLaufendeSimulation(db);
              navigate('/pruefung', { replace: true });
            }}
          >
            Simulation verwerfen
          </button>
        </div>
      </Dialog>
    </div>
  );
}
