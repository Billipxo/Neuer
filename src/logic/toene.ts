import type { Ergebnis } from './leitner';
import type { KartenBewertung } from '../types';

export type TonArt = 'richtig' | 'serie' | 'falsch' | 'teilweise';

export interface Note {
  /** Tonhöhe in Hz; mit bisHz gleitet der Ton dorthin */
  hz: number;
  bisHz?: number;
  /** Beginn und Länge in Sekunden */
  start: number;
  dauer: number;
}

/** Die Töne der App – werden im Browser erzeugt, ganz ohne Audiodateien. */
export const KLAENGE: Record<TonArt, { form: OscillatorType; lautstaerke: number; noten: Note[] }> = {
  // zwei helle Töne aufwärts (E – H)
  richtig: {
    form: 'sine',
    lautstaerke: 0.16,
    noten: [
      { hz: 659.25, start: 0, dauer: 0.12 },
      { hz: 987.77, start: 0.09, dauer: 0.24 },
    ],
  },
  // kleiner Dur-Lauf für jede fünfte richtige Antwort in Folge
  serie: {
    form: 'sine',
    lautstaerke: 0.15,
    noten: [
      { hz: 659.25, start: 0, dauer: 0.1 },
      { hz: 830.61, start: 0.08, dauer: 0.1 },
      { hz: 987.77, start: 0.16, dauer: 0.1 },
      { hz: 1318.51, start: 0.24, dauer: 0.32 },
    ],
  },
  // ein weicher, tiefer Ton, der nach unten rutscht
  falsch: { form: 'triangle', lautstaerke: 0.22, noten: [{ hz: 233.08, bisHz: 155.56, start: 0, dauer: 0.28 }] },
  // Karteikarte „teilweise“: ein neutraler mittlerer Ton
  teilweise: { form: 'sine', lautstaerke: 0.14, noten: [{ hz: 523.25, start: 0, dauer: 0.18 }] },
};

/** Jede fünfte richtige Antwort in Folge wird etwas festlicher begrüßt. */
export function istSerienMeilenstein(serie: number): boolean {
  return serie >= 5 && serie % 5 === 0;
}

/** Welcher Ton passt zur Antwort? Karteikarten nach Selbstbewertung, sonst nach richtig/falsch und Serie. */
export function tonFuer(ergebnis: Ergebnis, serie: number, karte?: KartenBewertung): TonArt {
  if (karte) return karte === 'gewusst' ? 'richtig' : karte === 'teilweise' ? 'teilweise' : 'falsch';
  if (ergebnis !== 'richtig') return 'falsch';
  return istSerienMeilenstein(serie) ? 'serie' : 'richtig';
}
