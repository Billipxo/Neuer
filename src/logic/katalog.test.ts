import { describe, expect, it } from 'vitest';
import {
  LEERER_FILTER,
  anzahlAktiverFilter,
  filterAusParams,
  filterZuParams,
  filtereFragen,
  passtZurSuche,
  suchtext,
  type KatalogFilter,
} from './katalog';
import { neuerFortschritt, type Fortschritt, type Frage, type ThemaId } from '../types';

const frage = (id: string, thema: ThemaId, extra: Partial<Frage> = {}): Frage => ({
  id, thema, typ: 'einfach', frage: `Frage ${id}`, antworten: ['A', 'B'], richtig: [0], erklaerung: 'E',
  quelle: 'Q', schwierigkeit: 1, bild: null, geprueft: false, stand: '2026-10', ...extra,
});
const fp = (id: string, extra: Partial<Fortschritt>): Fortschritt => ({ ...neuerFortschritt(id), ...extra });

const fragen = [
  frage('a', 'recht', { frage: 'Wer führt das Installateurverzeichnis?', quelle: 'NAV § 13', geprueft: true }),
  frage('b', 'schutz', { frage: 'Abschaltzeit im TN-System?', antworten: ['0,4 s', '5 s'] }),
  frage('c', 'rechnen', { typ: 'rechnen', antworten: [], richtig: { wert: 1, einheit: 'A', toleranz: 0, toleranzArt: 'abs' } }),
  frage('d', 'recht', { typ: 'karte', antworten: [], richtig: 'Musterantwort mit Handwerksrolle' }),
];
const fortschritte = new Map([
  ['a', fp('a', { status: 'gelernt', markiert: true })],
  ['b', fp('b', { status: 'falsch', fehlerMeldung: 'Wert prüfen', notiz: 'Tabelle 41.1 nachschlagen' })],
]);
const ids = (f: Partial<KatalogFilter>) => filtereFragen(fragen, fortschritte, { ...LEERER_FILTER, ...f }).map((x) => x.id);

describe('Volltextsuche', () => {
  it('findet Text in Frage, Antworten, Musterantwort, Quelle, Thema, Notiz und Meldung', () => {
    expect(ids({ suche: 'installateur' })).toEqual(['a']);
    expect(ids({ suche: '0,4 s' })).toEqual(['b']);
    expect(ids({ suche: 'handwerksrolle' })).toEqual(['d']);
    expect(ids({ suche: 'NAV § 13' })).toEqual(['a']);
    expect(ids({ suche: 'rechenaufgaben' })).toEqual(['c']);
    expect(ids({ suche: 'tabelle 41.1' })).toEqual(['b']);
    expect(ids({ suche: 'wert prüfen' })).toEqual(['b']);
  });

  it('alle Begriffe müssen vorkommen, Groß-/Kleinschreibung egal', () => {
    expect(passtZurSuche('abschaltzeit im tn-system', 'TN abschaltzeit')).toBe(true);
    expect(passtZurSuche('abschaltzeit im tn-system', 'TT abschaltzeit')).toBe(false);
    expect(suchtext(fragen[0])).toContain('installateurverzeichnis');
  });

  it('leere Suche findet alles', () => {
    expect(ids({ suche: '   ' })).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('Filter', () => {
  it('nach Thema, Typ und Status', () => {
    expect(ids({ thema: 'recht' })).toEqual(['a', 'd']);
    expect(ids({ typ: 'karte' })).toEqual(['d']);
    expect(ids({ status: 'neu' })).toEqual(['c', 'd']);
    expect(ids({ status: 'falsch' })).toEqual(['b']);
  });

  it('geprüft / ungeprüft', () => {
    expect(ids({ geprueft: 'ja' })).toEqual(['a']);
    expect(ids({ geprueft: 'nein' })).toEqual(['b', 'c', 'd']);
  });

  it('markiert, gemeldet, mit Notiz und Kombinationen', () => {
    expect(ids({ markiert: true })).toEqual(['a']);
    expect(ids({ gemeldet: true })).toEqual(['b']);
    expect(ids({ mitNotiz: true })).toEqual(['b']);
    expect(ids({ thema: 'recht', geprueft: 'nein' })).toEqual(['d']);
    expect(ids({ thema: 'recht', markiert: true, suche: 'karte' })).toEqual([]);
  });

  it('zählt aktive Filter', () => {
    expect(anzahlAktiverFilter(LEERER_FILTER)).toBe(0);
    expect(anzahlAktiverFilter({ ...LEERER_FILTER, suche: 'x', thema: 'tab', markiert: true })).toBe(2);
  });
});

describe('URL-Parameter', () => {
  it('Hin- und Rückweg ergeben denselben Filter', () => {
    const f: KatalogFilter = { suche: 'RCD 30 mA', thema: 'schutz', typ: 'mehrfach', status: 'einmal', geprueft: 'nein', markiert: true, gemeldet: true, mitNotiz: true };
    expect(filterAusParams(filterZuParams(f))).toEqual(f);
    expect(filterZuParams(LEERER_FILTER).toString()).toBe('');
  });

  it('ignoriert ungültige Werte', () => {
    expect(filterAusParams(new URLSearchParams('thema=quatsch&typ=x&status=y&geprueft=z'))).toEqual(LEERER_FILTER);
  });
});
