import type {
  Frage,
  LaufendeSimulation,
  RechenLoesung,
  SimulationErgebnis,
  SimulationsAntwort,
  SimulationsEinstellungen,
  ThemaId,
} from '../types';
import { bewerteAuswahl, bewerteRechnung, parseZahl } from './bewertung';
import { antwortReihenfolge, mischen } from './sitzung';

export const SIMULATION_GRENZEN = {
  anzahl: { min: 5, max: 100, schritt: 5 },
  minuten: { min: 5, max: 180, schritt: 5 },
  bestehensgrenze: { min: 50, max: 100, schritt: 5 },
} as const;

/** Karteikarten gehören zum Fachgespräch, nicht zur schriftlichen Prüfung. */
export function simulationsPool<T extends Frage>(fragen: readonly T[]): T[] {
  return fragen.filter((f) => f.typ !== 'karte');
}

/**
 * Wählt Fragen möglichst gleichmäßig über die Themen (reihum je Thema eine),
 * danach wird gemischt, damit die Themen bunt durcheinander kommen.
 */
export function waehleSimulationsFragen<T extends Frage>(
  fragen: readonly T[],
  anzahl: number,
  zufall: () => number = Math.random,
): T[] {
  const jeThema = new Map<ThemaId, T[]>();
  for (const f of mischen(simulationsPool(fragen), zufall)) {
    jeThema.set(f.thema, [...(jeThema.get(f.thema) ?? []), f]);
  }
  const stapel = mischen([...jeThema.values()], zufall);
  const auswahl: T[] = [];
  while (auswahl.length < anzahl && stapel.some((s) => s.length > 0)) {
    for (const s of stapel) {
      const f = s.shift();
      if (f) auswahl.push(f);
      if (auswahl.length >= anzahl) break;
    }
  }
  return mischen(auswahl, zufall);
}

export function starteSimulation(
  fragen: readonly Frage[],
  einstellungen: SimulationsEinstellungen,
  antwortenMischen: boolean,
  jetzt: number,
  zufall: () => number = Math.random,
): LaufendeSimulation {
  return {
    start: jetzt,
    einstellungen,
    fragen: waehleSimulationsFragen(fragen, einstellungen.anzahl, zufall).map((f) => ({
      id: f.id,
      reihenfolge: antwortReihenfolge(f.antworten.length, antwortenMischen, zufall),
    })),
    antworten: {},
    gemerkt: [],
    pos: 0,
  };
}

export function istBeantwortet(frage: Frage, antwort: SimulationsAntwort | undefined | null): boolean {
  if (antwort === undefined || antwort === null) return false;
  if (frage.typ === 'rechnen') return typeof antwort === 'string' && parseZahl(antwort) !== null;
  return Array.isArray(antwort) && antwort.length > 0;
}

export function istRichtig(frage: Frage, antwort: SimulationsAntwort | undefined | null): boolean {
  if (!istBeantwortet(frage, antwort)) return false;
  if (frage.typ === 'rechnen') return bewerteRechnung(frage.richtig as RechenLoesung, parseZahl(antwort as string)!);
  if (frage.typ === 'einfach' || frage.typ === 'mehrfach') return bewerteAuswahl(frage.richtig as number[], antwort as number[]);
  return false;
}

export function endeZeitpunkt(s: LaufendeSimulation): number {
  return s.start + s.einstellungen.minuten * 60_000;
}

export function restzeitMs(s: LaufendeSimulation, jetzt: number): number {
  return Math.max(0, endeZeitpunkt(s) - jetzt);
}

/** „59:07“ bzw. „1:05:00“ */
export function formatRestzeit(ms: number): string {
  const gesamt = Math.ceil(ms / 1000);
  const h = Math.floor(gesamt / 3600);
  const m = Math.floor((gesamt % 3600) / 60);
  const s = gesamt % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** Wertet eine Simulation aus. Unbeantwortete Fragen zählen als falsch. */
export function werteSimulationAus(
  s: LaufendeSimulation,
  nachId: ReadonlyMap<string, Frage>,
  ende: number,
): SimulationErgebnis {
  const jeThema: SimulationErgebnis['jeThema'] = {};
  const details: SimulationErgebnis['details'] = [];
  let richtig = 0;
  let unbeantwortet = 0;
  for (const { id } of s.fragen) {
    const frage = nachId.get(id);
    if (!frage) continue; // zwischenzeitlich gelöscht
    const antwort = s.antworten[id];
    const beantwortet = istBeantwortet(frage, antwort);
    const ok = istRichtig(frage, antwort);
    if (ok) richtig++;
    if (!beantwortet) unbeantwortet++;
    const t = (jeThema[frage.thema] ??= { richtig: 0, gesamt: 0 });
    t.gesamt++;
    if (ok) t.richtig++;
    details.push({ id, antwort: beantwortet ? antwort : null, richtig: ok });
  }
  const anzahl = details.length;
  const anteil = anzahl ? richtig / anzahl : 0;
  return {
    datum: ende,
    einstellungen: s.einstellungen,
    dauerSek: Math.round(Math.min(ende - s.start, s.einstellungen.minuten * 60_000) / 1000),
    anzahl,
    richtig,
    prozent: Math.floor(anteil * 1000) / 10,
    // exakter Vergleich, damit 69,97 % nicht als 70 % durchgehen
    bestanden: anzahl > 0 && anteil * 100 >= s.einstellungen.bestehensgrenze - 1e-9,
    unbeantwortet,
    jeThema,
    falscheIds: details.filter((d) => !d.richtig).map((d) => d.id),
    details,
  };
}

/** „42:10 min“ */
export function formatDauer(sek: number): string {
  const m = Math.floor(sek / 60);
  const s = sek % 60;
  return `${m}:${String(s).padStart(2, '0')} min`;
}
