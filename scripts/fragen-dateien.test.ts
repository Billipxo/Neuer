// Stellt sicher, dass `npm test` auch an kaputten Fragen-, Themenbereich- oder Formel-Dateien scheitert.
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { expect, it } from 'vitest';
import { pruefeBereiche, pruefeFormeln, pruefeSammlung } from '../src/logic/validierung';
import type { Frage } from '../src/types';

const lies = (ordner: string, praefix = '') => {
  const pfad = join(__dirname, '..', 'src', 'data', ordner);
  return readdirSync(pfad)
    .filter((d) => d.endsWith('.json'))
    .map((d) => ({ ort: praefix + d, inhalt: JSON.parse(readFileSync(join(pfad, d), 'utf8')), erwartetesThema: basename(d, '.json') }));
};

it('alle Fragen-Dateien sind gültig', () => {
  expect(pruefeSammlung(lies('fragen'))).toEqual([]);
});

it('alle Themenbereich-Dateien sind gültig, jede Frage gehört zu genau einem Bereich', () => {
  const fragen = lies('fragen').flatMap((l) => l.inhalt as Frage[]);
  expect(pruefeBereiche(lies('bereiche', 'bereiche/'), fragen)).toEqual([]);
});

it('die Formelsammlung ist gültig und verweist nur auf vorhandene Bereiche und Fragen', () => {
  const fragen = lies('fragen').flatMap((l) => l.inhalt as Frage[]);
  const bereiche = lies('bereiche').flatMap((l) => l.inhalt as { id: string }[]);
  const formeln = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'data', 'formeln.json'), 'utf8'));
  expect(pruefeFormeln(formeln, new Set(bereiche.map((b) => b.id)), new Set(fragen.map((f) => f.id)))).toEqual([]);
});
