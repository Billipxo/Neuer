import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AntwortOption, BUCHSTABEN, RechenEingabe } from '../components/Antworten';
import { Erklaerung, FrageKopf, Loesung, themaTitel } from '../components/FrageTeile';
import { Karte, Seite } from '../components/Seite';
import { BestandenMarke, Chip, Meter, knopf } from '../components/ui';
import { useDaten } from '../db/DatenContext';
import { formatDatumZeit } from '../logic/format';
import type { SimulationsEreignis } from '../logic/motivation';
import { formatDauer } from '../logic/simulation';
import { THEMEN, type Frage, type RechenLoesung, type SimulationsAntwort } from '../types';

export function SimulationErgebnisSeite() {
  const { id } = useParams();
  const { simulationen, fragen } = useDaten();
  const location = useLocation();
  // XP nur direkt nach dem Abgeben (über den Navigationszustand), nicht beim späteren Ansehen
  const ereignis = (location.state as { ereignis?: SimulationsEreignis } | null)?.ereignis;
  const [nurFalsche, setNurFalsche] = useState(true);
  const [offen, setOffen] = useState<string | null>(null);
  const s = simulationen.find((x) => String(x.id) === id);
  const nachId = new Map(fragen.map((f) => [f.id, f]));

  if (!s) {
    return (
      <Seite titel="Ergebnis">
        <p className="text-slate-500 dark:text-slate-400">Diese Simulation gibt es nicht (mehr).</p>
        <Link to="/pruefung" className={knopf('primaer', 'mt-4 w-full')}>
          Zur Prüfung
        </Link>
      </Seite>
    );
  }

  const grenze = s.einstellungen.bestehensgrenze;
  const nummer = new Map(s.details.map((d, i) => [d.id, i + 1]));
  const liste = s.details.filter((d) => !nurFalsche || !d.richtig);
  const wiederholen = new URLSearchParams({ ids: s.falscheIds.join(','), zurueck: `/pruefung/ergebnis/${s.id}` });

  return (
    <Seite titel="Ergebnis">
      <Link to="/pruefung" className="-mt-2 mb-3 inline-block text-sm text-slate-500 dark:text-slate-400">
        ‹ Prüfung
      </Link>

      <Karte className="text-center">
        <BestandenMarke bestanden={s.bestanden} gross />
        <p className="mt-3 text-5xl font-bold">{s.prozent.toLocaleString('de-DE')} %</p>
        <p className="mt-1 text-slate-700 dark:text-slate-300">
          {s.richtig} von {s.anzahl} richtig · Bestehensgrenze {grenze} %
        </p>
        <div className="mt-4 text-left">
          <Meter anteil={s.prozent / 100} label={`${s.prozent} % richtig`} markierung={grenze / 100} hoehe="h-3" />
        </div>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {formatDatumZeit(s.datum)} · Dauer {formatDauer(s.dauerSek)}
          {s.unbeantwortet > 0 && ` · ${s.unbeantwortet} unbeantwortet`}
        </p>
        {ereignis && (
          <div className="mt-4">
            <p className="inline-block rounded-full bg-marke-400 px-4 py-1.5 font-bold text-slate-900">⭐ +{ereignis.xpGesamt} XP</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              +{ereignis.xpAbgeschlossen} abgeschlossen
              {ereignis.xpBestanden > 0 && ` · +${ereignis.xpBestanden} bestanden`}
              {ereignis.xpTagesziel > 0 && ` · +${ereignis.xpTagesziel} Tagesziel`}
            </p>
          </div>
        )}
      </Karte>

      <Karte className="mt-4">
        <h2 className="mb-3 font-semibold">Ergebnis je Thema</h2>
        <ul className="space-y-3">
          {THEMEN.filter((t) => s.jeThema[t.id]).map((t) => {
            const { richtig, gesamt } = s.jeThema[t.id]!;
            return (
              <li key={t.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{t.titel}</span>
                  <span className="shrink-0 text-slate-600 dark:text-slate-400">
                    {richtig} von {gesamt}
                  </span>
                </div>
                <Meter anteil={richtig / gesamt} label={`${t.titel}: ${richtig} von ${gesamt} richtig`} hoehe="h-2" />
              </li>
            );
          })}
        </ul>
      </Karte>

      <div className="mt-4 grid gap-3">
        {s.falscheIds.length > 0 && (
          <Link to={`/sitzung?${wiederholen}`} className={knopf('primaer')}>
            🔁 {s.falscheIds.length} falsche wiederholen
          </Link>
        )}
        <Link to="/pruefung" className={knopf(s.falscheIds.length ? 'sekundaer' : 'primaer')}>
          Neue Simulation
        </Link>
      </div>

      <h2 className="mt-8 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Fragen durchsehen</h2>
      <div className="mb-3 flex gap-2">
        <Chip aktiv={nurFalsche} onClick={() => setNurFalsche(true)}>
          Falsche ({s.falscheIds.length})
        </Chip>
        <Chip aktiv={!nurFalsche} onClick={() => setNurFalsche(false)}>
          Alle ({s.details.length})
        </Chip>
      </div>
      {liste.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Keine falschen Antworten – stark!</p>}
      <ul className="space-y-2">
        {liste.map((d) => {
          const frage = nachId.get(d.id);
          const auf = offen === d.id;
          return (
            <li key={d.id} className="rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <button
                type="button"
                className="flex w-full items-start gap-3 p-3 text-left"
                aria-expanded={auf}
                onClick={() => setOffen(auf ? null : d.id)}
              >
                <span
                  className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                    d.richtig ? 'bg-green-700' : d.antwort === null ? 'bg-slate-500' : 'bg-red-600'
                  }`}
                  aria-label={d.richtig ? 'richtig' : d.antwort === null ? 'unbeantwortet' : 'falsch'}
                >
                  {d.richtig ? '✓' : d.antwort === null ? '–' : '✗'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Frage {nummer.get(d.id)} · {frage ? themaTitel(frage.thema) : 'gelöscht'}
                  </span>
                  <span className={`block text-sm ${auf ? '' : 'line-clamp-2'}`}>{frage?.frage ?? 'Diese Frage wurde gelöscht.'}</span>
                </span>
                <span className="text-slate-400" aria-hidden>
                  {auf ? '▴' : '▾'}
                </span>
              </button>
              {auf && frage && (
                <div className="px-3 pb-3">
                  <AntwortAnsicht frage={frage} antwort={d.antwort} richtig={d.richtig} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Seite>
  );
}

/** Deine Antwort neben der richtigen Lösung, mit Erklärung */
function AntwortAnsicht({ frage, antwort, richtig }: { frage: Frage; antwort: SimulationsAntwort | null; richtig: boolean }) {
  return (
    <div className="space-y-3">
      <FrageKopf frage={frage} />
      {antwort === null && (
        <p className="rounded-xl bg-slate-100 p-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Nicht beantwortet – zählt als falsch.
        </p>
      )}
      {(frage.typ === 'einfach' || frage.typ === 'mehrfach') && (
        <div className="space-y-2">
          {frage.antworten.map((a, i) => (
            <AntwortOption
              key={i}
              buchstabe={BUCHSTABEN[i]}
              text={a}
              mehrfach={frage.typ === 'mehrfach'}
              ausgewaehlt={Array.isArray(antwort) && antwort.includes(i)}
              richtig={(frage.richtig as number[]).includes(i)}
              aufgeloest
              onClick={() => {}}
            />
          ))}
        </div>
      )}
      {frage.typ === 'rechnen' &&
        (typeof antwort === 'string' ? (
          <RechenEingabe
            loesung={frage.richtig as RechenLoesung}
            eingabe={antwort}
            setEingabe={() => {}}
            fehler={false}
            aufgeloest
            ergebnis={richtig ? 'richtig' : 'falsch'}
            onSubmit={(e) => e.preventDefault()}
          />
        ) : (
          <Loesung frage={frage} />
        ))}
      <Erklaerung frage={frage} />
    </div>
  );
}
