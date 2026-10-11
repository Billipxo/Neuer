import { describe, expect, it } from 'vitest';
import { abzugleichendeFragen } from './abgleich';
import type { Frage, GespeicherteFrage } from '../types';

const f = (id: string, frage = 'Text'): Frage => ({
  id, thema: 'recht', typ: 'einfach', frage, antworten: ['A', 'B'], richtig: [0],
  erklaerung: 'E', quelle: 'Q', schwierigkeit: 1, bild: null, geprueft: false, stand: '2026-10',
});
const g = (frage: Frage, extra: Partial<GespeicherteFrage> = {}): GespeicherteFrage => ({
  ...frage, herkunft: 'mitgeliefert', bearbeitet: false, ...extra,
});

describe('abzugleichendeFragen', () => {
  it('übernimmt neue Fragen', () => {
    const r = abzugleichendeFragen([f('a')], new Map(), new Set());
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: 'a', herkunft: 'mitgeliefert', bearbeitet: false });
  });

  it('lässt unveränderte Fragen in Ruhe', () => {
    expect(abzugleichendeFragen([f('a')], new Map([['a', g(f('a'))]]), new Set())).toEqual([]);
  });

  it('aktualisiert unbearbeitete Fragen, wenn sich die Datei geändert hat', () => {
    const r = abzugleichendeFragen([f('a', 'Neu')], new Map([['a', g(f('a', 'Alt'))]]), new Set());
    expect(r[0].frage).toBe('Neu');
  });

  it('überschreibt keine in der App bearbeiteten Fragen', () => {
    const vorhanden = new Map([['a', g(f('a', 'Meins'), { bearbeitet: true })]]);
    expect(abzugleichendeFragen([f('a', 'Datei')], vorhanden, new Set())).toEqual([]);
  });

  it('holt gelöschte Fragen nicht zurück', () => {
    expect(abzugleichendeFragen([f('a')], new Map(), new Set(['a']))).toEqual([]);
  });
});
