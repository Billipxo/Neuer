import { describe, expect, it } from 'vitest';
import { bewerteAuswahl, bewerteRechnung, erlaubteAbweichung, formatToleranz, formatZahl, parseZahl } from './bewertung';
import type { RechenLoesung } from '../types';

describe('bewerteAuswahl', () => {
  it('Einfachauswahl: nur die richtige zählt', () => {
    expect(bewerteAuswahl([1], [1])).toBe(true);
    expect(bewerteAuswahl([1], [0])).toBe(false);
    expect(bewerteAuswahl([1], [])).toBe(false);
  });

  it('Mehrfachauswahl: nur ganz richtig zählt', () => {
    expect(bewerteAuswahl([0, 1, 3], [3, 0, 1])).toBe(true);
    expect(bewerteAuswahl([0, 1, 3], [0, 1])).toBe(false); // eine fehlt
    expect(bewerteAuswahl([0, 1, 3], [0, 1, 2, 3])).toBe(false); // eine zu viel
    expect(bewerteAuswahl([0, 1, 3], [0, 1, 2])).toBe(false); // vertauscht
    expect(bewerteAuswahl([0, 1], [0, 0, 1])).toBe(true); // doppelte Klicks stören nicht
  });
});

describe('parseZahl', () => {
  it.each([
    ['15,88', 15.88],
    ['15.88', 15.88],
    [' 2,875 ', 2.875],
    ['1840', 1840],
    ['11 000', 11000],
    ['1.234,5', 1234.5],
    ['1,234.5', 1234.5],
    ['15,9 A', 15.9],
    ['2,875Ω', 2.875],
    ['4,1 %', 4.1],
    ['-3,5', -3.5],
    ['−3,5', -3.5],
    [',5', 0.5],
    ['7,', 7],
  ])('%s → %s', (eingabe, erwartet) => {
    expect(parseZahl(eingabe)).toBeCloseTo(erwartet, 10);
  });

  it.each(['', 'abc', '1,2,3', '-', '1..2', 'A15'])('„%s“ ist keine Zahl', (eingabe) => {
    expect(parseZahl(eingabe)).toBeNull();
  });
});

describe('bewerteRechnung', () => {
  const abs: RechenLoesung = { wert: 15.88, einheit: 'A', toleranz: 0.2, toleranzArt: 'abs' };
  const rel: RechenLoesung = { wert: 200, einheit: 'V', toleranz: 2, toleranzArt: 'rel' };

  it('absolute Toleranz inkl. Grenzen', () => {
    expect(bewerteRechnung(abs, 15.88)).toBe(true);
    expect(bewerteRechnung(abs, 15.68)).toBe(true);
    expect(bewerteRechnung(abs, 16.08)).toBe(true);
    expect(bewerteRechnung(abs, 16.09)).toBe(false);
    expect(bewerteRechnung(abs, 15.6)).toBe(false);
  });

  it('relative Toleranz in Prozent', () => {
    expect(erlaubteAbweichung(rel)).toBe(4);
    expect(bewerteRechnung(rel, 204)).toBe(true);
    expect(bewerteRechnung(rel, 196)).toBe(true);
    expect(bewerteRechnung(rel, 204.1)).toBe(false);
  });

  it('Toleranz 0 verlangt den exakten Wert', () => {
    const exakt: RechenLoesung = { wert: 0.1 + 0.2, einheit: '', toleranz: 0, toleranzArt: 'abs' };
    expect(bewerteRechnung(exakt, 0.3)).toBe(true);
    expect(bewerteRechnung(exakt, 0.31)).toBe(false);
  });

  it('formatiert deutsch', () => {
    expect(formatZahl(2.875)).toBe('2,875');
    expect(formatZahl(1840)).toBe('1840');
    expect(formatZahl(15.8771234)).toBe('15,8771');
    expect(formatToleranz(abs)).toBe('± 0,2 A');
    expect(formatToleranz(rel)).toBe('± 2 %');
  });
});
