import { describe, expect, it } from 'vitest';
import { bereichVonFrage, bereicheVon, fragenIm, gehoertZu } from './bereiche';
import type { Bereich, Frage, ThemaId } from '../types';

const frage = (id: string, thema: ThemaId, unterthema?: string): Frage => ({
  id, thema, typ: 'einfach', frage: id, antworten: ['A', 'B'], richtig: [0], erklaerung: 'E',
  quelle: 'Q', schwierigkeit: 1, bild: null, geprueft: false, stand: '2026-10', ...(unterthema ? { unterthema } : {}),
});
const bereich = (id: string, thema: ThemaId, unterthemen: string[]): Bereich => ({
  id, thema, titel: id, kurz: 'k', unterthemen, erklaerung: [{ titel: 'T', text: 'x' }], quelle: 'Q', stand: '2026-10',
});

const nav = bereich('recht-nav', 'recht', ['NAV']);
const grundlagen = bereich('recht-grundlagen', 'recht', ['EnWG', 'Begriffe']);
const fall = bereich('rechnen-fall', 'rechnen', ['Spannungsfall']);
const alle = [nav, grundlagen, fall];

describe('Themenbereiche', () => {
  it('eine Frage gehört dazu, wenn Thema und Unterthema passen', () => {
    expect(gehoertZu(frage('a', 'recht', 'NAV'), nav)).toBe(true);
    expect(gehoertZu(frage('b', 'recht', 'EnWG'), nav)).toBe(false);
    expect(gehoertZu(frage('c', 'recht'), nav)).toBe(false);
  });

  it('gleiches Unterthema in einem anderen Thema zählt nicht', () => {
    expect(gehoertZu(frage('d', 'hausanschluss', 'Spannungsfall'), fall)).toBe(false);
    expect(gehoertZu(frage('e', 'rechnen', 'Spannungsfall'), fall)).toBe(true);
  });

  it('findet Bereiche eines Themas, den Bereich einer Frage und die Fragen eines Bereichs', () => {
    expect(bereicheVon(alle, 'recht').map((b) => b.id)).toEqual(['recht-nav', 'recht-grundlagen']);
    expect(bereichVonFrage(alle, frage('f', 'recht', 'Begriffe'))?.id).toBe('recht-grundlagen');
    expect(bereichVonFrage(alle, frage('g', 'recht', 'Unbekannt'))).toBeUndefined();
    const fragen = [frage('h', 'recht', 'NAV'), frage('i', 'recht', 'EnWG'), frage('j', 'recht', 'NAV')];
    expect(fragenIm(fragen, nav).map((f) => f.id)).toEqual(['h', 'j']);
  });
});
