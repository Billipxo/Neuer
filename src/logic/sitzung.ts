import { THEMA_IDS, type Bereich, type Fortschritt, type Frage, type LernStatus, type ThemaId } from '../types';
import { gehoertZu } from './bereiche';
import { istFaellig } from './leitner';

export type LernModus = 'empfohlen' | 'reihe' | 'neu' | 'falsch' | 'markiert' | 'karten' | 'faellig';

export const LERN_MODI: readonly LernModus[] = ['empfohlen', 'reihe', 'neu', 'falsch', 'markiert', 'karten', 'faellig'];

export interface Auswahl {
  thema: ThemaId | 'alle';
  /** nur Fragen dieses Themenbereichs */
  bereich?: Pick<Bereich, 'thema' | 'unterthemen'>;
  modus: LernModus;
  nurGeprueft?: boolean;
  limit?: number;
}

export function mischen<T>(liste: readonly T[], zufall: () => number = Math.random): T[] {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function statusVon(f: Fortschritt | undefined): LernStatus {
  return f?.status ?? 'neu';
}

/**
 * Reihenfolge beim Lernen (kleiner = früher):
 * 0 fällig & falsch, 1 fällig & 1× richtig, 2 fällig & gelernt, 3 neu, 4 noch nicht fällig.
 * Innerhalb einer Gruppe wird gemischt, noch nicht fällige Fragen kommen nach Fälligkeit.
 */
function gruppe(f: Fortschritt | undefined, jetzt: number): number {
  const status = statusVon(f);
  if (status === 'neu') return 3;
  if (!istFaellig(f, jetzt)) return 4;
  return status === 'falsch' ? 0 : status === 'einmal' ? 1 : 2;
}

/**
 * Wählt die Fragen für eine Lernsitzung aus und sortiert sie.
 * „reihe“ (Alle der Reihe nach): alle Fragen wie im Fragenkatalog – Themen in fester Reihenfolge, nicht gemischt.
 */
export function waehleFragen(
  fragen: readonly Frage[],
  fortschritte: ReadonlyMap<string, Fortschritt>,
  auswahl: Auswahl,
  jetzt = Date.now(),
  zufall: () => number = Math.random,
): Frage[] {
  const fp = (f: Frage) => fortschritte.get(f.id);
  const { bereich } = auswahl;
  let pool = fragen.filter((f) => auswahl.thema === 'alle' || f.thema === auswahl.thema);
  if (bereich) pool = pool.filter((f) => gehoertZu(f, bereich));
  if (auswahl.nurGeprueft) pool = pool.filter((f) => f.geprueft);

  if (auswahl.modus === 'reihe') {
    const reihe = [...pool].sort((a, b) => THEMA_IDS.indexOf(a.thema) - THEMA_IDS.indexOf(b.thema));
    return auswahl.limit ? reihe.slice(0, auswahl.limit) : reihe;
  }

  switch (auswahl.modus) {
    case 'neu':
      pool = pool.filter((f) => statusVon(fp(f)) === 'neu');
      break;
    case 'falsch':
      pool = pool.filter((f) => statusVon(fp(f)) === 'falsch');
      break;
    case 'markiert':
      pool = pool.filter((f) => fp(f)?.markiert);
      break;
    case 'karten':
      pool = pool.filter((f) => f.typ === 'karte');
      break;
    case 'faellig':
      pool = pool.filter((f) => istFaellig(fp(f), jetzt));
      break;
    case 'empfohlen':
      break;
  }

  const gemischt = mischen(pool, zufall).map((f) => ({ f, g: gruppe(fp(f), jetzt), faellig: fp(f)?.faelligAb ?? 0 }));
  gemischt.sort((a, b) => a.g - b.g || (a.g === 4 ? a.faellig - b.faellig : 0));
  const sortiert = gemischt.map((x) => x.f);
  return auswahl.limit ? sortiert.slice(0, auswahl.limit) : sortiert;
}

/** Schlüssel für das Lesezeichen von „Alle der Reihe nach“, z. B. „recht|recht-nav“ oder „alle|“. */
export function lesezeichenSchluessel(thema: ThemaId | 'alle', bereichId?: string): string {
  return `${thema}|${bereichId ?? ''}`;
}

/**
 * Wo „Alle der Reihe nach“ weitergeht: hinter der zuletzt beantworteten Frage.
 * Nach der letzten Frage oder ohne passendes Lesezeichen geht es von vorn los.
 */
export function startNachLesezeichen(ids: readonly string[], lesezeichen: string | undefined): number {
  const i = lesezeichen === undefined ? -1 : ids.indexOf(lesezeichen);
  return i >= 0 && i < ids.length - 1 ? i + 1 : 0;
}

/** Fügt eine falsch beantwortete Frage ein paar Plätze weiter hinten erneut ein. */
export function wiederEinreihen<T>(warteschlange: readonly T[], pos: number, eintrag: T, abstand = 3): T[] {
  const ziel = Math.min(pos + 1 + abstand, warteschlange.length);
  return [...warteschlange.slice(0, ziel), eintrag, ...warteschlange.slice(ziel)];
}

/** Anzeigereihenfolge der Antworten (Original-Indizes). */
export function antwortReihenfolge(anzahl: number, gemischt: boolean, zufall: () => number = Math.random): number[] {
  const idx = Array.from({ length: anzahl }, (_, i) => i);
  return gemischt ? mischen(idx, zufall) : idx;
}

export interface Verteilung {
  gesamt: number;
  neu: number;
  falsch: number;
  einmal: number;
  gelernt: number;
}

export function statusVerteilung(
  fragen: readonly Frage[],
  fortschritte: ReadonlyMap<string, Fortschritt>,
): Verteilung {
  const v: Verteilung = { gesamt: fragen.length, neu: 0, falsch: 0, einmal: 0, gelernt: 0 };
  for (const f of fragen) v[statusVon(fortschritte.get(f.id))]++;
  return v;
}
