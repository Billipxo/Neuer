import { describe, expect, it } from 'vitest';
import { KLAENGE, istSerienMeilenstein, tonFuer } from './toene';

describe('Töne', () => {
  it('richtig, falsch und jede fünfte richtige Antwort in Folge', () => {
    expect(tonFuer('richtig', 1)).toBe('richtig');
    expect(tonFuer('richtig', 4)).toBe('richtig');
    expect(tonFuer('richtig', 5)).toBe('serie');
    expect(tonFuer('richtig', 10)).toBe('serie');
    expect(tonFuer('falsch', 0)).toBe('falsch');
    expect(istSerienMeilenstein(0)).toBe(false);
  });

  it('Karteikarten nach Selbstbewertung', () => {
    expect(tonFuer('richtig', 5, 'gewusst')).toBe('richtig');
    expect(tonFuer('falsch', 0, 'teilweise')).toBe('teilweise');
    expect(tonFuer('falsch', 0, 'nicht')).toBe('falsch');
  });

  it('alle Klänge sind kurz und leise', () => {
    for (const { lautstaerke, noten } of Object.values(KLAENGE)) {
      expect(lautstaerke).toBeGreaterThan(0);
      expect(lautstaerke).toBeLessThanOrEqual(0.25);
      const ende = Math.max(...noten.map((n) => n.start + n.dauer));
      expect(ende).toBeLessThanOrEqual(0.6);
      expect(noten.every((n) => n.hz > 0 && n.dauer > 0)).toBe(true);
    }
  });
});
