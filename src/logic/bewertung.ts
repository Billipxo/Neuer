import type { RechenLoesung } from '../types';

/** Einfach- und Mehrfachauswahl: nur exakt die richtigen Antworten zählen (wie beim Führerschein). */
export function bewerteAuswahl(richtig: number[], gewaehlt: number[]): boolean {
  const soll = new Set(richtig);
  const ist = new Set(gewaehlt);
  return soll.size === ist.size && [...soll].every((i) => ist.has(i));
}

/**
 * Liest eine Zahleneingabe. Erlaubt sind Komma oder Punkt als Dezimaltrenner,
 * Leerzeichen als Tausendertrenner, deutsches Format „1.234,5“ und eine angehängte Einheit („15,9 A“).
 * Liefert null, wenn keine Zahl erkannt wird.
 */
export function parseZahl(eingabe: string): number | null {
  let s = eingabe.trim().replace(/[\s  ]/g, '').replace(/−/g, '-');
  // angehängte Einheit wie „A“, „Ω“, „mm²“, „%“ entfernen
  s = s.replace(/[^\d.,+-]+$/, '');
  if (s.includes('.') && s.includes(',')) {
    // „1.234,5“ (deutsch) oder „1,234.5“ (englisch)
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else {
    s = s.replace(',', '.');
  }
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Erlaubte absolute Abweichung einer Rechenlösung. */
export function erlaubteAbweichung(l: RechenLoesung): number {
  return l.toleranzArt === 'abs' ? l.toleranz : (Math.abs(l.wert) * l.toleranz) / 100;
}

/** Rechenaufgabe: richtig, wenn der Wert innerhalb der Toleranz liegt (Grenzen eingeschlossen). */
export function bewerteRechnung(l: RechenLoesung, wert: number): boolean {
  // kleiner Zuschlag gegen Rundungsfehler der Gleitkommazahlen
  const epsilon = 1e-9 * Math.max(1, Math.abs(l.wert));
  return Math.abs(wert - l.wert) <= erlaubteAbweichung(l) + epsilon;
}

/** Zahl im deutschen Format, z. B. 2,875 – ohne Tausenderpunkt, damit 1840 nicht wie 1,84 aussieht */
export function formatZahl(n: number, maxStellen = 4): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: maxStellen, useGrouping: false });
}

/** „± 0,2 A“ bzw. „± 2 %“ */
export function formatToleranz(l: RechenLoesung): string {
  return l.toleranzArt === 'abs' ? `± ${formatZahl(l.toleranz)} ${l.einheit}`.trim() : `± ${formatZahl(l.toleranz)} %`;
}
