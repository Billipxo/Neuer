import { describe, expect, it } from 'vitest';
import { formelTeile, formelnFuer, formelnZumBereich } from './formeln';
import type { Bereich, FormelGruppe } from '../types';

const bereich = (id: string, unterthemen: string[]): Bereich => ({
  id, thema: 'rechnen', titel: id, kurz: 'k', unterthemen, erklaerung: [{ titel: 'T', text: 'x' }], quelle: 'Q', stand: '2026-10',
});
const gruppe = (id: string, bereiche: string[], fragen: string[] = []): FormelGruppe => ({
  id, titel: id, kurz: 'k', eintraege: [{ name: 'n', formeln: ['a = b'] }], bereiche, fragen,
});

const bereiche = [bereich('rechnen-fall', ['Spannungsfall']), bereich('rechnen-leistung', ['Strom & Leistung'])];
const gruppen = [gruppe('spannungsfall', ['rechnen-fall']), gruppe('leistung', ['rechnen-leistung'], ['tab-005']), gruppe('pruefwerte', [], ['pr-008'])];

describe('Formelsammlung', () => {
  it('findet Formeln über den Themenbereich der Frage', () => {
    const ids = formelnFuer({ id: 'r-1', thema: 'rechnen', unterthema: 'Spannungsfall' }, gruppen, bereiche).map((g) => g.id);
    expect(ids).toEqual(['spannungsfall']);
  });

  it('findet Formeln über die Frage-ID, auch in anderen Themen', () => {
    expect(formelnFuer({ id: 'tab-005', thema: 'tab', unterthema: 'Symmetrie' }, gruppen, bereiche).map((g) => g.id)).toEqual(['leistung']);
    expect(formelnFuer({ id: 'pr-008', thema: 'pruefung' }, gruppen, bereiche).map((g) => g.id)).toEqual(['pruefwerte']);
  });

  it('Wissensfragen ohne Zuordnung bekommen keine Formeln', () => {
    expect(formelnFuer({ id: 'tab-002', thema: 'tab', unterthema: 'Hauptstromversorgung' }, gruppen, bereiche)).toEqual([]);
  });

  it('findet die Formeln zu einem Themenbereich', () => {
    expect(formelnZumBereich('rechnen-leistung', gruppen).map((g) => g.id)).toEqual(['leistung']);
    expect(formelnZumBereich('recht-nav', gruppen)).toEqual([]);
  });

  it('zerlegt Formeltext in normale und tiefgestellte Teile', () => {
    expect(formelTeile('Z_s,max = U₀ / I_a')).toEqual([
      { text: 'Z', art: 'text' },
      { text: 's,max', art: 'tief' },
      { text: ' = U₀ / I', art: 'text' },
      { text: 'a', art: 'tief' },
    ]);
    expect(formelTeile('I_b, I_n und I_Δn')).toEqual([
      { text: 'I', art: 'text' },
      { text: 'b', art: 'tief' },
      { text: ', I', art: 'text' },
      { text: 'n', art: 'tief' },
      { text: ' und I', art: 'text' },
      { text: 'Δn', art: 'tief' },
    ]);
    expect(formelTeile('ohne Formelzeichen')).toEqual([{ text: 'ohne Formelzeichen', art: 'text' }]);
  });

  it('markiert das einzeln stehende „l“ (Länge), nicht aber l in Wörtern oder Indizes', () => {
    expect(formelTeile('ΔU = 2 · l · I')).toEqual([
      { text: 'ΔU = 2 · ', art: 'text' },
      { text: 'l', art: 'laenge' },
      { text: ' · I', art: 'text' },
    ]);
    expect(formelTeile('Leitungslänge l in m, ΔU_zul')).toEqual([
      { text: 'Leitungslänge ', art: 'text' },
      { text: 'l', art: 'laenge' },
      { text: ' in m, ΔU', art: 'text' },
      { text: 'zul', art: 'tief' },
    ]);
  });
});
