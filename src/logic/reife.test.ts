import { describe, expect, it } from 'vitest';
import { countdownText, pruefungsreife, tagespensum, themaReife } from './reife';
import { neuerFortschritt, type Fortschritt, type Frage, type LernStatus, type SimulationErgebnis, type ThemaId } from '../types';

const frage = (id: string, thema: ThemaId): Frage => ({
  id, thema, typ: 'einfach', frage: id, antworten: ['A', 'B'], richtig: [0], erklaerung: 'E', quelle: 'Q',
  schwierigkeit: 1, bild: null, geprueft: false, stand: '2026-10',
});
const fp = (id: string, s: LernStatus): Fortschritt => ({ ...neuerFortschritt(id), status: s });
const sim = (prozent: number, datum: number): SimulationErgebnis => ({
  datum, prozent, einstellungen: { anzahl: 30, minuten: 60, bestehensgrenze: 70 }, dauerSek: 1, anzahl: 30,
  richtig: 0, bestanden: prozent >= 70, unbeantwortet: 0, jeThema: {}, falscheIds: [], details: [],
});

describe('Prüfungsreife', () => {
  it('gelernt zählt voll, 1× richtig halb', () => {
    expect(themaReife({ gesamt: 4, neu: 1, falsch: 0, einmal: 2, gelernt: 1 })).toBe(0.5);
    expect(themaReife({ gesamt: 0, neu: 0, falsch: 0, einmal: 0, gelernt: 0 })).toBe(0);
  });

  it('jedes Thema zählt gleich, leere Themen zählen nicht', () => {
    // Recht: 1 von 1 gelernt (100 %), Schutz: 0 von 3 (0 %) → Ø 50 %
    const fragen = [frage('r1', 'recht'), frage('s1', 'schutz'), frage('s2', 'schutz'), frage('s3', 'schutz')];
    const r = pruefungsreife(fragen, new Map([['r1', fp('r1', 'gelernt')]]), []);
    expect(r.lernen).toBe(50);
    expect(r.themen.map((t) => t.id)).toEqual(['recht', 'schutz']);
    expect(r.schwaechstes?.id).toBe('schutz');
    // ohne Simulation höchstens 90 % des Lernstands
    expect(r.prozent).toBe(45);
    expect(r.simulation).toBeNull();
  });

  it('mit Simulationen: 60 % Lernstand + 40 % Ø der letzten drei', () => {
    const fragen = [frage('r1', 'recht')];
    const lernAlles = new Map([['r1', fp('r1', 'gelernt')]]);
    const sims = [sim(10, 1), sim(60, 2), sim(70, 3), sim(80, 4)]; // die älteste (10 %) zählt nicht
    const r = pruefungsreife(fragen, lernAlles, sims);
    expect(r.simulation).toBe(70);
    expect(r.prozent).toBe(88); // 0,6·100 + 0,4·70
  });
});

describe('Tagespensum', () => {
  const v = (neu: number, falsch = 0, einmal = 0, gelernt = 0) => ({ gesamt: neu + falsch + einmal + gelernt, neu, falsch, einmal, gelernt });

  it('verteilt offene Fragen auf die Tage bis eine Woche vor der Prüfung', () => {
    // 100 neue → 250 Antworten, 57 Tage → 50 Lerntage → 5 pro Tag
    expect(tagespensum(v(100), 57)).toBe(5);
    // 200 neue + 40 gelbe → 560 Antworten, 27 Tage → 20 Lerntage → 28
    expect(tagespensum(v(200, 0, 40), 27)).toBe(28);
  });

  it('mindestens 5 pro Tag, aber nie mehr als offen; in der letzten Woche ohne Puffer', () => {
    expect(tagespensum(v(10), 100)).toBe(5);
    expect(tagespensum(v(1), 100)).toBe(3);
    expect(tagespensum(v(0, 0, 0, 50), 30)).toBe(0);
    expect(tagespensum(v(20), 5)).toBe(10);
  });

  it('am Prüfungstag und danach kein Pensum', () => {
    expect(tagespensum(v(10), 0)).toBeNull();
    expect(tagespensum(v(10), -3)).toBeNull();
  });

  it('Countdown-Text', () => {
    expect(countdownText(111)).toBe('Noch 111 Tage');
    expect(countdownText(1)).toBe('Morgen ist Prüfung!');
    expect(countdownText(0)).toBe('Heute ist Prüfung – viel Erfolg!');
    expect(countdownText(-1)).toBe('Prüfung vorbei');
  });
});
