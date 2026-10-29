import type { Bereich, Frage, ThemaId } from '../types';

/** Gehört die Frage zum Themenbereich? Gleiches Thema und ihr Unterthema steht in der Liste des Bereichs. */
export function gehoertZu(f: Pick<Frage, 'thema' | 'unterthema'>, b: Pick<Bereich, 'thema' | 'unterthemen'>): boolean {
  return f.thema === b.thema && f.unterthema !== undefined && b.unterthemen.includes(f.unterthema);
}

export function bereicheVon(bereiche: readonly Bereich[], thema: ThemaId): Bereich[] {
  return bereiche.filter((b) => b.thema === thema);
}

export function bereichVonFrage(bereiche: readonly Bereich[], f: Pick<Frage, 'thema' | 'unterthema'>): Bereich | undefined {
  return bereiche.find((b) => gehoertZu(f, b));
}

export function fragenIm<T extends Frage>(fragen: readonly T[], b: Bereich): T[] {
  return fragen.filter((f) => gehoertZu(f, b));
}
