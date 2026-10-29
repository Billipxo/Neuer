// Stellt sicher, dass `npm test` auch an kaputten Fragen- oder Themenbereich-Dateien scheitert.
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { expect, it } from 'vitest';
import { pruefeBereiche, pruefeSammlung } from '../src/logic/validierung';
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
