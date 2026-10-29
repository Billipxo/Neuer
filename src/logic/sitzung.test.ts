import { describe, expect, it } from 'vitest';
import { antwortReihenfolge, mischen, statusVerteilung, waehleFragen, wiederEinreihen } from './sitzung';
import { naechsterFortschritt } from './leitner';
import { neuerFortschritt, type Fortschritt, type Frage, type ThemaId } from '../types';

const JETZT = new Date(2027, 0, 15, 12).getTime();
const GESTERN = JETZT - 86_400_000;
const frage = (id: string, thema: ThemaId = 'recht', extra: Partial<Frage> = {}): Frage => ({
  id, thema, typ: 'einfach', frage: id, antworten: ['A', 'B'], richtig: [0], erklaerung: 'E',
  quelle: 'Q', schwierigkeit: 1, bild: null, geprueft: false, stand: '2026-10', ...extra,
});
const fp = (id: string, ergebnisse: ('richtig' | 'falsch')[], zeit = JETZT, extra: Partial<Fortschritt> = {}) => {
  let f = neuerFortschritt(id);
  for (const e of ergebnisse) f = naechsterFortschritt(f, e, zeit);
  return { ...f, ...extra };
};
const map = (...l: Fortschritt[]) => new Map(l.map((f) => [f.id, f]));

describe('waehleFragen', () => {
  const fragen = [frage('neu1'), frage('rot'), frage('gelb'), frage('gruen'), frage('tab1', 'tab'), frage('karte', 'recht', { typ: 'karte', antworten: [], richtig: 'M' })];
  const fortschritte = map(
    fp('rot', ['falsch']),
    fp('gelb', ['richtig'], GESTERN - 86_400_000), // fällig
    fp('gruen', ['richtig', 'richtig']), // nicht fällig
  );

  it('empfohlen: fällige falsche zuerst, dann fällige gelbe, dann neue, dann nicht fällige', () => {
    const ids = waehleFragen(fragen, fortschritte, { thema: 'recht', modus: 'empfohlen' }, JETZT).map((f) => f.id);
    expect(ids.slice(0, 2)).toEqual(['rot', 'gelb']);
    expect(ids.slice(2, 4).sort()).toEqual(['karte', 'neu1']);
    expect(ids[4]).toBe('gruen');
    expect(ids).not.toContain('tab1');
  });

  it('filtert nach Modus', () => {
    const ids = (modus: Parameters<typeof waehleFragen>[2]['modus']) =>
      waehleFragen(fragen, fortschritte, { thema: 'alle', modus }, JETZT).map((f) => f.id).sort();
    expect(ids('neu')).toEqual(['karte', 'neu1', 'tab1']);
    expect(ids('falsch')).toEqual(['rot']);
    expect(ids('karten')).toEqual(['karte']);
    expect(ids('faellig')).toEqual(['gelb', 'rot']);
  });

  it('markierte und nur geprüfte', () => {
    const f2 = map(fp('neu1', [], JETZT, { markiert: true }));
    expect(waehleFragen(fragen, f2, { thema: 'alle', modus: 'markiert' }).map((f) => f.id)).toEqual(['neu1']);
    const mitGeprueft = [...fragen, frage('ok', 'recht', { geprueft: true })];
    expect(waehleFragen(mitGeprueft, new Map(), { thema: 'alle', modus: 'empfohlen', nurGeprueft: true }).map((f) => f.id)).toEqual(['ok']);
  });

  it('begrenzt die Anzahl', () => {
    expect(waehleFragen(fragen, fortschritte, { thema: 'alle', modus: 'empfohlen', limit: 3 })).toHaveLength(3);
  });

  it('filtert nach Themenbereich (Thema und Unterthema)', () => {
    const mitUnterthema = [
      frage('nav1', 'recht', { unterthema: 'NAV' }),
      frage('nav2', 'recht', { unterthema: 'NAV' }),
      frage('enwg', 'recht', { unterthema: 'EnWG' }),
      frage('fremd', 'tab', { unterthema: 'NAV' }),
      ...fragen,
    ];
    const bereich = { thema: 'recht' as const, unterthemen: ['NAV'] };
    const ids = waehleFragen(mitUnterthema, new Map(), { thema: 'recht', bereich, modus: 'empfohlen' }).map((f) => f.id);
    expect(ids.sort()).toEqual(['nav1', 'nav2']);
    const falsch = map(fp('nav2', ['falsch']));
    expect(waehleFragen(mitUnterthema, falsch, { thema: 'recht', bereich, modus: 'falsch' }).map((f) => f.id)).toEqual(['nav2']);
  });
});

describe('Hilfsfunktionen', () => {
  it('wiederEinreihen fügt ein paar Plätze später ein', () => {
    expect(wiederEinreihen(['a', 'b', 'c', 'd', 'e', 'f'], 0, 'a', 3)).toEqual(['a', 'b', 'c', 'd', 'a', 'e', 'f']);
    expect(wiederEinreihen(['a', 'b'], 1, 'b', 3)).toEqual(['a', 'b', 'b']);
  });

  it('mischen behält alle Elemente', () => {
    expect(mischen([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(antwortReihenfolge(4, false)).toEqual([0, 1, 2, 3]);
    expect(antwortReihenfolge(4, true).sort()).toEqual([0, 1, 2, 3]);
  });

  it('statusVerteilung zählt die Ampel', () => {
    const fragen = [frage('a'), frage('b'), frage('c')];
    expect(statusVerteilung(fragen, map(fp('a', ['falsch']), fp('b', ['richtig', 'richtig'])))).toEqual({
      gesamt: 3, neu: 1, falsch: 1, einmal: 0, gelernt: 1,
    });
  });
});
