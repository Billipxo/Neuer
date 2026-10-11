import { describe, expect, it } from 'vitest';
import { faelligkeit, istFaellig, naechsterFortschritt, tagesbeginn } from './leitner';
import { neuerFortschritt } from '../types';

// 15.01.2027, 14:30 Uhr lokale Zeit
const JETZT = new Date(2027, 0, 15, 14, 30).getTime();
const tag = (t: number) => new Date(2027, 0, 15 + t).getTime();

describe('Leitner-Status', () => {
  it('neu → 1× richtig (gelb) → gelernt (grün nach 2× in Folge)', () => {
    let f = neuerFortschritt('a');
    f = naechsterFortschritt(f, 'richtig', JETZT);
    expect(f).toMatchObject({ status: 'einmal', box: 2, richtigInFolge: 1, versuche: 1, richtigGesamt: 1 });
    f = naechsterFortschritt(f, 'richtig', JETZT);
    expect(f).toMatchObject({ status: 'gelernt', box: 3, richtigInFolge: 2 });
  });

  it('falsch → rot, Box 1, sofort wieder fällig', () => {
    const f = naechsterFortschritt(neuerFortschritt('a'), 'falsch', JETZT);
    expect(f).toMatchObject({ status: 'falsch', box: 1, richtigInFolge: 0, versuche: 1, richtigGesamt: 0 });
    expect(f.faelligAb).toBe(JETZT);
  });

  it('eine gelernte Frage wird nach einem Fehler wieder rot', () => {
    let f = neuerFortschritt('a');
    for (let i = 0; i < 4; i++) f = naechsterFortschritt(f, 'richtig', JETZT);
    expect(f).toMatchObject({ status: 'gelernt', box: 5 });
    f = naechsterFortschritt(f, 'falsch', JETZT);
    expect(f).toMatchObject({ status: 'falsch', box: 1, richtigInFolge: 0 });
  });

  it('nach falsch braucht es wieder 2× richtig in Folge', () => {
    let f = naechsterFortschritt(neuerFortschritt('a'), 'falsch', JETZT);
    f = naechsterFortschritt(f, 'richtig', JETZT);
    expect(f.status).toBe('einmal');
    f = naechsterFortschritt(f, 'falsch', JETZT);
    f = naechsterFortschritt(f, 'richtig', JETZT);
    expect(f.status).toBe('einmal');
    f = naechsterFortschritt(f, 'richtig', JETZT);
    expect(f.status).toBe('gelernt');
  });

  it('Box steigt höchstens bis 5', () => {
    let f = neuerFortschritt('a');
    for (let i = 0; i < 10; i++) f = naechsterFortschritt(f, 'richtig', JETZT);
    expect(f.box).toBe(5);
  });

  it('Karteikarte „teilweise“: gelb, Serie zurückgesetzt, morgen wieder', () => {
    let f = naechsterFortschritt(neuerFortschritt('a'), 'richtig', JETZT);
    f = naechsterFortschritt(f, 'richtig', JETZT);
    f = naechsterFortschritt(f, 'teilweise', JETZT);
    expect(f).toMatchObject({ status: 'einmal', box: 2, richtigInFolge: 0 });
    expect(f.faelligAb).toBe(tag(1));
  });
});

describe('Fälligkeit', () => {
  it('Intervalle 0 / 1 / 2 / 4 / 7 Tage, jeweils ab Tagesbeginn', () => {
    expect(faelligkeit(1, JETZT)).toBe(JETZT);
    expect(faelligkeit(2, JETZT)).toBe(tag(1));
    expect(faelligkeit(3, JETZT)).toBe(tag(2));
    expect(faelligkeit(4, JETZT)).toBe(tag(4));
    expect(faelligkeit(5, JETZT)).toBe(tag(7));
  });

  it('tagesbeginn liegt um Mitternacht', () => {
    const d = new Date(tagesbeginn(JETZT, 1));
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([16, 0, 0]);
  });

  it('neue Fragen sind nicht „fällig“, beantwortete nach Ablauf schon', () => {
    expect(istFaellig(neuerFortschritt('a'), JETZT)).toBe(false);
    expect(istFaellig(undefined, JETZT)).toBe(false);
    const f = naechsterFortschritt(neuerFortschritt('a'), 'richtig', JETZT);
    expect(istFaellig(f, JETZT)).toBe(false);
    expect(istFaellig(f, tag(1))).toBe(true);
  });
});
