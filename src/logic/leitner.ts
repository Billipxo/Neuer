import type { Fortschritt, KartenBewertung } from '../types';

/**
 * Leitner-System
 *  Box 0  neu
 *  Box 1  falsch beantwortet → sofort wieder fällig
 *  Box 2  1× richtig bzw. „teilweise“ → morgen
 *  Box 3  → in 2 Tagen, Box 4 → in 4 Tagen, Box 5 → in 7 Tagen
 *
 * Status (Ampel)
 *  neu      – noch nie beantwortet
 *  falsch   – zuletzt falsch (rot)
 *  einmal   – zuletzt richtig, aber noch nicht 2× in Folge (gelb)
 *  gelernt  – mindestens 2× in Folge richtig (grün); ein Fehler macht sie wieder rot
 */
export const INTERVALL_TAGE = [0, 0, 1, 2, 4, 7] as const;
export const MAX_BOX = 5;
export const RICHTIG_IN_FOLGE_FUER_GELERNT = 2;

export type Ergebnis = 'richtig' | 'falsch' | 'teilweise';

/** Beginn des Tages (lokale Zeit), um `tage` Tage verschoben. */
export function tagesbeginn(ts: number, tage = 0): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + tage);
  return d.getTime();
}

export function faelligkeit(box: number, jetzt: number): number {
  const tage = INTERVALL_TAGE[Math.min(Math.max(box, 0), MAX_BOX)];
  return tage === 0 ? jetzt : tagesbeginn(jetzt, tage);
}

/** Neuer Lernstand einer Frage nach einer Antwort. */
export function naechsterFortschritt(alt: Fortschritt, ergebnis: Ergebnis, jetzt = Date.now()): Fortschritt {
  const f: Fortschritt = { ...alt, versuche: alt.versuche + 1, zuletzt: jetzt };
  switch (ergebnis) {
    case 'richtig':
      f.richtigGesamt = alt.richtigGesamt + 1;
      f.richtigInFolge = alt.richtigInFolge + 1;
      f.box = Math.min(MAX_BOX, Math.max(alt.box, 1) + 1);
      f.status = f.richtigInFolge >= RICHTIG_IN_FOLGE_FUER_GELERNT ? 'gelernt' : 'einmal';
      break;
    case 'falsch':
      f.richtigInFolge = 0;
      f.box = 1;
      f.status = 'falsch';
      break;
    case 'teilweise':
      // halb gewusst: gelb, morgen wieder
      f.richtigInFolge = 0;
      f.box = 2;
      f.status = 'einmal';
      break;
  }
  f.faelligAb = faelligkeit(f.box, jetzt);
  return f;
}

export const KARTEN_ERGEBNIS: Record<KartenBewertung, Ergebnis> = {
  gewusst: 'richtig',
  teilweise: 'teilweise',
  nicht: 'falsch',
};

export function istFaellig(f: Fortschritt | undefined, jetzt = Date.now()): boolean {
  return !!f && f.status !== 'neu' && f.faelligAb <= jetzt;
}
