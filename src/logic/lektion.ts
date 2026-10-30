import type { Bereich, Verstaendnisfrage } from '../types';

/** So viele Stichpunkte stehen höchstens auf einer Seite einer Lektion. */
export const PUNKTE_JE_SEITE = 3;

export interface LektionsSeite {
  art: 'seite';
  /** Index des Abschnitts in der Erklärung */
  abschnitt: number;
  titel: string;
  /** Einleitungstext des Abschnitts – nur auf seiner ersten Seite */
  text?: string;
  punkte: string[];
  /** Seite `teil` von `teile` dieses Abschnitts (ab 1) */
  teil: number;
  teile: number;
}

export interface LektionsFrage {
  art: 'frage';
  /** Index in `verstaendnis` – damit lassen sich Antworten der Frage zuordnen */
  nr: number;
  frage: Verstaendnisfrage;
}

export type LektionsSchritt = LektionsSeite | LektionsFrage;

/** Verteilt n Stichpunkte möglichst gleichmäßig auf Seiten mit höchstens PUNKTE_JE_SEITE (größere Seiten zuerst). */
export function seitenGroessen(n: number): number[] {
  if (n <= 0) return [0];
  const seiten = Math.ceil(n / PUNKTE_JE_SEITE);
  const basis = Math.floor(n / seiten);
  return Array.from({ length: seiten }, (_, i) => basis + (i < n % seiten ? 1 : 0));
}

/**
 * Baut die Schritte einer Lektion: Jeder Abschnitt der Erklärung wird zu einer oder mehreren Seiten, jede
 * Verständnisfrage folgt direkt auf die Seite mit ihrem Stichpunkt (ohne Stichpunkt: auf den ganzen Abschnitt).
 * Eine Frage, die so keinen Platz findet, kommt ans Ende – verloren geht keine.
 */
export function lektionsSchritte(bereich: Pick<Bereich, 'erklaerung' | 'verstaendnis'>): LektionsSchritt[] {
  const fragen = bereich.verstaendnis ?? [];
  const platziert = new Set<number>();
  const schritte: LektionsSchritt[] = [];
  bereich.erklaerung.forEach((a, abschnitt) => {
    const punkte = a.punkte ?? [];
    const groessen = seitenGroessen(punkte.length);
    let ab = 0;
    groessen.forEach((groesse, i) => {
      const bis = ab + groesse;
      schritte.push({ art: 'seite', abschnitt, titel: a.titel, text: i === 0 ? a.text : undefined, punkte: punkte.slice(ab, bis), teil: i + 1, teile: groessen.length });
      const letzteSeite = i === groessen.length - 1;
      fragen.forEach((frage, nr) => {
        if (frage.abschnitt !== abschnitt) return;
        const hierher = frage.punkt === undefined ? letzteSeite : frage.punkt >= ab && frage.punkt < bis;
        if (!hierher) return;
        schritte.push({ art: 'frage', nr, frage });
        platziert.add(nr);
      });
      ab = bis;
    });
  });
  fragen.forEach((frage, nr) => {
    if (!platziert.has(nr)) schritte.push({ art: 'frage', nr, frage });
  });
  return schritte;
}

/** Umfang einer Lektion für die Übersicht, z. B. 5 Seiten und 3 Fragen. */
export function lektionsUmfang(bereich: Pick<Bereich, 'erklaerung' | 'verstaendnis'>): { seiten: number; fragen: number } {
  const seiten = lektionsSchritte(bereich).filter((s) => s.art === 'seite').length;
  return { seiten, fragen: bereich.verstaendnis?.length ?? 0 };
}

/** Die erste Lektion, die noch nicht abgeschlossen ist – sonst undefined. */
export function naechsteLektion<T extends { id: string }>(bereiche: readonly T[], erledigt: Readonly<Record<string, unknown>>): T | undefined {
  return bereiche.find((b) => !erledigt[b.id]);
}
