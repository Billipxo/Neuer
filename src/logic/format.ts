import type { Fortschritt } from '../types';
import { tagesbeginn } from './leitner';

const TAG = 86_400_000;

/** Ganze Kalendertage von `von` bis `bis` (lokale Zeit, robust gegen Sommerzeit). */
export function tageZwischen(von: number, bis: number): number {
  return Math.round((tagesbeginn(bis) - tagesbeginn(von)) / TAG);
}

/** z. B. „Mi., 16.01.2027, 14:30“ */
export function formatDatumZeit(ts: number): string {
  return new Date(ts).toLocaleString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** z. B. „Mi., 16.01.“ */
export function formatDatumKurz(ts: number): string {
  return new Date(ts).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

/** Wann ist die Frage wieder dran? */
export function formatFaelligkeit(fp: Fortschritt | undefined, jetzt = Date.now()): string {
  if (!fp || fp.status === 'neu') return 'noch nicht beantwortet';
  if (fp.faelligAb <= jetzt) return 'jetzt fällig';
  const tage = tageZwischen(jetzt, fp.faelligAb);
  if (tage <= 0) return 'heute fällig';
  if (tage === 1) return 'morgen fällig';
  if (tage === 2) return 'übermorgen fällig';
  return `fällig in ${tage} Tagen (${formatDatumKurz(fp.faelligAb)})`;
}
