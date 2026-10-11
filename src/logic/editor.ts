import type { Frage, FrageTyp, ThemaId } from '../types';
import { parseZahl } from './bewertung';
import { pruefeFrage } from './validierung';

/** Bearbeitbarer Zustand einer Frage im Formular (Zahlen als Text, Antworten mit Haken). */
export interface FrageFormular {
  id: string;
  thema: ThemaId;
  unterthema: string;
  typ: FrageTyp;
  frage: string;
  antworten: { text: string; richtig: boolean }[];
  wert: string;
  einheit: string;
  toleranz: string;
  toleranzArt: 'abs' | 'rel';
  musterantwort: string;
  erklaerung: string;
  quelle: string;
  schwierigkeit: 1 | 2 | 3;
  bild: string | null;
  geprueft: boolean;
  stand: string;
}

export const MAX_ANTWORTEN = 8;

/** „2026-10“ */
export function aktuellerStand(jetzt = Date.now()): string {
  const d = new Date(jetzt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Nächste freie ID für eine selbst angelegte Frage: „recht-e001“, „recht-e002“ …
 * Das „e“ (eigen) verhindert Überschneidungen mit mitgelieferten IDs wie „recht-004“.
 */
export function naechsteEigeneId(thema: ThemaId, vorhanden: Iterable<string>): string {
  const muster = new RegExp(`^${thema}-e(\\d+)$`);
  let max = 0;
  for (const id of vorhanden) {
    const m = muster.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${thema}-e${String(max + 1).padStart(3, '0')}`;
}

export function leeresFormular(thema: ThemaId, id: string, jetzt = Date.now()): FrageFormular {
  return {
    id,
    thema,
    unterthema: '',
    typ: 'einfach',
    frage: '',
    antworten: Array.from({ length: 4 }, () => ({ text: '', richtig: false })),
    wert: '',
    einheit: '',
    toleranz: '',
    toleranzArt: 'abs',
    musterantwort: '',
    erklaerung: '',
    quelle: '',
    schwierigkeit: 1,
    bild: null,
    geprueft: false,
    stand: aktuellerStand(jetzt),
  };
}

export function frageZuFormular(f: Frage): FrageFormular {
  const rechnen = f.typ === 'rechnen' && typeof f.richtig === 'object' && !Array.isArray(f.richtig) ? f.richtig : null;
  const indizes = Array.isArray(f.richtig) ? f.richtig : [];
  const zahl = (n: number) => String(n).replace('.', ',');
  return {
    id: f.id,
    thema: f.thema,
    unterthema: f.unterthema ?? '',
    typ: f.typ,
    frage: f.frage,
    antworten:
      f.antworten.length > 0
        ? f.antworten.map((text, i) => ({ text, richtig: indizes.includes(i) }))
        : Array.from({ length: 4 }, () => ({ text: '', richtig: false })),
    wert: rechnen ? zahl(rechnen.wert) : '',
    einheit: rechnen?.einheit ?? '',
    toleranz: rechnen ? zahl(rechnen.toleranz) : '',
    toleranzArt: rechnen?.toleranzArt ?? 'abs',
    musterantwort: f.typ === 'karte' && typeof f.richtig === 'string' ? f.richtig : '',
    erklaerung: f.erklaerung,
    quelle: f.quelle,
    schwierigkeit: f.schwierigkeit,
    bild: f.bild,
    geprueft: f.geprueft,
    stand: f.stand,
  };
}

/** Wechsel des Fragetyps: bei Einfachauswahl bleibt höchstens ein Haken. */
export function typWechseln(f: FrageFormular, typ: FrageTyp): FrageFormular {
  if (typ !== 'einfach') return { ...f, typ };
  let gesehen = false;
  return {
    ...f,
    typ,
    antworten: f.antworten.map((a) => {
      if (!a.richtig) return a;
      if (gesehen) return { ...a, richtig: false };
      gesehen = true;
      return a;
    }),
  };
}

/**
 * Formular → Frage. Leere Antwortfelder werden ignoriert, Zahlen mit Komma oder Punkt gelesen.
 * Liefert die Frage nur, wenn sie das Schema erfüllt (sonst die Fehlermeldungen).
 */
export function formularZuFrage(f: FrageFormular): { frage: Frage | null; fehler: string[] } {
  const fehler: string[] = [];
  const basis = {
    id: f.id.trim(),
    thema: f.thema,
    typ: f.typ,
    frage: f.frage.trim(),
    erklaerung: f.erklaerung.trim(),
    quelle: f.quelle.trim(),
    schwierigkeit: f.schwierigkeit,
    bild: f.bild,
    geprueft: f.geprueft,
    stand: f.stand.trim(),
    ...(f.unterthema.trim() ? { unterthema: f.unterthema.trim() } : {}),
  };

  let frage: Frage;
  if (f.typ === 'einfach' || f.typ === 'mehrfach') {
    const gefuellt = f.antworten.map((a) => ({ ...a, text: a.text.trim() })).filter((a) => a.text);
    frage = {
      ...basis,
      antworten: gefuellt.map((a) => a.text),
      richtig: gefuellt.flatMap((a, i) => (a.richtig ? [i] : [])),
    };
    if (f.antworten.some((a) => a.richtig && !a.text.trim())) fehler.push('Eine als richtig markierte Antwort ist leer');
  } else if (f.typ === 'rechnen') {
    const wert = parseZahl(f.wert);
    const toleranz = f.toleranz.trim() === '' ? 0 : parseZahl(f.toleranz);
    if (wert === null) fehler.push('Lösung: bitte eine Zahl eingeben');
    if (toleranz === null || toleranz < 0) fehler.push('Toleranz: bitte eine Zahl ab 0 eingeben');
    frage = {
      ...basis,
      antworten: [],
      richtig: { wert: wert ?? NaN, einheit: f.einheit.trim(), toleranz: toleranz ?? -1, toleranzArt: f.toleranzArt },
    };
  } else {
    frage = { ...basis, antworten: [], richtig: f.musterantwort.trim() };
  }

  // Schemafehler, ohne die doppelt gemeldeten Zahlenfehler
  for (const m of pruefeFrage(frage)) {
    if (f.typ === 'rechnen' && /^Rechenlösung: (wert|toleranz)/.test(m)) continue;
    if (!fehler.includes(m)) fehler.push(m);
  }
  return fehler.length ? { frage: null, fehler } : { frage, fehler: [] };
}
