import { FRAGE_TYPEN, THEMA_IDS, type Bereich, type Frage } from '../types';

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

  // Inhalte nur prüfen, wenn das Feld da ist – fehlende Felder sind oben schon gemeldet
  const hat = (feld: string) => feld in f;
  if (hat('id')) {
    if (!istText(f.id)) fehler.push('id ist leer');
    else if (!/^[a-z0-9][a-z0-9_-]*$/.test(f.id)) fehler.push('id darf nur a-z, 0-9, - und _ enthalten');
  }
  if (hat('thema') && !THEMA_IDS.includes(f.thema as never)) fehler.push(`Unbekanntes Thema „${String(f.thema)}“`);
  if (hat('typ') && !FRAGE_TYPEN.includes(f.typ as never)) fehler.push(`Unbekannter Typ „${String(f.typ)}“`);
  if (hat('frage') && !istText(f.frage)) fehler.push('Fragetext ist leer');
  if (hat('erklaerung') && !istText(f.erklaerung)) fehler.push('Erklärung ist leer');
  if (hat('quelle') && !istText(f.quelle)) fehler.push('Quelle ist leer');
  if (hat('stand') && !istText(f.stand)) fehler.push('Stand ist leer');
  if (hat('schwierigkeit') && ![1, 2, 3].includes(f.schwierigkeit as number)) fehler.push('schwierigkeit muss 1, 2 oder 3 sein');
  if (hat('bild') && f.bild !== null && !istText(f.bild)) fehler.push('bild muss null oder ein Pfad sein');
  if (hat('geprueft') && typeof f.geprueft !== 'boolean') fehler.push('geprueft muss true oder false sein');
  if (hat('unterthema') && typeof f.unterthema !== 'string') fehler.push('unterthema muss Text sein');

  const antworten = f.antworten;
  if (!hat('antworten') || !hat('richtig')) return fehler;
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

const BEREICH_FELDER = ['id', 'thema', 'titel', 'kurz', 'unterthemen', 'erklaerung', 'quelle', 'stand'] as const;
const ABSCHNITT_FELDER = ['titel', 'text', 'punkte'];

function istTextListe(x: unknown): x is string[] {
  return Array.isArray(x) && x.length > 0 && x.every(istText);
}

/** Prüft einen einzelnen Themenbereich (Aufbau und Inhalte) und liefert Fehlermeldungen (leer = in Ordnung). */
export function pruefeBereich(roh: unknown): string[] {
  const fehler: string[] = [];
  if (typeof roh !== 'object' || roh === null || Array.isArray(roh)) {
    return ['Eintrag ist kein Objekt'];
  }
  const b = roh as Record<string, unknown>;

  for (const feld of BEREICH_FELDER) {
    if (!(feld in b)) fehler.push(`Feld „${feld}“ fehlt`);
  }
  for (const feld of Object.keys(b)) {
    if (!(BEREICH_FELDER as readonly string[]).includes(feld)) fehler.push(`Unbekanntes Feld „${feld}“`);
  }

  const hat = (feld: string) => feld in b;
  if (hat('id')) {
    if (!istText(b.id)) fehler.push('id ist leer');
    else if (!/^[a-z0-9][a-z0-9_-]*$/.test(b.id)) fehler.push('id darf nur a-z, 0-9, - und _ enthalten');
  }
  if (hat('thema') && !THEMA_IDS.includes(b.thema as never)) fehler.push(`Unbekanntes Thema „${String(b.thema)}“`);
  for (const feld of ['titel', 'kurz', 'quelle', 'stand'] as const) {
    if (hat(feld) && !istText(b[feld])) fehler.push(`${feld} ist leer`);
  }
  if (hat('unterthemen')) {
    if (!istTextListe(b.unterthemen)) fehler.push('unterthemen muss eine Liste von Texten sein');
    else if (new Set(b.unterthemen).size !== b.unterthemen.length) fehler.push('unterthemen enthält doppelte Einträge');
  }
  if (hat('erklaerung')) {
    if (!Array.isArray(b.erklaerung) || b.erklaerung.length === 0) {
      fehler.push('erklaerung muss eine Liste von Abschnitten sein');
    } else {
      b.erklaerung.forEach((roheAbschnitt, i) => {
        const nr = `Abschnitt ${i + 1}`;
        if (typeof roheAbschnitt !== 'object' || roheAbschnitt === null || Array.isArray(roheAbschnitt)) {
          fehler.push(`${nr} ist kein Objekt`);
          return;
        }
        const a = roheAbschnitt as Record<string, unknown>;
        for (const feld of Object.keys(a)) {
          if (!ABSCHNITT_FELDER.includes(feld)) fehler.push(`${nr}: unbekanntes Feld „${feld}“`);
        }
        if (!istText(a.titel)) fehler.push(`${nr}: titel ist leer`);
        if (!('text' in a) && !('punkte' in a)) fehler.push(`${nr}: braucht text oder punkte`);
        if ('text' in a && !istText(a.text)) fehler.push(`${nr}: text ist leer`);
        if ('punkte' in a && !istTextListe(a.punkte)) fehler.push(`${nr}: punkte muss eine Liste von Texten sein`);
      });
    }
  }
  return fehler;
}

/**
 * Prüft die Themenbereich-Dateien zusammen mit den Fragen: Aufbau, doppelte IDs, Thema passend zur Datei,
 * kein Unterthema in zwei Bereichen, kein Unterthema ohne Fragen – und jede Frage gehört zu einem Bereich.
 */
export function pruefeBereiche(
  listen: { ort: string; inhalt: unknown; erwartetesThema?: string }[],
  fragen: readonly Pick<Frage, 'id' | 'thema' | 'unterthema'>[],
): Befund[] {
  const befunde: Befund[] = [];
  const gesehen = new Map<string, string>();
  /** je Thema: Unterthema → ID des Bereichs */
  const zuordnung = new Map<string, Map<string, string>>();

  for (const { ort, inhalt, erwartetesThema } of listen) {
    if (!Array.isArray(inhalt)) {
      befunde.push({ ort, id: '-', fehler: 'Datei muss eine Liste (Array) von Themenbereichen enthalten' });
      continue;
    }
    inhalt.forEach((roh, i) => {
      const b = roh as Partial<Bereich> | null;
      const id = typeof b?.id === 'string' ? b.id : `#${i + 1}`;
      const fehler = pruefeBereich(roh);
      for (const f of fehler) befunde.push({ ort, id, fehler: f });
      if (erwartetesThema && b?.thema !== erwartetesThema) {
        befunde.push({ ort, id, fehler: `Thema passt nicht zur Datei (erwartet „${erwartetesThema}“)` });
      }
      if (typeof b?.id === 'string') {
        const vorher = gesehen.get(id);
        if (vorher) befunde.push({ ort, id, fehler: `Doppelte ID (schon in ${vorher})` });
        else gesehen.set(id, ort);
      }
      if (fehler.length || typeof b?.thema !== 'string' || !Array.isArray(b.unterthemen)) return;
      const jeThema = zuordnung.get(b.thema) ?? new Map<string, string>();
      zuordnung.set(b.thema, jeThema);
      for (const u of b.unterthemen) {
        const anderer = jeThema.get(u);
        if (anderer) befunde.push({ ort, id, fehler: `Unterthema „${u}“ steht schon im Bereich ${anderer}` });
        else jeThema.set(u, id);
        if (!fragen.some((f) => f.thema === b.thema && f.unterthema === u)) {
          befunde.push({ ort, id, fehler: `Unterthema „${u}“ kommt in keiner Frage vor` });
        }
      }
    });
  }

  for (const f of fragen) {
    if (!f.unterthema || !zuordnung.get(f.thema)?.has(f.unterthema)) {
      befunde.push({
        ort: `${f.thema}.json`,
        id: f.id,
        fehler: f.unterthema
          ? `gehört zu keinem Themenbereich – Unterthema „${f.unterthema}“ in bereiche/${f.thema}.json eintragen`
          : 'gehört zu keinem Themenbereich – unterthema fehlt',
      });
    }
  }
  return befunde;
}

const FORMEL_GRUPPE_FELDER = ['id', 'titel', 'kurz', 'eintraege', 'groessen', 'bereiche', 'fragen'];
const FORMEL_PFLICHT = ['id', 'titel', 'kurz', 'eintraege', 'bereiche', 'fragen'];
const FORMEL_EINTRAG_FELDER = ['name', 'formeln', 'hinweis'];

/**
 * Prüft die Formelsammlung: Aufbau der Gruppen und Einträge, doppelte IDs und ob die genannten
 * Themenbereiche und Fragen existieren.
 */
export function pruefeFormeln(inhalt: unknown, bereichIds: ReadonlySet<string>, frageIds: ReadonlySet<string>): Befund[] {
  const ort = 'formeln.json';
  if (!Array.isArray(inhalt)) return [{ ort, id: '-', fehler: 'Datei muss eine Liste (Array) von Formelgruppen enthalten' }];
  const befunde: Befund[] = [];
  const gesehen = new Set<string>();
  inhalt.forEach((roh, i) => {
    const g = (typeof roh === 'object' && roh !== null && !Array.isArray(roh) ? roh : {}) as Record<string, unknown>;
    const id = istText(g.id) ? g.id : `#${i + 1}`;
    const melde = (fehler: string) => {
      befunde.push({ ort, id, fehler });
    };
    if (typeof roh !== 'object' || roh === null || Array.isArray(roh)) {
      melde('Eintrag ist kein Objekt');
      return;
    }

    for (const feld of FORMEL_PFLICHT) if (!(feld in g)) melde(`Feld „${feld}“ fehlt`);
    for (const feld of Object.keys(g)) if (!FORMEL_GRUPPE_FELDER.includes(feld)) melde(`Unbekanntes Feld „${feld}“`);
    if ('id' in g) {
      if (!istText(g.id)) melde('id ist leer');
      else if (!/^[a-z0-9][a-z0-9_-]*$/.test(g.id)) melde('id darf nur a-z, 0-9, - und _ enthalten');
      else if (gesehen.has(g.id)) melde('Doppelte ID');
      else gesehen.add(g.id);
    }
    for (const feld of ['titel', 'kurz'] as const) if (feld in g && !istText(g[feld])) melde(`${feld} ist leer`);
    if ('groessen' in g) {
      const groessen = g.groessen;
      const ok =
        Array.isArray(groessen) &&
        groessen.length > 0 &&
        groessen.every((x) => {
          const e = (typeof x === 'object' && x !== null && !Array.isArray(x) ? x : {}) as Record<string, unknown>;
          return Object.keys(e).length === 2 && istText(e.zeichen) && istText(e.bedeutung);
        });
      if (!ok) melde('groessen muss eine Liste aus { zeichen, bedeutung } sein');
    }

    if ('eintraege' in g) {
      if (!Array.isArray(g.eintraege) || g.eintraege.length === 0) melde('eintraege muss eine Liste von Formeln sein');
      else
        g.eintraege.forEach((e, j) => {
          const nr = `Eintrag ${j + 1}`;
          if (typeof e !== 'object' || e === null || Array.isArray(e)) {
            melde(`${nr} ist kein Objekt`);
            return;
          }
          const eintrag = e as Record<string, unknown>;
          for (const feld of Object.keys(eintrag)) if (!FORMEL_EINTRAG_FELDER.includes(feld)) melde(`${nr}: unbekanntes Feld „${feld}“`);
          if (!istText(eintrag.name)) melde(`${nr}: name ist leer`);
          if (!istTextListe(eintrag.formeln)) melde(`${nr}: formeln muss eine Liste von Texten sein`);
          if ('hinweis' in eintrag && !istText(eintrag.hinweis)) melde(`${nr}: hinweis ist leer`);
        });
    }

    for (const [feld, bekannt, art] of [
      ['bereiche', bereichIds, 'Themenbereich'],
      ['fragen', frageIds, 'Frage'],
    ] as const) {
      if (!(feld in g)) continue;
      const liste = g[feld];
      if (!Array.isArray(liste) || liste.some((x) => !istText(x))) {
        melde(`${feld} muss eine Liste von IDs sein`);
        continue;
      }
      for (const x of liste) if (!bekannt.has(x)) melde(`${art} „${x}“ gibt es nicht`);
    }
  });
  return befunde;
}
