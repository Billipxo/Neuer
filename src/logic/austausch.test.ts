import { describe, expect, it } from 'vitest';
import { dateinameMitDatum, fragenAlsJson, planeImport, pruefeSicherung, SICHERUNG_APP } from './austausch';
import { STANDARD_PROFIL, type Frage } from '../types';

const frage = (id: string, extra: Partial<Frage> = {}): Frage => ({
  id, thema: 'recht', typ: 'einfach', frage: `Frage ${id}`, antworten: ['A', 'B'], richtig: [0], erklaerung: 'E',
  quelle: 'Q', schwierigkeit: 1, bild: null, geprueft: false, stand: '2026-10', ...extra,
});

describe('Export', () => {
  it('ohne App-Felder, im Format der Projektdateien', () => {
    const json = fragenAlsJson([{ ...frage('a'), herkunft: 'eigen', bearbeitet: true } as Frage]);
    const zurueck = JSON.parse(json);
    expect(zurueck).toEqual([frage('a')]);
    expect(json).not.toContain('herkunft');
    expect(Object.keys(zurueck[0])).toEqual(['id', 'thema', 'typ', 'frage', 'antworten', 'richtig', 'erklaerung', 'quelle', 'schwierigkeit', 'bild', 'geprueft', 'stand']);
  });
});

describe('Import', () => {
  const vorhanden = new Map([
    ['a', frage('a')],
    ['b', frage('b')],
  ]);

  it('unterscheidet neu, geändert, gleich und fehlerhaft', () => {
    const plan = planeImport([frage('a'), frage('b', { frage: 'geändert' }), frage('c'), { id: 'kaputt', thema: 'recht' }], vorhanden);
    expect(plan.neu.map((f) => f.id)).toEqual(['c']);
    expect(plan.geaendert.map((f) => f.id)).toEqual(['b']);
    expect(plan.gleich).toBe(1);
    expect(plan.fehlerhaft).toHaveLength(1);
    expect(plan.fehlerhaft[0]).toMatchObject({ nr: 4, id: 'kaputt' });
  });

  it('nimmt auch Sicherungen und einzelne Fragen, entfernt App-Felder', () => {
    expect(planeImport({ fragen: [{ ...frage('x'), herkunft: 'eigen', bearbeitet: true }] }, vorhanden).neu).toEqual([frage('x')]);
    expect(planeImport(frage('y'), vorhanden).neu.map((f) => f.id)).toEqual(['y']);
  });

  it('meldet doppelte IDs in der Datei und leere Dateien', () => {
    expect(planeImport([frage('z'), frage('z')], vorhanden).fehlerhaft[0].fehler).toContain('ID kommt in der Datei mehrfach vor');
    expect(planeImport([], vorhanden).fehlerhaft[0].fehler).toEqual(['Keine Fragen in der Datei gefunden']);
    expect(planeImport('Unsinn', vorhanden).fehlerhaft).toHaveLength(1);
  });
});

describe('Sicherung', () => {
  const gueltig = {
    app: SICHERUNG_APP, version: 1, erstellt: '2026-10-11T10:00:00.000Z', profil: STANDARD_PROFIL,
    fortschritte: [], simulationen: [], fragen: [{ ...frage('e1'), herkunft: 'eigen', bearbeitet: true }], geloescht: ['recht-002'],
    laufendeSimulation: null,
  };

  it('akzeptiert gültige Sicherungen', () => {
    const r = pruefeSicherung(gueltig);
    expect(r.fehler).toBeNull();
    expect(r.sicherung?.geloescht).toEqual(['recht-002']);
  });

  it('lehnt fremde, neuere, unvollständige oder kaputte Dateien ab', () => {
    expect(pruefeSicherung(null).fehler).toMatch(/Keine gültige/);
    expect(pruefeSicherung([frage('a')]).fehler).toMatch(/keine Sicherung/);
    expect(pruefeSicherung({ ...gueltig, version: 99 }).fehler).toMatch(/neueren/);
    expect(pruefeSicherung({ ...gueltig, fortschritte: undefined }).fehler).toMatch(/unvollständig/);
    expect(pruefeSicherung({ ...gueltig, fragen: [{ id: 'x' }] }).fehler).toMatch(/Fehlerhafte Frage/);
    expect(pruefeSicherung({ ...gueltig, fragen: [null] }).fehler).toMatch(/Fehlerhafte Frage/);
  });

  it('Dateiname mit Datum', () => {
    expect(dateinameMitDatum('trei-lernstand', new Date(2026, 9, 11).getTime())).toBe('trei-lernstand-2026-10-11.json');
  });
});
