import { FRAGE_TYPEN, THEMA_IDS, type Frage } from '../types';

const PFLICHTFELDER = [
  'id',
  'thema',
  'typ',
  'frage',
  'antworten',
  'richtig',
  'erklaerung',
  'quelle',
  'schwierigkeit',
  'bild',
  'geprueft',
  'stand',
] as const;

const ERLAUBTE_FELDER = new Set<string>([...PFLICHTFELDER, 'unterthema']);

function istText(x: unknown): x is string {
  return typeof x === 'string' && x.trim().length > 0;
}

/** Prüft eine einzelne Frage und liefert eine Liste von Fehlermeldungen (leer = in Ordnung). */
export function pruefeFrage(roh: unknown): string[] {
  const fehler: string[] = [];
  if (typeof roh !== 'object' || roh === null || Array.isArray(roh)) {
    return ['Eintrag ist kein Objekt'];
  }
  const f = roh as Record<string, unknown>;

  for (const feld of PFLICHTFELDER) {
    if (!(feld in f)) fehler.push(`Feld „${feld}“ fehlt`);
  }
  for (const feld of Object.keys(f)) {
    if (!ERLAUBTE_FELDER.has(feld)) fehler.push(`Unbekanntes Feld „${feld}“`);
  }

  if (!istText(f.id)) fehler.push('id ist leer');
  else if (!/^[a-z0-9][a-z0-9_-]*$/.test(f.id)) fehler.push('id darf nur a-z, 0-9, - und _ enthalten');

  if (!THEMA_IDS.includes(f.thema as never)) fehler.push(`Unbekanntes Thema „${String(f.thema)}“`);
  if (!FRAGE_TYPEN.includes(f.typ as never)) fehler.push(`Unbekannter Typ „${String(f.typ)}“`);
  if (!istText(f.frage)) fehler.push('Fragetext ist leer');
  if (!istText(f.erklaerung)) fehler.push('Erklärung ist leer');
  if (!istText(f.quelle)) fehler.push('Quelle ist leer');
  if (!istText(f.stand)) fehler.push('Stand ist leer');
  if (![1, 2, 3].includes(f.schwierigkeit as number)) fehler.push('schwierigkeit muss 1, 2 oder 3 sein');
  if (f.bild !== null && !istText(f.bild)) fehler.push('bild muss null oder ein Pfad sein');
  if (typeof f.geprueft !== 'boolean') fehler.push('geprueft muss true oder false sein');
  if ('unterthema' in f && typeof f.unterthema !== 'string') fehler.push('unterthema muss Text sein');

  const antworten = f.antworten;
  if (!Array.isArray(antworten) || antworten.some((a) => !istText(a))) {
    fehler.push('antworten muss eine Liste von Texten sein');
    return fehler;
  }

  const richtig = f.richtig;
  switch (f.typ) {
    case 'einfach':
    case 'mehrfach': {
      if (antworten.length < 2) fehler.push('Mindestens 2 Antworten nötig');
      if (new Set(antworten.map((a) => a.trim())).size !== antworten.length) fehler.push('Doppelte Antworttexte');
      if (!Array.isArray(richtig) || richtig.length === 0) {
        fehler.push('Keine richtige Antwort angegeben');
        break;
      }
      if (richtig.some((i) => !Number.isInteger(i) || i < 0 || i >= antworten.length)) {
        fehler.push('richtig enthält einen ungültigen Antwort-Index');
      }
      if (new Set(richtig).size !== richtig.length) fehler.push('richtig enthält doppelte Indizes');
      if (f.typ === 'einfach' && richtig.length !== 1) fehler.push('Einfachauswahl braucht genau eine richtige Antwort');
      break;
    }
    case 'rechnen': {
      const r = richtig as Record<string, unknown> | null;
      if (typeof r !== 'object' || r === null || Array.isArray(r)) {
        fehler.push('Rechenaufgabe braucht richtig = { wert, einheit, toleranz, toleranzArt }');
        break;
      }
      if (typeof r.wert !== 'number' || !Number.isFinite(r.wert)) fehler.push('Rechenlösung: wert fehlt');
      if (typeof r.einheit !== 'string') fehler.push('Rechenlösung: einheit fehlt');
      if (typeof r.toleranz !== 'number' || r.toleranz < 0) fehler.push('Rechenlösung: toleranz fehlt oder negativ');
      if (r.toleranzArt !== 'abs' && r.toleranzArt !== 'rel') fehler.push('Rechenlösung: toleranzArt muss abs oder rel sein');
      if (antworten.length > 0) fehler.push('Rechenaufgabe darf keine Antworten haben');
      break;
    }
    case 'karte': {
      if (!istText(richtig)) fehler.push('Karteikarte braucht eine Musterantwort in richtig');
      if (antworten.length > 0) fehler.push('Karteikarte darf keine Antworten haben');
      break;
    }
  }
  return fehler;
}

export interface Befund {
  /** z. B. Dateiname */
  ort: string;
  id: string;
  fehler: string;
}

/**
 * Prüft mehrere Fragenlisten (z. B. je Datei) gemeinsam, inkl. doppelter IDs.
 * erwartetesThema: falls gesetzt, muss jede Frage dieser Liste dieses Thema haben.
 */
export function pruefeSammlung(
  listen: { ort: string; inhalt: unknown; erwartetesThema?: string }[],
): Befund[] {
  const befunde: Befund[] = [];
  const gesehen = new Map<string, string>();

  for (const { ort, inhalt, erwartetesThema } of listen) {
    if (!Array.isArray(inhalt)) {
      befunde.push({ ort, id: '-', fehler: 'Datei muss eine Liste (Array) von Fragen enthalten' });
      continue;
    }
    inhalt.forEach((roh, i) => {
      const id =
        typeof roh === 'object' && roh !== null && typeof (roh as Frage).id === 'string'
          ? (roh as Frage).id
          : `#${i + 1}`;
      for (const fehler of pruefeFrage(roh)) befunde.push({ ort, id, fehler });
      if (erwartetesThema && (roh as Frage)?.thema !== erwartetesThema) {
        befunde.push({ ort, id, fehler: `Thema passt nicht zur Datei (erwartet „${erwartetesThema}“)` });
      }
      if (typeof (roh as Frage)?.id === 'string') {
        const vorher = gesehen.get(id);
        if (vorher) befunde.push({ ort, id, fehler: `Doppelte ID (schon in ${vorher})` });
        else gesehen.set(id, ort);
      }
    });
  }
  return befunde;
}
