import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  alleFragen, alleSimulationen, holeFortschritt, holeLaufendeSimulation, holeProfil, loescheFrage,
  loescheLaufendeSimulation, oeffneDb, speichereFortschritt, speichereFrage, speichereLaufendeSimulation,
  speichereProfil, speichereSimulation, synchronisiereFragen,
} from './db';
import type { Frage } from '../types';

let zaehler = 0;
const neueDb = () => oeffneDb(`test-${++zaehler}`);
const f = (id: string, frage = 'Text'): Frage => ({
  id, thema: 'recht', typ: 'einfach', frage, antworten: ['A', 'B'], richtig: [0],
  erklaerung: 'E', quelle: 'Q', schwierigkeit: 1, bild: null, geprueft: false, stand: '2026-10',
});

describe('Datenbank', () => {
  it('synchronisiert mitgelieferte Fragen nur einmal', async () => {
    const db = await neueDb();
    expect(await synchronisiereFragen(db, [f('a'), f('b')])).toBe(2);
    expect(await synchronisiereFragen(db, [f('a'), f('b')])).toBe(0);
    expect(await alleFragen(db)).toHaveLength(2);
  });

  it('behält Bearbeitungen und merkt sich gelöschte Fragen', async () => {
    const db = await neueDb();
    await synchronisiereFragen(db, [f('a'), f('b')]);
    await speichereFrage(db, { ...f('a', 'Geändert'), geprueft: true });
    await loescheFrage(db, 'b');
    await synchronisiereFragen(db, [f('a', 'Datei neu'), f('b')]);
    const fragen = await alleFragen(db);
    expect(fragen.map((x) => x.id)).toEqual(['a']);
    expect(fragen[0]).toMatchObject({ frage: 'Geändert', geprueft: true, bearbeitet: true, herkunft: 'mitgeliefert' });
  });

  it('kennzeichnet in der App angelegte Fragen als eigen', async () => {
    const db = await neueDb();
    const neu = await speichereFrage(db, f('eigen-1'));
    expect(neu.herkunft).toBe('eigen');
  });

  it('liefert Standard-Fortschritt und Standard-Profil', async () => {
    const db = await neueDb();
    expect(await holeFortschritt(db, 'x')).toMatchObject({ status: 'neu', box: 0 });
    const p = await holeProfil(db);
    expect(p).toMatchObject({ xp: 0, tagesziel: 20, pruefungsDatum: '2027-01-30' });
    expect(p.simulation).toEqual({ anzahl: 30, minuten: 60, bestehensgrenze: 70 });
    await speichereProfil(db, { ...p, xp: 50 });
    expect((await holeProfil(db)).xp).toBe(50);
    await speichereFortschritt(db, { ...(await holeFortschritt(db, 'x')), markiert: true });
    expect((await holeFortschritt(db, 'x')).markiert).toBe(true);
  });

  it('löscht beim Entfernen einer Frage auch den Fortschritt', async () => {
    const db = await neueDb();
    await synchronisiereFragen(db, [f('a')]);
    await speichereFortschritt(db, { ...(await holeFortschritt(db, 'a')), versuche: 3 });
    await loescheFrage(db, 'a');
    expect((await holeFortschritt(db, 'a')).versuche).toBe(0);
  });

  it('speichert Simulationen, neueste zuerst', async () => {
    const db = await neueDb();
    const s = { einstellungen: { anzahl: 1, minuten: 1, bestehensgrenze: 70 }, dauerSek: 1, anzahl: 1, richtig: 1, prozent: 100, bestanden: true, unbeantwortet: 0, jeThema: {}, falscheIds: [], details: [] };
    await speichereSimulation(db, { ...s, datum: 1 });
    await speichereSimulation(db, { ...s, datum: 2 });
    expect((await alleSimulationen(db)).map((x) => x.datum)).toEqual([2, 1]);
  });

  it('merkt sich eine laufende Simulation bis zum Löschen', async () => {
    const db = await neueDb();
    expect(await holeLaufendeSimulation(db)).toBeNull();
    const laufend = { start: 5, einstellungen: { anzahl: 2, minuten: 10, bestehensgrenze: 70 }, fragen: [{ id: 'a', reihenfolge: [1, 0] }], antworten: { a: [1] }, gemerkt: ['a'], pos: 0 };
    await speichereLaufendeSimulation(db, laufend);
    expect(await holeLaufendeSimulation(db)).toEqual(laufend);
    await loescheLaufendeSimulation(db);
    expect(await holeLaufendeSimulation(db)).toBeNull();
  });
});
