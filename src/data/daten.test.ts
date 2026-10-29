import { expect, it } from 'vitest';
import { bereichVonFrage } from '../logic/bereiche';
import { THEMA_IDS } from '../types';
import { BEREICHE } from './bereiche';
import { MITGELIEFERTE_FRAGEN } from './fragen';

it('die App lädt alle Themenbereiche, nach Themen sortiert, und jede Frage findet ihren Bereich', () => {
  expect(BEREICHE.length).toBeGreaterThan(0);
  const reihenfolge = BEREICHE.map((b) => THEMA_IDS.indexOf(b.thema));
  expect(reihenfolge).toEqual([...reihenfolge].sort((a, b) => a - b));
  expect(MITGELIEFERTE_FRAGEN.filter((f) => !bereichVonFrage(BEREICHE, f)).map((f) => f.id)).toEqual([]);
});
