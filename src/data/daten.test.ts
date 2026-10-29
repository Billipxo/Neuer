import { expect, it } from 'vitest';
import { bereichVonFrage } from '../logic/bereiche';
import { formelnFuer } from '../logic/formeln';
import { THEMA_IDS } from '../types';
import { BEREICHE } from './bereiche';
import { FORMELN } from './formeln';
import { MITGELIEFERTE_FRAGEN } from './fragen';

it('die App lädt alle Themenbereiche, nach Themen sortiert, und jede Frage findet ihren Bereich', () => {
  expect(BEREICHE.length).toBeGreaterThan(0);
  const reihenfolge = BEREICHE.map((b) => THEMA_IDS.indexOf(b.thema));
  expect(reihenfolge).toEqual([...reihenfolge].sort((a, b) => a - b));
  expect(MITGELIEFERTE_FRAGEN.filter((f) => !bereichVonFrage(BEREICHE, f)).map((f) => f.id)).toEqual([]);
});

it('jede Rechenaufgabe hat passende Formeln, reine Wissensfragen in der Regel nicht', () => {
  const ohne = MITGELIEFERTE_FRAGEN.filter((f) => f.typ === 'rechnen' && formelnFuer(f, FORMELN, BEREICHE).length === 0);
  expect(ohne.map((f) => f.id)).toEqual([]);
  const mit = MITGELIEFERTE_FRAGEN.filter((f) => f.typ !== 'rechnen' && formelnFuer(f, FORMELN, BEREICHE).length > 0);
  expect(mit.map((f) => f.id).sort()).toEqual(['lf-pruefung-007', 'lf-pruefung-008', 'lf-pruefung-k03', 'lf-tab-005']);
});
