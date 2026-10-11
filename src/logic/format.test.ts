import { describe, expect, it } from 'vitest';
import { tageZwischen } from './datum';
import { formatFaelligkeit } from './format';
import { naechsterFortschritt } from './leitner';
import { neuerFortschritt } from '../types';

const JETZT = new Date(2027, 0, 15, 14, 30).getTime();
const am = (tag: number, std = 0) => new Date(2027, 0, tag, std).getTime();

describe('Fälligkeit als Text', () => {
  it('neu, jetzt, morgen, übermorgen, in n Tagen', () => {
    expect(formatFaelligkeit(undefined, JETZT)).toBe('noch nicht beantwortet');
    expect(formatFaelligkeit(neuerFortschritt('a'), JETZT)).toBe('noch nicht beantwortet');
    const falsch = naechsterFortschritt(neuerFortschritt('a'), 'falsch', JETZT);
    expect(formatFaelligkeit(falsch, JETZT)).toBe('jetzt fällig');
    const einmal = naechsterFortschritt(neuerFortschritt('a'), 'richtig', JETZT);
    expect(formatFaelligkeit(einmal, JETZT)).toBe('morgen fällig');
    const zweimal = naechsterFortschritt(einmal, 'richtig', JETZT);
    expect(formatFaelligkeit(zweimal, JETZT)).toBe('übermorgen fällig');
    expect(formatFaelligkeit({ ...zweimal, faelligAb: am(22) }, JETZT)).toMatch(/^fällig in 7 Tagen \(/);
  });

  it('zählt Kalendertage, nicht 24-Stunden-Blöcke', () => {
    expect(tageZwischen(am(15, 23), am(16, 1))).toBe(1);
    expect(tageZwischen(am(15, 1), am(15, 23))).toBe(0);
    // über die Zeitumstellung Ende März hinweg
    expect(tageZwischen(new Date(2027, 2, 27).getTime(), new Date(2027, 2, 29).getTime())).toBe(2);
  });
});
