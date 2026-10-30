import { describe, expect, it } from 'vitest';
import { formularZuFrage, frageZuFormular, leeresFormular, naechsteEigeneId, typWechseln, type FrageFormular } from './editor';
import type { Frage } from '../types';

const JETZT = new Date(2026, 9, 11).getTime();
const formular = (f: Partial<FrageFormular>): FrageFormular => ({
  ...leeresFormular('recht', 'recht-e001', JETZT),
  frage: 'Wer führt das Installateurverzeichnis?',
  erklaerung: 'NAV § 13',
  quelle: 'NAV',
  ...f,
});

describe('IDs für eigene Fragen', () => {
  it('fortlaufend mit „e“, unabhängig von mitgelieferten IDs', () => {
    expect(naechsteEigeneId('recht', [])).toBe('recht-e001');
    expect(naechsteEigeneId('recht', ['recht-001', 'recht-002', 'recht-e001', 'recht-e009', 'tab-e050'])).toBe('recht-e010');
  });
});

describe('Formular → Frage', () => {
  it('leere Antwortfelder werden ignoriert, Haken mitgenommen', () => {
    const { frage, fehler } = formularZuFrage(
      formular({
        antworten: [
          { text: ' Der Netzbetreiber ', richtig: true },
          { text: '', richtig: false },
          { text: 'Die Handwerkskammer', richtig: false },
          { text: '   ', richtig: false },
        ],
      }),
    );
    expect(fehler).toEqual([]);
    expect(frage).toMatchObject({ id: 'recht-e001', typ: 'einfach', antworten: ['Der Netzbetreiber', 'Die Handwerkskammer'], richtig: [0], stand: '2026-10', geprueft: false });
    expect(frage).not.toHaveProperty('unterthema');
  });

  it('Mehrfachauswahl: Indizes passen nach dem Entfernen leerer Felder', () => {
    const { frage } = formularZuFrage(
      formular({
        typ: 'mehrfach',
        antworten: [
          { text: '', richtig: false },
          { text: 'A', richtig: true },
          { text: 'B', richtig: false },
          { text: 'C', richtig: true },
        ],
      }),
    );
    expect(frage).toMatchObject({ antworten: ['A', 'B', 'C'], richtig: [0, 2] });
  });

  it('meldet fehlende richtige Antwort, leere Pflichtfelder und angehakte leere Antwort', () => {
    const r = formularZuFrage(
      formular({ erklaerung: ' ', antworten: [{ text: 'A', richtig: false }, { text: 'B', richtig: false }, { text: '', richtig: true }] }),
    );
    expect(r.frage).toBeNull();
    expect(r.fehler).toEqual(expect.arrayContaining(['Keine richtige Antwort angegeben', 'Erklärung ist leer', 'Eine als richtig markierte Antwort ist leer']));
  });

  it('Rechenaufgabe mit Komma, Toleranz leer = 0', () => {
    const { frage } = formularZuFrage(formular({ typ: 'rechnen', wert: '2,875', einheit: 'Ω', toleranz: '' }));
    expect(frage).toMatchObject({ antworten: [], richtig: { wert: 2.875, einheit: 'Ω', toleranz: 0, toleranzArt: 'abs' } });
  });

  it('Rechenaufgabe ohne gültige Zahl', () => {
    const r = formularZuFrage(formular({ typ: 'rechnen', wert: 'abc', toleranz: '-1' }));
    expect(r.fehler).toEqual(['Lösung: bitte eine Zahl eingeben', 'Toleranz: bitte eine Zahl ab 0 eingeben']);
  });

  it('Karteikarte braucht eine Musterantwort', () => {
    expect(formularZuFrage(formular({ typ: 'karte', musterantwort: '' })).fehler).toContain('Karteikarte braucht eine Musterantwort in richtig');
    expect(formularZuFrage(formular({ typ: 'karte', musterantwort: 'Weil …', unterthema: ' NAV ' })).frage).toMatchObject({
      richtig: 'Weil …', antworten: [], unterthema: 'NAV',
    });
  });

  it('Typwechsel zu Einfachauswahl behält nur den ersten Haken', () => {
    const f = formular({ typ: 'mehrfach', antworten: [{ text: 'A', richtig: false }, { text: 'B', richtig: true }, { text: 'C', richtig: true }] });
    expect(typWechseln(f, 'einfach').antworten.map((a) => a.richtig)).toEqual([false, true, false]);
    expect(typWechseln(f, 'rechnen').antworten).toBe(f.antworten);
  });
});

describe('Frage → Formular → Frage', () => {
  const beispiele: Frage[] = [
    { id: 'schutz-001', thema: 'schutz', typ: 'mehrfach', frage: 'F?', antworten: ['A', 'B', 'C'], richtig: [0, 2], erklaerung: 'E', quelle: 'Q', schwierigkeit: 2, bild: null, geprueft: true, stand: '2026-10', unterthema: 'RCD' },
    { id: 'rechnen-001', thema: 'rechnen', typ: 'rechnen', frage: 'F?', antworten: [], richtig: { wert: 15.88, einheit: 'A', toleranz: 0.2, toleranzArt: 'abs' }, erklaerung: 'E', quelle: 'Q', schwierigkeit: 1, bild: 'bilder/x.svg', geprueft: false, stand: '2026-10' },
    { id: 'recht-k01', thema: 'recht', typ: 'karte', frage: 'F?', antworten: [], richtig: 'Muster', erklaerung: 'E', quelle: 'Q', schwierigkeit: 3, bild: null, geprueft: false, stand: '2026-10' },
  ];
  it.each(beispiele)('$id bleibt unverändert', (f) => {
    expect(formularZuFrage(frageZuFormular(f)).frage).toEqual(f);
  });
});
