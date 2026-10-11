// Prüft alle Fragen-Dateien unter src/data/fragen/*.json.
// Aufruf: npm run pruefe   (läuft auch automatisch vor npm run build)
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pruefeSammlung, type Befund } from '../src/logic/validierung';

const ordner = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'fragen');
const dateien = readdirSync(ordner).filter((d) => d.endsWith('.json')).sort();

const listen: { ort: string; inhalt: unknown; erwartetesThema?: string }[] = [];
const befunde: Befund[] = [];

for (const datei of dateien) {
  const text = readFileSync(join(ordner, datei), 'utf8');
  try {
    listen.push({ ort: datei, inhalt: JSON.parse(text), erwartetesThema: basename(datei, '.json') });
  } catch (e) {
    befunde.push({ ort: datei, id: '-', fehler: `Kein gültiges JSON: ${(e as Error).message}` });
  }
}
befunde.push(...pruefeSammlung(listen));

// Kleine Statistik
const alle = listen.flatMap((l) => (Array.isArray(l.inhalt) ? (l.inhalt as { typ?: string }[]) : []));
const jeTyp = alle.reduce<Record<string, number>>((acc, f) => {
  acc[f.typ ?? '?'] = (acc[f.typ ?? '?'] ?? 0) + 1;
  return acc;
}, {});
console.log(`${dateien.length} Dateien, ${alle.length} Fragen`);
for (const l of listen) console.log(`  ${l.ort.padEnd(24)} ${Array.isArray(l.inhalt) ? l.inhalt.length : '-'}`);
console.log('  je Typ:', Object.entries(jeTyp).map(([t, n]) => `${t} ${n}`).join(', '));

if (befunde.length) {
  console.error(`\n${befunde.length} Fehler gefunden:`);
  for (const b of befunde) console.error(`  ${b.ort} › ${b.id}: ${b.fehler}`);
  process.exit(1);
}
console.log('\nAlles in Ordnung ✔');
