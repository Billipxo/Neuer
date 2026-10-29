import { describe, expect, it } from 'vitest';
import { pruefeBereich, pruefeBereiche, pruefeFormeln, pruefeFrage, pruefeSammlung } from './validierung';

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

const bereich = {
  id: 'recht-nav',
  thema: 'recht',
  titel: 'NAV',
  kurz: 'Kundenanlage und Mitteilungen',
  unterthemen: ['NAV'],
  erklaerung: [
    { titel: 'Worum geht es?', text: 'Die NAV regelt den Netzanschluss.' },
    { titel: 'Das Wichtigste', punkte: ['§ 13', '§ 14'] },
  ],
  quelle: 'NAV',
  stand: '2026-10',
};
const navFrage = { id: 'recht-001', thema: 'recht' as const, unterthema: 'NAV' };

describe('pruefeBereich', () => {
  it('akzeptiert einen gültigen Themenbereich', () => {
    expect(pruefeBereich(bereich)).toEqual([]);
  });

  it('meldet fehlende, leere und unbekannte Felder', () => {
    const { quelle: _q, ...ohneQuelle } = bereich;
    expect(pruefeBereich({ ...ohneQuelle, titel: ' ', farbe: 'rot' })).toEqual([
      'Feld „quelle“ fehlt',
      'Unbekanntes Feld „farbe“',
      'titel ist leer',
    ]);
    expect(pruefeBereich({ ...bereich, unterthemen: [] })).toContain('unterthemen muss eine Liste von Texten sein');
    expect(pruefeBereich({ ...bereich, unterthemen: ['NAV', 'NAV'] })).toContain('unterthemen enthält doppelte Einträge');
  });

  it('prüft die Abschnitte der Erklärung', () => {
    expect(pruefeBereich({ ...bereich, erklaerung: [] })).toContain('erklaerung muss eine Liste von Abschnitten sein');
    expect(pruefeBereich({ ...bereich, erklaerung: [{ titel: 'Leer' }] })).toContain('Abschnitt 1: braucht text oder punkte');
    expect(pruefeBereich({ ...bereich, erklaerung: [{ titel: '', punkte: ['a', ''] }, { titel: 'x', text: 'y', bild: 'z' }] })).toEqual([
      'Abschnitt 1: titel ist leer',
      'Abschnitt 1: punkte muss eine Liste von Texten sein',
      'Abschnitt 2: unbekanntes Feld „bild“',
    ]);
  });
});

describe('pruefeBereiche', () => {
  it('ist zufrieden, wenn jede Frage genau einen Bereich hat', () => {
    expect(pruefeBereiche([{ ort: 'bereiche/recht.json', inhalt: [bereich], erwartetesThema: 'recht' }], [navFrage])).toEqual([]);
  });

  it('meldet doppelte IDs, falsches Thema und doppelt vergebene Unterthemen', () => {
    const befunde = pruefeBereiche(
      [
        { ort: 'bereiche/recht.json', inhalt: [bereich, { ...bereich, id: 'recht-nav-2' }], erwartetesThema: 'recht' },
        { ort: 'bereiche/tab.json', inhalt: [bereich], erwartetesThema: 'tab' },
      ],
      [navFrage],
    );
    expect(befunde.map((b) => `${b.ort} ${b.id}: ${b.fehler}`)).toEqual([
      'bereiche/recht.json recht-nav-2: Unterthema „NAV“ steht schon im Bereich recht-nav',
      'bereiche/tab.json recht-nav: Thema passt nicht zur Datei (erwartet „tab“)',
      'bereiche/tab.json recht-nav: Doppelte ID (schon in bereiche/recht.json)',
      'bereiche/tab.json recht-nav: Unterthema „NAV“ steht schon im Bereich recht-nav',
    ]);
  });

  it('meldet Unterthemen ohne Fragen und Fragen ohne Bereich', () => {
    const befunde = pruefeBereiche(
      [{ ort: 'bereiche/recht.json', inhalt: [{ ...bereich, unterthemen: ['NAV', 'Tippfehler'] }] }],
      [navFrage, { id: 'recht-002', thema: 'recht', unterthema: 'EnWG' }, { id: 'recht-003', thema: 'recht' }],
    );
    expect(befunde.map((b) => `${b.ort} ${b.id}: ${b.fehler}`)).toEqual([
      'bereiche/recht.json recht-nav: Unterthema „Tippfehler“ kommt in keiner Frage vor',
      'recht.json recht-002: gehört zu keinem Themenbereich – Unterthema „EnWG“ in bereiche/recht.json eintragen',
      'recht.json recht-003: gehört zu keinem Themenbereich – unterthema fehlt',
    ]);
  });

  it('meldet Dateien, die keine Liste sind', () => {
    expect(pruefeBereiche([{ ort: 'bereiche/x.json', inhalt: {} }], [])[0].fehler).toMatch(/Liste/);
  });
});

describe('pruefeFormeln', () => {
  const gruppe = {
    id: 'leistung',
    titel: 'Leistung',
    kurz: 'P, S, Q',
    eintraege: [{ name: 'Wechselstrom', formeln: ['P = U · I · cos φ'], hinweis: 'U = 230 V' }],
    groessen: [{ zeichen: 'P', bedeutung: 'Wirkleistung in W' }],
    bereiche: ['rechnen-leistung'],
    fragen: ['tab-005'],
  };
  const bereiche = new Set(['rechnen-leistung']);
  const fragen = new Set(['tab-005']);
  const fehler = (inhalt: unknown) => pruefeFormeln(inhalt, bereiche, fragen).map((b) => `${b.id}: ${b.fehler}`);

  it('akzeptiert eine gültige Formelgruppe', () => {
    expect(fehler([gruppe])).toEqual([]);
  });

  it('meldet fehlende und unbekannte Felder sowie doppelte IDs', () => {
    const { kurz: _k, ...ohneKurz } = gruppe;
    expect(fehler([gruppe, { ...ohneKurz, farbe: 'blau' }])).toEqual([
      'leistung: Feld „kurz“ fehlt',
      'leistung: Unbekanntes Feld „farbe“',
      'leistung: Doppelte ID',
    ]);
  });

  it('prüft die Einträge', () => {
    expect(fehler([{ ...gruppe, eintraege: [] }])).toEqual(['leistung: eintraege muss eine Liste von Formeln sein']);
    expect(fehler([{ ...gruppe, eintraege: [{ name: '', formeln: [] , bild: 'x' }] }])).toEqual([
      'leistung: Eintrag 1: unbekanntes Feld „bild“',
      'leistung: Eintrag 1: name ist leer',
      'leistung: Eintrag 1: formeln muss eine Liste von Texten sein',
    ]);
  });

  it('prüft die Erklärung der Formelzeichen', () => {
    expect(fehler([{ ...gruppe, groessen: ['P Wirkleistung'] }])).toEqual(['leistung: groessen muss eine Liste aus { zeichen, bedeutung } sein']);
    expect(fehler([{ ...gruppe, groessen: [{ zeichen: 'P', bedeutung: '' }] }])).toEqual(['leistung: groessen muss eine Liste aus { zeichen, bedeutung } sein']);
  });

  it('meldet unbekannte Themenbereiche und Fragen', () => {
    expect(fehler([{ ...gruppe, bereiche: ['gibt-es-nicht'], fragen: ['auch-nicht'] }])).toEqual([
      'leistung: Themenbereich „gibt-es-nicht“ gibt es nicht',
      'leistung: Frage „auch-nicht“ gibt es nicht',
    ]);
  });

  it('meldet eine Datei, die keine Liste ist', () => {
    expect(fehler({})).toEqual(['-: Datei muss eine Liste (Array) von Formelgruppen enthalten']);
  });
});
