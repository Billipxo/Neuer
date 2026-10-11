import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  XP_TAGESZIEL,
  kalenderStufe,
  kalenderWochen,
  laengsteSerie,
  lernserie,
  levelFuerXp,
  levelStand,
  serienBonus,
  verarbeiteAntwort,
  xpFuerAntwort,
} from './motivation';
import { naechsterFortschritt } from './leitner';
import { STANDARD_PROFIL, neuerFortschritt, type Profil } from '../types';

const JETZT = new Date(2027, 0, 15, 14, 30).getTime();
const GESTERN = new Date(2027, 0, 14, 20, 0).getTime();

describe('XP', () => {
  it('10 XP je Schwierigkeitsstern bei richtiger Antwort', () => {
    for (const s of [1, 2, 3] as const) {
      expect(xpFuerAntwort({ schwierigkeit: s, ergebnis: 'richtig', serie: 1, heuteSchonRichtig: false }).gesamt).toBe(10 * s);
    }
  });

  it('falsch gibt 0 XP, Karteikarte „teilweise“ die Hälfte ohne Serienbonus', () => {
    expect(xpFuerAntwort({ schwierigkeit: 3, ergebnis: 'falsch', serie: 0, heuteSchonRichtig: false }).gesamt).toBe(0);
    expect(xpFuerAntwort({ schwierigkeit: 2, ergebnis: 'teilweise', serie: 9, heuteSchonRichtig: false })).toEqual({
      basis: 10, serienBonus: 0, gesamt: 10, gedrosselt: false,
    });
  });

  it('Serienbonus: +5 ab 3, +10 ab 6, höchstens +15', () => {
    expect([0, 1, 2, 3, 5, 6, 8, 9, 20, 100].map(serienBonus)).toEqual([0, 0, 0, 5, 5, 10, 10, 15, 15, 15]);
    expect(xpFuerAntwort({ schwierigkeit: 2, ergebnis: 'richtig', serie: 6, heuteSchonRichtig: false })).toEqual({
      basis: 20, serienBonus: 10, gesamt: 30, gedrosselt: false,
    });
  });

  it('heute schon richtig beantwortete Frage bringt nur 2 XP', () => {
    expect(xpFuerAntwort({ schwierigkeit: 3, ergebnis: 'richtig', serie: 9, heuteSchonRichtig: true })).toEqual({
      basis: 2, serienBonus: 0, gesamt: 2, gedrosselt: true,
    });
  });
});

describe('Level', () => {
  it('sieben Stufen von Azubi bis Installateurverzeichnis', () => {
    expect(LEVELS.map((l) => l.titel)).toEqual([
      'Azubi', 'Geselle', 'Vorarbeiter', 'Bauleiter', 'Zählerplatz-Profi', 'Netzanschluss-Experte',
      'Eingetragen ins Installateurverzeichnis',
    ]);
    // Schwellen steigen streng
    LEVELS.slice(1).forEach((l, i) => expect(l.abXp).toBeGreaterThan(LEVELS[i].abXp));
  });

  it('Grenzen gehören zum höheren Level', () => {
    expect(levelFuerXp(0).titel).toBe('Azubi');
    expect(levelFuerXp(299).titel).toBe('Azubi');
    expect(levelFuerXp(300).titel).toBe('Geselle');
    expect(levelFuerXp(14999).nr).toBe(6);
    expect(levelFuerXp(15000).nr).toBe(7);
    expect(levelFuerXp(999999).nr).toBe(7);
  });

  it('Fortschritt im Level', () => {
    expect(levelStand(750)).toMatchObject({ imLevel: 450, fehlen: 450, anteil: 0.5 });
    expect(levelStand(750).naechstes?.titel).toBe('Vorarbeiter');
    expect(levelStand(20000)).toMatchObject({ naechstes: null, fehlen: 0, anteil: 1 });
  });
});

describe('verarbeiteAntwort', () => {
  const profil = (p: Partial<Profil> = {}): Profil => ({ ...STANDARD_PROFIL, ...p });
  const frisch = neuerFortschritt('a');

  it('bucht XP, Antwortserie und Lerntag', () => {
    const { profil: p, ereignis } = verarbeiteAntwort({ profil: profil({ serieAktuell: 2 }), schwierigkeit: 2, vorher: frisch, ergebnis: 'richtig', jetzt: JETZT });
    expect(ereignis.serie).toBe(3);
    expect(ereignis.xp).toMatchObject({ basis: 20, serienBonus: 5 });
    expect(p).toMatchObject({ xp: 25, serieAktuell: 3, bestSerie: 3, lernTage: { '2027-01-15': 1 } });
  });

  it('falsche Antwort setzt die Serie zurück, bestSerie bleibt', () => {
    const { profil: p } = verarbeiteAntwort({ profil: profil({ serieAktuell: 7, bestSerie: 7 }), schwierigkeit: 1, vorher: frisch, ergebnis: 'falsch', jetzt: JETZT });
    expect(p).toMatchObject({ serieAktuell: 0, bestSerie: 7, xp: 0 });
  });

  it('Tagesziel-Bonus genau einmal pro Tag', () => {
    let p = profil({ tagesziel: 2 });
    const xpListe: number[] = [];
    const ziel: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const r = verarbeiteAntwort({ profil: p, schwierigkeit: 1, vorher: frisch, ergebnis: 'falsch', jetzt: JETZT });
      p = r.profil;
      xpListe.push(r.ereignis.xpGesamt);
      ziel.push(r.ereignis.tageszielErreicht);
    }
    expect(ziel).toEqual([false, true, false, false]);
    expect(xpListe).toEqual([0, XP_TAGESZIEL, 0, 0]);
    expect(p.zielErreichtTage).toEqual(['2027-01-15']);
    expect(p.lernTage['2027-01-15']).toBe(4);
  });

  it('erkennt den Level-Aufstieg', () => {
    const r = verarbeiteAntwort({ profil: profil({ xp: 290 }), schwierigkeit: 1, vorher: frisch, ergebnis: 'richtig', jetzt: JETZT });
    expect(r.ereignis).toMatchObject({ aufstieg: true });
    expect(r.ereignis.levelNachher.titel).toBe('Geselle');
    const r2 = verarbeiteAntwort({ profil: profil({ xp: 100 }), schwierigkeit: 1, vorher: frisch, ergebnis: 'richtig', jetzt: JETZT });
    expect(r2.ereignis.aufstieg).toBe(false);
  });

  it('drosselt XP, wenn die Frage heute schon richtig beantwortet wurde, nicht aber von gestern', () => {
    const heuteRichtig = naechsterFortschritt(frisch, 'richtig', JETZT - 60_000);
    const gesternRichtig = naechsterFortschritt(frisch, 'richtig', GESTERN);
    const heuteFalsch = naechsterFortschritt(frisch, 'falsch', JETZT - 60_000);
    const xp = (vorher: typeof frisch) =>
      verarbeiteAntwort({ profil: profil(), schwierigkeit: 3, vorher, ergebnis: 'richtig', jetzt: JETZT }).ereignis.xp.gesamt;
    expect(xp(heuteRichtig)).toBe(2);
    expect(xp(gesternRichtig)).toBe(30);
    expect(xp(heuteFalsch)).toBe(30); // erst falsch, jetzt richtig → volle XP
  });
});

describe('Lernserie in Tagen', () => {
  const tage = (...k: string[]) => Object.fromEntries(k.map((x) => [x, 3]));

  it('zählt aufeinanderfolgende Tage bis heute', () => {
    expect(lernserie(tage('2027-01-13', '2027-01-14', '2027-01-15'), JETZT)).toEqual({ tage: 3, heuteGelernt: true });
  });

  it('heute noch nicht gelernt: Serie bis gestern bleibt bestehen', () => {
    expect(lernserie(tage('2027-01-13', '2027-01-14'), JETZT)).toEqual({ tage: 2, heuteGelernt: false });
  });

  it('eine Lücke beendet die Serie', () => {
    expect(lernserie(tage('2027-01-11', '2027-01-12', '2027-01-14', '2027-01-15'), JETZT).tage).toBe(2);
    expect(lernserie(tage('2027-01-12', '2027-01-13'), JETZT).tage).toBe(0);
    expect(lernserie({}, JETZT)).toEqual({ tage: 0, heuteGelernt: false });
  });

  it('über Monatswechsel und Zeitumstellung', () => {
    const jetzt = new Date(2027, 2, 29, 10).getTime(); // Montag nach Umstellung auf Sommerzeit
    expect(lernserie(tage('2027-03-27', '2027-03-28', '2027-03-29'), jetzt).tage).toBe(3);
    expect(laengsteSerie(tage('2027-01-30', '2027-01-31', '2027-02-01', '2027-02-03'))).toBe(3);
  });

  it('längste Serie', () => {
    expect(laengsteSerie(tage('2027-01-01', '2027-01-02', '2027-01-05', '2027-01-06', '2027-01-07'))).toBe(3);
    expect(laengsteSerie({ '2027-01-01': 0 })).toBe(0);
  });
});

describe('Lernkalender', () => {
  it('Farbstufen relativ zum Tagesziel', () => {
    expect([0, 1, 9, 10, 19, 20, 50].map((n) => kalenderStufe(n, 20))).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });

  it('5 Wochen Mo–So bis zur aktuellen Woche, Zukunft markiert', () => {
    // Freitag, 15.01.2027
    const w = kalenderWochen(JETZT, 5);
    expect(w).toHaveLength(5);
    expect(w.every((woche) => woche.length === 7)).toBe(true);
    expect(w[0][0].schluessel).toBe('2026-12-14'); // Montag vier Wochen vorher
    expect(w[4][0].schluessel).toBe('2027-01-11'); // Montag dieser Woche
    expect(w[4][4]).toEqual({ schluessel: '2027-01-15', zukunft: false });
    expect(w[4][5]).toEqual({ schluessel: '2027-01-16', zukunft: true });
    // Sonntag als „jetzt“: aktuelle Woche endet heute
    const sonntag = new Date(2027, 0, 17, 9).getTime();
    expect(kalenderWochen(sonntag, 1)[0].map((t) => t.schluessel)).toEqual([
      '2027-01-11', '2027-01-12', '2027-01-13', '2027-01-14', '2027-01-15', '2027-01-16', '2027-01-17',
    ]);
  });
});
