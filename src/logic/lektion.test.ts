import { describe, expect, it } from 'vitest';
import { lektionsSchritte, lektionsUmfang, naechsteLektion, seitenGroessen } from './lektion';
import type { Verstaendnisfrage } from '../types';

const frage = (abschnitt: number, punkt: number | undefined, text: string): Verstaendnisfrage => ({
  abschnitt,
  ...(punkt === undefined ? {} : { punkt }),
  frage: text,
  antworten: ['ja', 'nein'],
  richtig: 0,
  erklaerung: 'weil',
});

const erklaerung = [
  { titel: 'Worum geht es?', text: 'Einleitung' },
  { titel: 'Das Wichtigste', punkte: ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'] },
  { titel: 'Merke', text: 'Kurz gesagt', punkte: ['m0'] },
];

/** Schritte als kurze Zeichenkette: Seiten mit ihren Stichpunkten, Fragen mit ihrem Text */
const kurz = (verstaendnis: Verstaendnisfrage[]) =>
  lektionsSchritte({ erklaerung, verstaendnis }).map((s) =>
    s.art === 'seite' ? `${s.titel} ${s.teil}/${s.teile}${s.text ? ` „${s.text}“` : ''} [${s.punkte.join(',')}]` : `? ${s.frage.frage}`,
  );

describe('Lektion', () => {
  it('verteilt Stichpunkte gleichmäßig auf Seiten mit höchstens drei', () => {
    expect(seitenGroessen(0)).toEqual([0]);
    expect(seitenGroessen(2)).toEqual([2]);
    expect(seitenGroessen(4)).toEqual([2, 2]);
    expect(seitenGroessen(5)).toEqual([3, 2]);
    expect(seitenGroessen(7)).toEqual([3, 2, 2]);
    expect(seitenGroessen(8)).toEqual([3, 3, 2]);
    expect(seitenGroessen(9)).toEqual([3, 3, 3]);
  });

  it('setzt jede Frage hinter die Seite mit ihrem Stichpunkt, ohne Stichpunkt hinter den Abschnitt', () => {
    expect(kurz([frage(1, 4, 'B'), frage(1, 0, 'A'), frage(0, undefined, 'Intro'), frage(2, undefined, 'Merke'), frage(1, 6, 'C')])).toEqual([
      'Worum geht es? 1/1 „Einleitung“ []',
      '? Intro',
      'Das Wichtigste 1/3 [p0,p1,p2]',
      '? A',
      'Das Wichtigste 2/3 [p3,p4]',
      '? B',
      'Das Wichtigste 3/3 [p5,p6]',
      '? C',
      'Merke 1/1 „Kurz gesagt“ [m0]',
      '? Merke',
    ]);
  });

  it('verliert keine Frage, auch wenn ihr Stichpunkt fehlt', () => {
    const schritte = kurz([frage(1, 9, 'verirrt'), frage(5, undefined, 'ohne Abschnitt')]);
    expect(schritte.slice(-2)).toEqual(['? verirrt', '? ohne Abschnitt']);
  });

  it('kommt ohne Verständnisfragen aus und nennt den Umfang', () => {
    expect(kurz([]).filter((s) => s.startsWith('?'))).toEqual([]);
    expect(lektionsUmfang({ erklaerung })).toEqual({ seiten: 5, fragen: 0 });
    expect(lektionsUmfang({ erklaerung, verstaendnis: [frage(1, 0, 'A'), frage(2, 0, 'B')] })).toEqual({ seiten: 5, fragen: 2 });
  });

  it('findet die nächste noch nicht abgeschlossene Lektion', () => {
    const bereiche = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(naechsteLektion(bereiche, {})?.id).toBe('a');
    expect(naechsteLektion(bereiche, { a: { richtig: 1 }, c: { richtig: 2 } })?.id).toBe('b');
    expect(naechsteLektion(bereiche, { a: 1, b: 1, c: 1 })).toBeUndefined();
  });
});
