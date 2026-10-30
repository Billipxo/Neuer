import { describe, expect, it } from 'vitest';
import { ALLE_ABZEICHEN, MIN_FRAGEN_THEMA, baueAbzeichenKontext, neueAbzeichen } from './abzeichen';
import { STANDARD_PROFIL, THEMEN, neuerFortschritt, type Fortschritt, type Frage, type LernStatus, type ThemaId } from '../types';

const frage = (id: string, thema: ThemaId, typ: Frage['typ'] = 'einfach'): Frage => ({
  id, thema, typ, frage: id, antworten: typ === 'einfach' ? ['A', 'B'] : [], richtig: typ === 'einfach' ? [0] : 'M',
  erklaerung: 'E', quelle: 'Q', schwierigkeit: 1, bild: null, geprueft: false, stand: '2026-10',
});
const status = (id: string, s: LernStatus): Fortschritt => ({ ...neuerFortschritt(id), status: s });

/** n Fragen im Thema, davon `gelernt` gelernt */
function thema(t: ThemaId, n: number, gelernt: number) {
  const fragen = Array.from({ length: n }, (_, i) => frage(`${t}-${i}`, t));
  const fp = fragen.slice(0, gelernt).map((f) => status(f.id, 'gelernt'));
  return { fragen, fp };
}
const ids = (fragen: Frage[], fp: Fortschritt[], extra: Partial<typeof STANDARD_PROFIL> = {}, vorhanden: string[] = []) =>
  neueAbzeichen(baueAbzeichenKontext(fragen, new Map(fp.map((f) => [f.id, f])), { ...STANDARD_PROFIL, ...extra }, []), vorhanden).map((a) => a.id);

describe('Abzeichen', () => {
  it('drei Stufen je Thema plus weitere, alle IDs eindeutig', () => {
    expect(ALLE_ABZEICHEN.filter((a) => a.gruppe === 'thema')).toHaveLength(THEMEN.length * 3);
    expect(new Set(ALLE_ABZEICHEN.map((a) => a.id)).size).toBe(ALLE_ABZEICHEN.length);
  });

  it('Bronze ab 50 %, Silber ab 75 %, Gold ab 90 % gelernt', () => {
    const t = (gelernt: number) => { const { fragen, fp } = thema('recht', 10, gelernt); return ids(fragen, fp); };
    expect(t(4)).toEqual([]);
    expect(t(5)).toEqual(['thema-recht-bronze']);
    expect(t(8)).toEqual(['thema-recht-bronze', 'thema-recht-silber']);
    expect(t(9)).toEqual(['thema-recht-bronze', 'thema-recht-silber', 'thema-recht-gold']);
  });

  it(`kein Themen-Abzeichen bei weniger als ${MIN_FRAGEN_THEMA} Fragen`, () => {
    const { fragen, fp } = thema('sicherheit', MIN_FRAGEN_THEMA - 1, MIN_FRAGEN_THEMA - 1);
    expect(ids(fragen, fp)).toEqual([]);
  });

  it('bereits verdiente Abzeichen werden nicht erneut vergeben', () => {
    const { fragen, fp } = thema('recht', 10, 10);
    expect(ids(fragen, fp, {}, ['thema-recht-bronze', 'thema-recht-silber'])).toEqual(['thema-recht-gold']);
  });

  it('Fleiß: Lernserie, Tagesziel, Antwortserie', () => {
    const lernTage = { '2027-01-10': 5, '2027-01-11': 3, '2027-01-12': 9 };
    expect(ids([], [], { lernTage, zielErreichtTage: ['2027-01-12'], bestSerie: 10 })).toEqual(['serie-3', 'ziel-1', 'antworten-10']);
  });

  it('Fachgespräch-fit ab 90 % gelernter Karteikarten', () => {
    const karten = Array.from({ length: 10 }, (_, i) => frage(`k${i}`, 'recht', 'karte'));
    const fp = karten.slice(0, 9).map((f) => status(f.id, 'gelernt'));
    expect(ids(karten, fp)).toContain('fachgespraech');
    expect(ids(karten, fp.slice(1))).not.toContain('fachgespraech');
  });
});
