import { describe, expect, it } from 'vitest'
import { hydrationHint } from './water'

describe('Trink-Hinweis', () => {
  it('passt sich dem Fortschritt an', () => {
    expect(hydrationHint(0, 2000, 8)).toMatch(/Starte/)
    expect(hydrationHint(0, 2000, 15)).toMatch(/Glas Wasser/)
    expect(hydrationHint(200, 2000, 18)).toMatch(/Denk ans Trinken/)
    expect(hydrationHint(1600, 2000, 18)).toMatch(/Fast geschafft/)
    expect(hydrationHint(800, 2000, 12)).toMatch(/Gut dabei/)
    expect(hydrationHint(2000, 2000, 12)).toMatch(/erreicht/)
    expect(hydrationHint(0, 0, 12)).toMatch(/genug zu trinken/)
  })
})
