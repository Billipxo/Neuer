import { tagesbeginn } from './leitner';

const TAG = 86_400_000;

/** Tag als Schlüssel „2027-01-30“ (lokale Zeit) */
export function tagSchluessel(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Mitternacht (lokale Zeit) eines Tages „YYYY-MM-DD“ */
export function tagAusSchluessel(schluessel: string): number {
  const [j, m, t] = schluessel.split('-').map(Number);
  return new Date(j, m - 1, t).getTime();
}

export function tagVerschieben(schluessel: string, tage: number): string {
  const [j, m, t] = schluessel.split('-').map(Number);
  return tagSchluessel(new Date(j, m - 1, t + tage).getTime());
}

export function istGueltigesDatum(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && tagSchluessel(tagAusSchluessel(s)) === s;
}

/** Ganze Kalendertage von `von` bis `bis` (lokale Zeit, robust gegen Sommerzeit). */
export function tageZwischen(von: number, bis: number): number {
  return Math.round((tagesbeginn(bis) - tagesbeginn(von)) / TAG);
}
