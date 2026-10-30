import { expect, it } from 'vitest';
import { bereichVonFrage } from '../logic/bereiche';
import { formelnFuer } from '../logic/formeln';
import { lektionsSchritte } from '../logic/lektion';
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

it('jede Lektion hat mindestens drei Verständnisfragen, jede direkt hinter ihrer Seite', () => {
  for (const b of BEREICHE) {
    const fragen = b.verstaendnis ?? [];
    expect(fragen.length, b.id).toBeGreaterThanOrEqual(3);
    const schritte = lektionsSchritte(b);
    // jede Lektion beginnt mit einer Seite und enthält jede Frage genau einmal
    expect(schritte[0].art, b.id).toBe('seite');
    const reihenfolge = schritte.filter((s) => s.art === 'frage').map((s) => s.nr);
    expect([...reihenfolge].sort((x, y) => x - y), b.id).toEqual(fragen.map((_, i) => i));
    // jede Frage steht hinter einer Seite ihres Abschnitts – keine wurde mangels Platz ans Ende gehängt
    schritte.forEach((s, i) => {
      if (s.art !== 'frage') return;
      const seite = schritte.slice(0, i).reverse().find((x) => x.art === 'seite');
      expect(seite?.art === 'seite' && seite.abschnitt, `${b.id} Frage ${s.nr + 1}`).toBe(s.frage.abschnitt);
    });
  }
});
