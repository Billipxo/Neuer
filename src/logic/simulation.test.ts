import { describe, expect, it } from 'vitest';
import {
  formatDauer,
  formatRestzeit,
  istBeantwortet,
  istRichtig,
  restzeitMs,
  starteSimulation,
  waehleSimulationsFragen,
  werteSimulationAus,
} from './simulation';
import { verbucheSimulation, XP_SIMULATION_ABGESCHLOSSEN, XP_SIMULATION_BESTANDEN, XP_TAGESZIEL } from './motivation';
import { STANDARD_PROFIL, THEMA_IDS, type Frage, type LaufendeSimulation, type ThemaId } from '../types';

/** einfacher, reproduzierbarer Zufall */
function zufallAus(saat: number) {
  let x = saat;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

const auswahl = (id: string, thema: ThemaId, richtig = [0], typ: Frage['typ'] = 'einfach'): Frage => ({
  id, thema, typ, frage: id, antworten: ['A', 'B', 'C'], richtig, erklaerung: 'E', quelle: 'Q',
  schwierigkeit: 1, bild: null, geprueft: false, stand: '2026-10',
});
const rechnen = (id: string): Frage => ({
  ...auswahl(id, 'rechnen'), typ: 'rechnen', antworten: [], richtig: { wert: 2.875, einheit: 'Ω', toleranz: 0.02, toleranzArt: 'abs' },
});
const karte = (id: string, thema: ThemaId): Frage => ({ ...auswahl(id, thema), typ: 'karte', antworten: [], richtig: 'M' });

describe('Fragenauswahl', () => {
  // Recht 20 Fragen, Schutz 20, Erzeugung 2, plus Karteikarten
  const fragen = [
    ...Array.from({ length: 20 }, (_, i) => auswahl(`r${i}`, 'recht')),
    ...Array.from({ length: 20 }, (_, i) => auswahl(`s${i}`, 'schutz')),
    auswahl('e1', 'erzeugung'), auswahl('e2', 'erzeugung'),
    karte('k1', 'recht'), karte('k2', 'schutz'),
  ];

  it('ohne Karteikarten und ohne Doppelte', () => {
    const f = waehleSimulationsFragen(fragen, 30, zufallAus(1));
    expect(f).toHaveLength(30);
    expect(f.some((x) => x.typ === 'karte')).toBe(false);
    expect(new Set(f.map((x) => x.id)).size).toBe(30);
  });

  it('gleichmäßig über die Themen, kleine Themen komplett', () => {
    const f = waehleSimulationsFragen(fragen, 12, zufallAus(2));
    const zahl = (t: ThemaId) => f.filter((x) => x.thema === t).length;
    expect(zahl('erzeugung')).toBe(2);
    expect(zahl('recht')).toBe(5);
    expect(zahl('schutz')).toBe(5);
  });

  it('bei 3 Themen und 6 Fragen genau 2 je Thema', () => {
    const f = waehleSimulationsFragen(fragen, 6, zufallAus(3));
    for (const t of ['recht', 'schutz', 'erzeugung'] as ThemaId[]) expect(f.filter((x) => x.thema === t)).toHaveLength(2);
  });

  it('mehr gewünscht als vorhanden → alle verfügbaren', () => {
    expect(waehleSimulationsFragen(fragen, 100, zufallAus(4))).toHaveLength(42);
    expect(waehleSimulationsFragen([], 30)).toEqual([]);
  });

  it('starteSimulation legt Reihenfolge der Antworten fest', () => {
    const s = starteSimulation(fragen, { anzahl: 10, minuten: 20, bestehensgrenze: 70 }, false, 1000, zufallAus(5));
    expect(s.fragen).toHaveLength(10);
    expect(s.fragen.every((f) => f.reihenfolge.join() === '0,1,2')).toBe(true);
    expect(s).toMatchObject({ start: 1000, antworten: {}, gemerkt: [], pos: 0 });
    expect(THEMA_IDS).toContain(fragen[0].thema);
  });
});

describe('Antworten', () => {
  it('beantwortet / richtig', () => {
    const e = auswahl('a', 'recht', [1]);
    const m = auswahl('m', 'recht', [0, 2], 'mehrfach');
    const r = rechnen('x');
    expect(istBeantwortet(e, undefined)).toBe(false);
    expect(istBeantwortet(e, [])).toBe(false);
    expect(istBeantwortet(e, [0])).toBe(true);
    expect(istRichtig(e, [1])).toBe(true);
    expect(istRichtig(m, [2, 0])).toBe(true);
    expect(istRichtig(m, [0])).toBe(false);
    expect(istBeantwortet(r, 'abc')).toBe(false);
    expect(istRichtig(r, '2,88 Ω')).toBe(true);
    expect(istRichtig(r, '2,9')).toBe(false);
  });
});

describe('Auswertung', () => {
  const fragen = [
    auswahl('r1', 'recht'), auswahl('r2', 'recht'), auswahl('s1', 'schutz', [1]), rechnen('x1'),
  ];
  const nachId = new Map(fragen.map((f) => [f.id, f]));
  const sim = (antworten: LaufendeSimulation['antworten'], grenze = 70): LaufendeSimulation => ({
    start: 0,
    einstellungen: { anzahl: 4, minuten: 10, bestehensgrenze: grenze },
    fragen: fragen.map((f) => ({ id: f.id, reihenfolge: [0, 1, 2] })),
    antworten,
    gemerkt: [],
    pos: 0,
  });

  it('zählt richtig, falsch und unbeantwortet je Thema', () => {
    const e = werteSimulationAus(sim({ r1: [0], r2: [1], x1: '2,875' }), nachId, 5 * 60_000);
    expect(e).toMatchObject({ anzahl: 4, richtig: 2, unbeantwortet: 1, prozent: 50, bestanden: false, dauerSek: 300 });
    expect(e.jeThema).toEqual({ recht: { richtig: 1, gesamt: 2 }, schutz: { richtig: 0, gesamt: 1 }, rechnen: { richtig: 1, gesamt: 1 } });
    expect(e.falscheIds).toEqual(['r2', 's1']);
    expect(e.details.find((d) => d.id === 's1')).toEqual({ id: 's1', antwort: null, richtig: false });
  });

  it('Bestehensgrenze exakt: 3/4 = 75 % besteht bei 75, nicht bei 80', () => {
    const antworten = { r1: [0], r2: [0], s1: [1] };
    expect(werteSimulationAus(sim(antworten, 75), nachId, 1).bestanden).toBe(true);
    expect(werteSimulationAus(sim(antworten, 80), nachId, 1).bestanden).toBe(false);
  });

  it('Prozent wird abgerundet, damit knapp darunter nicht wie bestanden aussieht', () => {
    // 20 von 29 = 68,97 %
    const viele = Array.from({ length: 29 }, (_, i) => auswahl(`q${i}`, 'recht'));
    const s: LaufendeSimulation = {
      start: 0, einstellungen: { anzahl: 29, minuten: 60, bestehensgrenze: 69 },
      fragen: viele.map((f) => ({ id: f.id, reihenfolge: [0, 1, 2] })),
      antworten: Object.fromEntries(viele.slice(0, 20).map((f) => [f.id, [0]])), gemerkt: [], pos: 0,
    };
    const e = werteSimulationAus(s, new Map(viele.map((f) => [f.id, f])), 1);
    expect(e.prozent).toBe(68.9);
    expect(e.bestanden).toBe(false);
  });

  it('Dauer höchstens bis zum Zeitlimit', () => {
    expect(werteSimulationAus(sim({}), nachId, 99 * 60_000).dauerSek).toBe(600);
  });
});

describe('Zeit', () => {
  const s = { start: 0, einstellungen: { anzahl: 1, minuten: 60, bestehensgrenze: 70 } } as LaufendeSimulation;
  it('Restzeit und Anzeige', () => {
    expect(restzeitMs(s, 0)).toBe(3_600_000);
    expect(restzeitMs(s, 4_000_000)).toBe(0);
    expect(formatRestzeit(3_600_000)).toBe('1:00:00');
    expect(formatRestzeit(59 * 60_000 + 7_000)).toBe('59:07');
    expect(formatRestzeit(65_000)).toBe('1:05');
    expect(formatRestzeit(500)).toBe('0:01'); // angefangene Sekunde zählt
    expect(formatRestzeit(0)).toBe('0:00');
    expect(formatDauer(2530)).toBe('42:10 min');
  });
});

describe('XP für Simulationen', () => {
  const jetzt = new Date(2027, 0, 15, 10).getTime();
  it('+25 fürs Abschließen, +100 fürs Bestehen, Antworten zählen zum Tagesziel', () => {
    const p = { ...STANDARD_PROFIL, tagesziel: 20 };
    const nicht = verbucheSimulation({ profil: p, beantwortet: 10, bestanden: false, jetzt });
    expect(nicht.ereignis.xpGesamt).toBe(XP_SIMULATION_ABGESCHLOSSEN);
    expect(nicht.profil.lernTage['2027-01-15']).toBe(10);
    const ja = verbucheSimulation({ profil: p, beantwortet: 30, bestanden: true, jetzt });
    expect(ja.ereignis).toMatchObject({ xpBestanden: XP_SIMULATION_BESTANDEN, xpTagesziel: XP_TAGESZIEL, tageszielErreicht: true });
    expect(ja.profil.xp).toBe(XP_SIMULATION_ABGESCHLOSSEN + XP_SIMULATION_BESTANDEN + XP_TAGESZIEL);
    expect(ja.profil.zielErreichtTage).toEqual(['2027-01-15']);
  });

  it('Antwortserie bleibt unberührt, Level-Aufstieg wird erkannt', () => {
    const r = verbucheSimulation({ profil: { ...STANDARD_PROFIL, xp: 280, serieAktuell: 7 }, beantwortet: 0, bestanden: false, jetzt });
    expect(r.profil.serieAktuell).toBe(7);
    expect(r.ereignis.aufstieg).toBe(true);
    expect(r.profil.lernTage).toEqual({});
  });
});
