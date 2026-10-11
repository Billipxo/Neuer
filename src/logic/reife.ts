import { THEMEN, type Fortschritt, type Frage, type SimulationErgebnis, type ThemaId } from '../types';
import { statusVerteilung, type Verteilung } from './sitzung';

/** Lernstand eines Themas, 0–1: gelernt zählt voll, „1× richtig“ halb. */
export function themaReife(v: Verteilung): number {
  return v.gesamt ? (v.gelernt + 0.5 * v.einmal) / v.gesamt : 0;
}

/** Ohne Prüfungssimulation ist die Reife auf diesen Anteil gedeckelt. */
export const OHNE_SIMULATION_FAKTOR = 0.9;
export const GEWICHT_LERNEN = 0.6;
export const GEWICHT_SIMULATION = 0.4;
export const SIMULATIONEN_FUER_REIFE = 3;

export interface ThemaReife {
  id: ThemaId;
  titel: string;
  v: Verteilung;
  /** 0–100 */
  prozent: number;
}

export interface Pruefungsreife {
  /** 0–100 */
  prozent: number;
  /** Durchschnitt der Themen, 0–100 */
  lernen: number;
  /** Durchschnitt der letzten Simulationen, 0–100, oder null */
  simulation: number | null;
  themen: ThemaReife[];
  schwaechstes: ThemaReife | null;
}

/**
 * Prüfungsreife:
 * - Lernstand: Durchschnitt über alle Themen (jedes Thema zählt gleich, damit Lücken auffallen)
 * - mit Simulationen: 60 % Lernstand + 40 % Ø der letzten 3 Simulationen
 * - ohne Simulation: Lernstand × 0,9
 */
export function pruefungsreife(
  fragen: readonly Frage[],
  fortschritte: ReadonlyMap<string, Fortschritt>,
  simulationen: readonly SimulationErgebnis[],
): Pruefungsreife {
  const themen: ThemaReife[] = THEMEN.map((t) => {
    const v = statusVerteilung(
      fragen.filter((f) => f.thema === t.id),
      fortschritte,
    );
    return { id: t.id, titel: t.titel, v, prozent: Math.round(themaReife(v) * 100) };
  }).filter((t) => t.v.gesamt > 0);

  const mittel = (werte: number[]) => (werte.length ? werte.reduce((a, b) => a + b, 0) / werte.length : 0);
  const lernen = mittel(themen.map((t) => themaReife(t.v)));
  const letzte = [...simulationen].sort((a, b) => b.datum - a.datum).slice(0, SIMULATIONEN_FUER_REIFE);
  const simulation = letzte.length ? mittel(letzte.map((s) => s.prozent / 100)) : null;
  const wert = simulation === null ? lernen * OHNE_SIMULATION_FAKTOR : GEWICHT_LERNEN * lernen + GEWICHT_SIMULATION * simulation;
  const schwaechstes = themen.reduce<ThemaReife | null>((min, t) => (!min || t.prozent < min.prozent ? t : min), null);

  return {
    prozent: Math.round(wert * 100),
    lernen: Math.round(lernen * 100),
    simulation: simulation === null ? null : Math.round(simulation * 100),
    themen,
    schwaechstes,
  };
}

/** Die letzte Woche vor der Prüfung bleibt fürs Wiederholen und Simulationen frei. */
export const PUFFER_TAGE = 7;
export const MIN_PENSUM = 5;

/**
 * Empfohlene neue/offene Fragen pro Tag, damit bis zur Prüfung alles gelernt ist.
 * Geschätzt: neue und falsche Fragen brauchen ca. 2,5 Antworten, gelbe ca. 1,5.
 * Liefert null, wenn die Prüfung heute oder vorbei ist.
 */
export function tagespensum(v: Verteilung, tageBisPruefung: number): number | null {
  if (tageBisPruefung <= 0) return null;
  const offen = Math.ceil(2.5 * (v.neu + v.falsch) + 1.5 * v.einmal);
  if (offen === 0) return 0;
  const lernTage = tageBisPruefung > PUFFER_TAGE ? tageBisPruefung - PUFFER_TAGE : tageBisPruefung;
  return Math.min(offen, Math.max(MIN_PENSUM, Math.ceil(offen / lernTage)));
}

export function countdownText(tage: number): string {
  if (tage > 1) return `Noch ${tage} Tage`;
  if (tage === 1) return 'Morgen ist Prüfung!';
  if (tage === 0) return 'Heute ist Prüfung – viel Erfolg!';
  return 'Prüfung vorbei';
}
