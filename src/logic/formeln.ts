import type { Bereich, FormelGruppe, Frage } from '../types';
import { bereichVonFrage } from './bereiche';

/** Formelgruppen, die zu einer Aufgabe passen: über ihren Themenbereich oder ausdrücklich über die Frage-ID. */
export function formelnFuer(
  frage: Pick<Frage, 'id' | 'thema' | 'unterthema'>,
  gruppen: readonly FormelGruppe[],
  bereiche: readonly Bereich[],
): FormelGruppe[] {
  const bereich = bereichVonFrage(bereiche, frage);
  return gruppen.filter((g) => g.fragen.includes(frage.id) || (bereich !== undefined && g.bereiche.includes(bereich.id)));
}

/** Formelgruppen zu einem Themenbereich (für den Hinweis auf der Bereichsseite). */
export function formelnZumBereich(bereichId: string, gruppen: readonly FormelGruppe[]): FormelGruppe[] {
  return gruppen.filter((g) => g.bereiche.includes(bereichId));
}

export interface FormelTeil {
  text: string;
  /** tief = tiefgestellt; laenge = das einzeln stehende „l“ (Länge), das sonst wie ein großes „I“ aussieht */
  art: 'text' | 'tief' | 'laenge';
}

/** Teilt Text an einem Muster auf; Treffer bekommen die Art `art` (Inhalt: Gruppe 1), der Rest geht an `sonst`. */
function aufteilen(text: string, muster: RegExp, art: FormelTeil['art'], sonst: (t: string) => FormelTeil[]): FormelTeil[] {
  const teile: FormelTeil[] = [];
  let rest = 0;
  for (const treffer of text.matchAll(muster)) {
    if (treffer.index > rest) teile.push(...sonst(text.slice(rest, treffer.index)));
    teile.push({ text: treffer[1], art });
    rest = treffer.index + treffer[0].length;
  }
  if (rest < text.length) teile.push(...sonst(text.slice(rest)));
  return teile;
}

/**
 * Zerlegt einen Formeltext für die Anzeige: „Z_s,max = U₀ / I_a“ → Z, (s,max) tiefgestellt, „ = U₀ / I“,
 * (a) tiefgestellt. Nach einem Komma geht es nur ohne Leerzeichen tiefgestellt weiter. Ein einzeln stehendes
 * „l“ wird als Länge markiert.
 */
export function formelTeile(text: string): FormelTeil[] {
  return aufteilen(text, /_([\p{L}\p{N}]+(?:,[\p{L}\p{N}]+)*)/gu, 'tief', laengeMarkieren);
}

/** Markiert jedes „l“, vor und hinter dem kein Buchstabe und keine Ziffer steht (ohne Lookbehind – ältere Safari). */
function laengeMarkieren(text: string): FormelTeil[] {
  const istZeichen = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}]/u.test(c);
  const teile: FormelTeil[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== 'l' || istZeichen(text[i - 1]) || istZeichen(text[i + 1])) continue;
    if (i > start) teile.push({ text: text.slice(start, i), art: 'text' });
    teile.push({ text: 'l', art: 'laenge' });
    start = i + 1;
  }
  if (start < text.length) teile.push({ text: text.slice(start), art: 'text' });
  return teile;
}
