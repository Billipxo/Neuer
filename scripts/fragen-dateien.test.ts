// Stellt sicher, dass `npm test` auch an kaputten Fragen-Dateien scheitert.
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { expect, it } from 'vitest';
import { pruefeSammlung } from '../src/logic/validierung';

it('alle Fragen-Dateien sind gültig', () => {
  const ordner = join(__dirname, '..', 'src', 'data', 'fragen');
  const listen = readdirSync(ordner)
    .filter((d) => d.endsWith('.json'))
    .map((d) => ({ ort: d, inhalt: JSON.parse(readFileSync(join(ordner, d), 'utf8')), erwartetesThema: basename(d, '.json') }));
  expect(pruefeSammlung(listen)).toEqual([]);
});
