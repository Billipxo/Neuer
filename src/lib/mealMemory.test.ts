import { afterEach, describe, expect, it, vi } from 'vitest'
import { MEAL_MEMORY_KEY, loadMealMemory, rememberChoices, saveMealMemory } from './mealMemory'

/** Minimaler Ersatz für localStorage (die Tests laufen ohne Browser) */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  }
}

describe('Gemerkte Wahl', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('ergänzt neue Zuordnungen am Ende und ersetzt alte', () => {
    const next = rememberChoices({ kase: 'Gouda', brot: 'Roggenbrot' }, { kase: 'Edamer', wein: 'Weißwein' })
    expect(Object.entries(next)).toEqual([
      ['brot', 'Roggenbrot'],
      ['kase', 'Edamer'],
      ['wein', 'Weißwein'],
    ])
  })

  it('behält höchstens 300 Zuordnungen, die neuesten', () => {
    const many = Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`k${i}`, `n${i}`]))
    const next = rememberChoices(many, { neu: 'Neu' })
    expect(Object.keys(next)).toHaveLength(300)
    expect(next.k0).toBeUndefined()
    expect(next.neu).toBe('Neu')
  })

  it('liest und schreibt robust – auch ohne oder mit kaputtem Speicher', () => {
    expect(loadMealMemory()).toEqual({})
    const storage = fakeStorage({ [MEAL_MEMORY_KEY]: '{"kase":"Gouda","x":3}' })
    vi.stubGlobal('localStorage', storage)
    expect(loadMealMemory()).toEqual({ kase: 'Gouda' })
    saveMealMemory({ kase: 'Edamer' })
    expect(storage.data.get(MEAL_MEMORY_KEY)).toBe('{"kase":"Edamer"}')
    storage.setItem(MEAL_MEMORY_KEY, 'kein json')
    expect(loadMealMemory()).toEqual({})
    storage.setItem(MEAL_MEMORY_KEY, '["a"]')
    expect(loadMealMemory()).toEqual({})
  })
})
