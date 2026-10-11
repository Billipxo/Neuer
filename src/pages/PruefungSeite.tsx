import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Karte, Seite } from '../components/Seite';
import { BestandenMarke, Dialog, Meter, Stepper, knopf } from '../components/ui';
import { useDaten } from '../db/DatenContext';
import { holeLaufendeSimulation, loescheLaufendeSimulation, speichereLaufendeSimulation } from '../db/db';
import { formatDatumZeit } from '../logic/format';
import {
  SIMULATION_GRENZEN,
  formatDauer,
  formatRestzeit,
  istBeantwortet,
  restzeitMs,
  simulationsPool,
  starteSimulation,
} from '../logic/simulation';
import type { Frage, LaufendeSimulation, SimulationErgebnis, SimulationsEinstellungen } from '../types';

export function PruefungSeite() {
  const { db, fragen, profil, simulationen, aendereProfil, simulationSpeichern } = useDaten();
  const navigate = useNavigate();
  const [laufend, setLaufend] = useState<LaufendeSimulation | null | undefined>(undefined);
  const [verwerfenOffen, setVerwerfenOffen] = useState(false);
  const [wertetAus, setWertetAus] = useState(false);

  useEffect(() => {
    holeLaufendeSimulation(db).then(setLaufend);
  }, [db]);

  const pool = simulationsPool(profil.nurGeprueft ? fragen.filter((f) => f.geprueft) : fragen);
  const e = profil.simulation;
  const setze = (aenderung: Partial<SimulationsEinstellungen>) => aendereProfil({ simulation: { ...e, ...aenderung } });

  const starten = async () => {
    const neu = starteSimulation(pool, { ...e, anzahl: Math.min(e.anzahl, pool.length) }, profil.antwortenMischen, Date.now());
    await speichereLaufendeSimulation(db, neu);
    navigate('/pruefung/laeuft');
  };

  const verwerfen = async () => {
    await loescheLaufendeSimulation(db);
    setLaufend(null);
    setVerwerfenOffen(false);
  };

  const auswerten = async (s: LaufendeSimulation) => {
    setWertetAus(true);
    const r = await simulationSpeichern(s);
    navigate(`/pruefung/ergebnis/${r.ergebnis.id}`, { state: { ereignis: r.ereignis } });
  };

  const bestanden = simulationen.filter((s) => s.bestanden).length;

  return (
    <Seite titel="Prüfungssimulation">
      {laufend && (
        <LaufendeKarte
          laufend={laufend}
          fragenNachId={new Map(fragen.map((f) => [f.id, f]))}
          onFortsetzen={() => navigate('/pruefung/laeuft')}
          onAuswerten={() => auswerten(laufend)}
          onVerwerfen={() => setVerwerfenOffen(true)}
          wertetAus={wertetAus}
        />
      )}

      <Karte>
        <h2 className="font-semibold">Neue Simulation</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Gemischte Fragen aus allen Themen, gleichmäßig verteilt. Keine Rückmeldung während der Prüfung, unbeantwortete
          Fragen zählen als falsch. Die Zeit läuft weiter, auch wenn du die App schließt.
        </p>
      </Karte>
      <div className="mt-2 space-y-2">
        <Stepper
          titel="Anzahl Fragen"
          wert={e.anzahl}
          {...SIMULATION_GRENZEN.anzahl}
          onChange={(anzahl) => setze({ anzahl })}
        />
        <Stepper
          titel="Zeit"
          einheit="Minuten"
          wert={e.minuten}
          {...SIMULATION_GRENZEN.minuten}
          onChange={(minuten) => setze({ minuten })}
        />
        <Stepper
          titel="Bestehensgrenze"
          einheit="Prozent"
          wert={e.bestehensgrenze}
          {...SIMULATION_GRENZEN.bestehensgrenze}
          onChange={(bestehensgrenze) => setze({ bestehensgrenze })}
        />
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        {pool.length} Fragen verfügbar (ohne Karteikarten{profil.nurGeprueft ? ', nur geprüfte' : ''}).
        {pool.length > 0 && pool.length < e.anzahl && ` Es werden alle ${pool.length} genommen.`}
      </p>
      <button
        type="button"
        className={knopf('primaer', 'mt-4 w-full')}
        disabled={pool.length === 0 || !!laufend || laufend === undefined}
        onClick={starten}
      >
        ⏱ Simulation starten
      </button>
      {laufend && <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">Erst die laufende Simulation beenden.</p>}

      <h2 className="mt-8 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
        Verlauf{simulationen.length > 0 && ` · ${bestanden} von ${simulationen.length} bestanden`}
      </h2>
      {simulationen.length === 0 ? (
        <Karte>
          <p className="text-sm text-slate-600 dark:text-slate-400">Noch keine Simulation gemacht.</p>
        </Karte>
      ) : (
        <ul className="space-y-2">
          {simulationen.map((s) => (
            <li key={s.id}>
              <VerlaufEintrag s={s} />
            </li>
          ))}
        </ul>
      )}

      <Dialog offen={verwerfenOffen} titel="Simulation verwerfen?" onSchliessen={() => setVerwerfenOffen(false)}>
        <p className="text-slate-600 dark:text-slate-400">Die bisherigen Antworten werden gelöscht und nicht gewertet.</p>
        <div className="mt-4 grid gap-2">
          <button type="button" className={knopf('rot')} onClick={verwerfen}>
            Verwerfen
          </button>
          <button type="button" className={knopf('leise')} onClick={() => setVerwerfenOffen(false)}>
            Abbrechen
          </button>
        </div>
      </Dialog>
    </Seite>
  );
}

function LaufendeKarte({
  laufend,
  fragenNachId,
  onFortsetzen,
  onAuswerten,
  onVerwerfen,
  wertetAus,
}: {
  laufend: LaufendeSimulation;
  fragenNachId: Map<string, Frage>;
  onFortsetzen: () => void;
  onAuswerten: () => void;
  onVerwerfen: () => void;
  wertetAus: boolean;
}) {
  const rest = restzeitMs(laufend, Date.now());
  const beantwortet = laufend.fragen.filter(({ id }) => {
    const f = fragenNachId.get(id);
    return f && istBeantwortet(f, laufend.antworten[id]);
  }).length;
  return (
    <div className="mb-4 rounded-2xl bg-marke-50 p-4 ring-2 ring-marke-400 dark:bg-marke-500/10">
      <p className="font-semibold">Laufende Simulation</p>
      <p className="text-sm text-slate-700 dark:text-slate-300">
        {beantwortet} von {laufend.fragen.length} beantwortet ·{' '}
        {rest > 0 ? `noch ${formatRestzeit(rest)}` : 'Zeit abgelaufen'}
      </p>
      <div className="mt-3 grid gap-2">
        {rest > 0 ? (
          <button type="button" className={knopf('primaer')} onClick={onFortsetzen}>
            Fortsetzen
          </button>
        ) : (
          <button type="button" className={knopf('primaer')} onClick={onAuswerten} disabled={wertetAus}>
            Jetzt auswerten
          </button>
        )}
        <button type="button" className={knopf('leise', '', 'mittel')} onClick={onVerwerfen}>
          Verwerfen
        </button>
      </div>
    </div>
  );
}

function VerlaufEintrag({ s }: { s: SimulationErgebnis }) {
  return (
    <Link
      to={`/pruefung/ergebnis/${s.id}`}
      className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-slate-600 dark:text-slate-400">{formatDatumZeit(s.datum)}</span>
        <BestandenMarke bestanden={s.bestanden} />
      </div>
      <p className="mt-1">
        <span className="text-xl font-semibold">{s.prozent.toLocaleString('de-DE')} %</span>{' '}
        <span className="text-sm text-slate-600 dark:text-slate-400">
          · {s.richtig} von {s.anzahl} richtig · {formatDauer(s.dauerSek)}
        </span>
      </p>
      <div className="mt-2">
        <Meter
          anteil={s.prozent / 100}
          label={`${s.prozent} % richtig, Bestehensgrenze ${s.einstellungen.bestehensgrenze} %`}
          markierung={s.einstellungen.bestehensgrenze / 100}
          hoehe="h-2"
        />
      </div>
    </Link>
  );
}
