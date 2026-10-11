import { describe, expect, it } from 'vitest';
import { pruefeFrage, pruefeSammlung } from './validierung';

const basis = {
  id: 'test-001',
  thema: 'recht',
  typ: 'einfach',
  frage: 'Frage?',
  antworten: ['A', 'B'],
  richtig: [0],
  erklaerung: 'Weil.',
  quelle: 'NAV',
  schwierigkeit: 1,
  bild: null,
  geprueft: false,
  stand: '2026-10',
};

describe('pruefeFrage', () => {
  it('akzeptiert eine gültige Einfachauswahl', () => {
    expect(pruefeFrage(basis)).toEqual([]);
  });

  it('meldet fehlende Felder und unbekannte Felder', () => {
    const { quelle: _q, ...ohneQuelle } = basis;
    expect(pruefeFrage({ ...ohneQuelle, extra: 1 })).toEqual(['Feld „quelle“ fehlt', 'Unbekanntes Feld „extra“']);
  });

  it('meldet ein fehlendes Feld nicht zusätzlich als leer', () => {
    expect(pruefeFrage({ id: 'x', thema: 'recht' })).toEqual([
      'Feld „typ“ fehlt', 'Feld „frage“ fehlt', 'Feld „antworten“ fehlt', 'Feld „richtig“ fehlt', 'Feld „erklaerung“ fehlt',
      'Feld „quelle“ fehlt', 'Feld „schwierigkeit“ fehlt', 'Feld „bild“ fehlt', 'Feld „geprueft“ fehlt', 'Feld „stand“ fehlt',
    ]);
  });

  it('meldet fehlende richtige Antwort', () => {
    expect(pruefeFrage({ ...basis, richtig: [] })).toContain('Keine richtige Antwort angegeben');
  });

  it('meldet ungültigen Index und mehrere richtige bei Einfachauswahl', () => {
    expect(pruefeFrage({ ...basis, richtig: [5] })).toContain('richtig enthält einen ungültigen Antwort-Index');
    expect(pruefeFrage({ ...basis, richtig: [0, 1] })).toContain(
      'Einfachauswahl braucht genau eine richtige Antwort',
    );
  });

  it('erlaubt mehrere richtige bei Mehrfachauswahl', () => {
    expect(pruefeFrage({ ...basis, typ: 'mehrfach', richtig: [0, 1] })).toEqual([]);
  });

  it('meldet leere Erklärung', () => {
    expect(pruefeFrage({ ...basis, erklaerung: '  ' })).toContain('Erklärung ist leer');
  });

  it('prüft Rechenaufgaben', () => {
    const r = { ...basis, typ: 'rechnen', antworten: [], richtig: { wert: 1, einheit: 'A', toleranz: 0.1, toleranzArt: 'abs' } };
    expect(pruefeFrage(r)).toEqual([]);
    expect(pruefeFrage({ ...r, richtig: [0] })[0]).toMatch(/braucht richtig/);
    expect(pruefeFrage({ ...r, richtig: { einheit: 'A', toleranz: 0, toleranzArt: 'abs' } })).toContain('Rechenlösung: wert fehlt');
    expect(pruefeFrage({ ...r, richtig: { wert: 1, einheit: 'A', toleranz: 0.1, toleranzArt: 'x' } })).toContain(
      'Rechenlösung: toleranzArt muss abs oder rel sein',
    );
  });

  it('prüft Karteikarten', () => {
    const k = { ...basis, typ: 'karte', antworten: [], richtig: 'Musterantwort' };
    expect(pruefeFrage(k)).toEqual([]);
    expect(pruefeFrage({ ...k, richtig: '' })).toContain('Karteikarte braucht eine Musterantwort in richtig');
  });

  it('meldet unbekanntes Thema und falsche Schwierigkeit', () => {
    const fehler = pruefeFrage({ ...basis, thema: 'quatsch', schwierigkeit: 4 });
    expect(fehler).toContain('Unbekanntes Thema „quatsch“');
    expect(fehler).toContain('schwierigkeit muss 1, 2 oder 3 sein');
  });
});

describe('pruefeSammlung', () => {
  it('findet doppelte IDs über mehrere Dateien', () => {
    const befunde = pruefeSammlung([
      { ort: 'a.json', inhalt: [basis] },
      { ort: 'b.json', inhalt: [basis] },
    ]);
    expect(befunde).toEqual([{ ort: 'b.json', id: 'test-001', fehler: 'Doppelte ID (schon in a.json)' }]);
  });

  it('prüft, ob das Thema zur Datei passt', () => {
    const befunde = pruefeSammlung([{ ort: 'tab.json', inhalt: [basis], erwartetesThema: 'tab' }]);
    expect(befunde[0].fehler).toMatch(/Thema passt nicht/);
  });

  it('meldet Dateien, die keine Liste sind', () => {
    expect(pruefeSammlung([{ ort: 'x.json', inhalt: {} }])[0].fehler).toMatch(/Liste/);
  });
});
