// Prüft alle Fragen-Dateien unter src/data/fragen/*.json, die Themenbereiche unter
// src/data/bereiche/*.json (jede Frage muss zu genau einem Themenbereich gehören) und die
// Formelsammlung src/data/formeln.json.
// Aufruf: npm run pruefe   (läuft auch automatisch vor npm run build)
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pruefeBereiche, pruefeFormeln, pruefeSammlung, type Befund } from '../src/logic/validierung';
import type { Frage } from '../src/types';

const daten = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const befunde: Befund[] = [];

/** Liest alle JSON-Dateien eines Ordners; der Dateiname ist das erwartete Thema. */
function lies(ordner: string, praefix = '') {
  const listen: { ort: string; inhalt: unknown; erwartetesThema?: string }[] = [];
  for (const datei of readdirSync(join(daten, ordner)).filter((d) => d.endsWith('.json')).sort()) {
    const ort = praefix + datei;
    try {
      listen.push({ ort, inhalt: JSON.parse(readFileSync(join(daten, ordner, datei), 'utf8')), erwartetesThema: basename(datei, '.json') });
    } catch (e) {
      befunde.push({ ort, id: '-', fehler: `Kein gültiges JSON: ${(e as Error).message}` });
    }
  }
  return listen;
}

const listen = lies('fragen');
befunde.push(...pruefeSammlung(listen));
const alle = listen.flatMap((l) => (Array.isArray(l.inhalt) ? (l.inhalt as Frage[]) : []));

const bereichListen = lies('bereiche', 'bereiche/');
befunde.push(...pruefeBereiche(bereichListen, alle));
const bereiche = bereichListen.flatMap((l) => (Array.isArray(l.inhalt) ? (l.inhalt as { id?: string }[]) : []));

let formeln: unknown = [];
try {
  formeln = JSON.parse(readFileSync(join(daten, 'formeln.json'), 'utf8'));
} catch (e) {
  befunde.push({ ort: 'formeln.json', id: '-', fehler: `Kein gültiges JSON: ${(e as Error).message}` });
}
befunde.push(...pruefeFormeln(formeln, new Set(bereiche.map((b) => String(b.id))), new Set(alle.map((f) => f.id))));

// Kleine Statistik
const dateien = listen.map((l) => l.ort);
const jeTyp = alle.reduce<Record<string, number>>((acc, f) => {
  acc[f.typ ?? '?'] = (acc[f.typ ?? '?'] ?? 0) + 1;
  return acc;
}, {});
console.log(`${dateien.length} Dateien, ${alle.length} Fragen`);
for (const l of listen) console.log(`  ${l.ort.padEnd(24)} ${Array.isArray(l.inhalt) ? l.inhalt.length : '-'}`);
console.log('  je Typ:', Object.entries(jeTyp).map(([t, n]) => `${t} ${n}`).join(', '));
console.log(`${bereiche.length} Themenbereiche mit Erklärung in ${bereichListen.length} Dateien`);
if (Array.isArray(formeln)) {
  const gruppen = formeln as { eintraege?: unknown[] }[];
  const anzahl = gruppen.reduce((n, g) => n + (Array.isArray(g.eintraege) ? g.eintraege.length : 0), 0);
  console.log(`Formelsammlung: ${gruppen.length} Gruppen mit ${anzahl} Einträgen`);
}

if (befunde.length) {
  console.error(`\n${befunde.length} Fehler gefunden:`);
  for (const b of befunde) console.error(`  ${b.ort} › ${b.id}: ${b.fehler}`);
  process.exit(1);
}
console.log('\nAlles in Ordnung ✔');
