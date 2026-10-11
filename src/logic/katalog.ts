import {
  FRAGE_TYPEN,
  THEMEN,
  THEMA_IDS,
  type FrageTyp,
  type Fortschritt,
  type Frage,
  type LernStatus,
  type ThemaId,
} from '../types';

export const LERN_STATUS: readonly LernStatus[] = ['neu', 'falsch', 'einmal', 'gelernt'];

export interface KatalogFilter {
  suche: string;
  thema: ThemaId | 'alle';
  typ: FrageTyp | 'alle';
  status: LernStatus | 'alle';
  geprueft: 'alle' | 'ja' | 'nein';
  markiert: boolean;
  gemeldet: boolean;
  mitNotiz: boolean;
}

export const LEERER_FILTER: KatalogFilter = {
  suche: '',
  thema: 'alle',
  typ: 'alle',
  status: 'alle',
  geprueft: 'alle',
  markiert: false,
  gemeldet: false,
  mitNotiz: false,
};

function klein(s: string): string {
  return s.toLocaleLowerCase('de-DE');
}

/** Gesamter durchsuchbarer Text einer Frage inkl. eigener Notiz und Fehlermeldung. */
export function suchtext(f: Frage, fp?: Fortschritt): string {
  return klein(
    [
      f.id,
      f.frage,
      ...f.antworten,
      typeof f.richtig === 'string' ? f.richtig : '',
      f.erklaerung,
      f.quelle,
      f.unterthema ?? '',
      THEMEN.find((t) => t.id === f.thema)?.titel ?? '',
      fp?.notiz ?? '',
      fp?.fehlerMeldung ?? '',
    ].join('\n'),
  );
}

/** Alle Suchbegriffe (durch Leerzeichen getrennt) müssen vorkommen. */
export function passtZurSuche(text: string, suche: string): boolean {
  const begriffe = klein(suche).split(/\s+/).filter(Boolean);
  return begriffe.every((b) => text.includes(b));
}

export function filtereFragen<T extends Frage>(
  fragen: readonly T[],
  fortschritte: ReadonlyMap<string, Fortschritt>,
  filter: KatalogFilter,
): T[] {
  return fragen.filter((f) => {
    const fp = fortschritte.get(f.id);
    if (filter.thema !== 'alle' && f.thema !== filter.thema) return false;
    if (filter.typ !== 'alle' && f.typ !== filter.typ) return false;
    if (filter.status !== 'alle' && (fp?.status ?? 'neu') !== filter.status) return false;
    if (filter.geprueft === 'ja' && !f.geprueft) return false;
    if (filter.geprueft === 'nein' && f.geprueft) return false;
    if (filter.markiert && !fp?.markiert) return false;
    if (filter.gemeldet && !fp?.fehlerMeldung) return false;
    if (filter.mitNotiz && !fp?.notiz) return false;
    if (filter.suche.trim() && !passtZurSuche(suchtext(f, fp), filter.suche)) return false;
    return true;
  });
}

/** Anzahl gesetzter Filter (ohne Suche) – für die Anzeige „Filter (2)“. */
export function anzahlAktiverFilter(filter: KatalogFilter): number {
  return (
    Number(filter.thema !== 'alle') +
    Number(filter.typ !== 'alle') +
    Number(filter.status !== 'alle') +
    Number(filter.geprueft !== 'alle') +
    Number(filter.markiert) +
    Number(filter.gemeldet) +
    Number(filter.mitNotiz)
  );
}

// Filter werden in der URL gespeichert, damit „Zurück“ aus der Detailansicht sie behält.

export function filterAusParams(p: URLSearchParams): KatalogFilter {
  const wahl = <T extends string>(wert: string | null, erlaubt: readonly T[], standard: T): T =>
    erlaubt.includes(wert as T) ? (wert as T) : standard;
  return {
    suche: p.get('q') ?? '',
    thema: wahl(p.get('thema'), ['alle', ...THEMA_IDS], 'alle'),
    typ: wahl(p.get('typ'), ['alle', ...FRAGE_TYPEN], 'alle'),
    status: wahl(p.get('status'), ['alle', ...LERN_STATUS], 'alle'),
    geprueft: wahl(p.get('geprueft'), ['alle', 'ja', 'nein'], 'alle'),
    markiert: p.get('markiert') === '1',
    gemeldet: p.get('gemeldet') === '1',
    mitNotiz: p.get('notiz') === '1',
  };
}

export function filterZuParams(f: KatalogFilter): URLSearchParams {
  const p = new URLSearchParams();
  if (f.suche) p.set('q', f.suche);
  if (f.thema !== 'alle') p.set('thema', f.thema);
  if (f.typ !== 'alle') p.set('typ', f.typ);
  if (f.status !== 'alle') p.set('status', f.status);
  if (f.geprueft !== 'alle') p.set('geprueft', f.geprueft);
  if (f.markiert) p.set('markiert', '1');
  if (f.gemeldet) p.set('gemeldet', '1');
  if (f.mitNotiz) p.set('notiz', '1');
  return p;
}
