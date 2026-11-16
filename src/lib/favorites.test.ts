import { afterEach, describe, expect, it, vi } from 'vitest'
import { RECIPES } from './recipes'
import { dishNameFrom, FAVORITES_KEY, favoriteCount, favoriteDishIngredient, favoriteInfo, favoriteRecipes, loadFavorites, MAX_FAVORITES, saveFavorites } from './favorites'
import { pantryChoices } from './pantry'
import { mulberry32, suggestWeek } from './planner'

describe('Lieblingszutaten', () => {
  it('schlägt Rezepte mit den meisten Lieblingszutaten zuerst vor', () => {
    const matches = favoriteRecipes(RECIPES, ['Lachs', 'Spinat', 'Reis'])
    expect(matches.length).toBeGreaterThan(5)
    // absteigend nach Anzahl der Lieblingszutaten, bei Gleichstand weniger weitere Zutaten zuerst
    for (let i = 1; i < matches.length; i++) {
      const [a, b] = [matches[i - 1], matches[i]]
      expect(a.used.length > b.used.length || (a.used.length === b.used.length && a.others <= b.others)).toBe(true)
    }
    expect(matches[0].used.length).toBeGreaterThanOrEqual(2)
    expect(matches.every((m) => m.used.every((u) => ['Lachs', 'Spinat', 'Reis'].includes(u)))).toBe(true)
    expect(favoriteRecipes(RECIPES, [])).toEqual([])
  })

  it('zählt auch Zwiebeln und Knoblauch, wenn man sie ausdrücklich mag', () => {
    expect(favoriteRecipes(RECIPES, ['Knoblauch']).length).toBeGreaterThan(50)
  })

  it('kennt zu jeder wählbaren Zutat einen Eintrag der Nährwerttabelle', () => {
    const missing = pantryChoices(RECIPES)
      .map((c) => c.name)
      .filter((n) => !favoriteInfo(n))
    expect(missing).toEqual([])
  })

  it('stellt aus Lieblingszutaten Zutaten für ein eigenes Gericht zusammen – mit üblicher Menge', () => {
    expect(favoriteDishIngredient('Eier')).toMatchObject({ name: 'Eier', grams: 55, food_id: null, kcal_100: 140 })
    // Oberbegriff: eine Sorte mit Scheibenmaß
    expect(favoriteDishIngredient('Käse')).toMatchObject({ name: 'Gouda', grams: 20 })
    // trockene Grundzutat: eine Portion ungekocht
    expect(favoriteDishIngredient('Nudeln')?.grams).toBe(70)
    expect(favoriteDishIngredient('Butter')?.grams).toBe(12)
    expect(favoriteDishIngredient('Hähnchen')).toMatchObject({ name: 'Hähnchenbrust', grams: 100 })
    expect(favoriteDishIngredient('Gibt es nicht')).toBeNull()
    expect(dishNameFrom(['Lachs', 'Spinat', 'Reis'])).toBe('Lachs, Spinat & Reis')
    expect(dishNameFrom(['Lachs'])).toBe('Lachs')
    expect(dishNameFrom([])).toBe('')
  })

  it('bevorzugt bei „Woche vorschlagen“ leicht Rezepte mit Lieblingszutaten', () => {
    const fav = new Set(['Lachs', 'Spinat'])
    const salmon = RECIPES.filter((r) => favoriteCount(r, fav) > 0)
    expect(salmon.length).toBeGreaterThan(0)
    const days = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']
    const base = { recipes: RECIPES, days, kcalTarget: 2000, macros: { protein: 25, carbs: 45, fat: 30 }, existing: [], includeSnacks: false }
    const count = (items: { recipe_id: string | null }[]) => items.filter((i) => salmon.some((r) => r.id === i.recipe_id)).length
    let without = 0
    let withFav = 0
    for (let seed = 1; seed <= 20; seed++) {
      without += count(suggestWeek({ ...base, random: mulberry32(seed) }))
      withFav += count(suggestWeek({ ...base, favorites: ['Lachs', 'Spinat'], random: mulberry32(seed) }))
    }
    expect(withFav).toBeGreaterThan(without)
    // ohne Lieblingszutaten bleibt alles wie bisher
    expect(suggestWeek({ ...base, favorites: [], random: mulberry32(7) })).toEqual(suggestWeek({ ...base, random: mulberry32(7) }))
  })
})

/** Minimaler Ersatz für localStorage (die Tests laufen ohne Browser) */
function fakeStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  }
}

describe('Lieblingszutaten merken', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('kommt ohne Speicher aus', () => {
    expect(loadFavorites()).toEqual([])
    expect(() => saveFavorites(['Lachs'])).not.toThrow()
  })

  it('speichert die Auswahl auf dem Gerät und liest nur Gültiges zurück', () => {
    vi.stubGlobal('localStorage', fakeStorage())
    expect(loadFavorites()).toEqual([])
    saveFavorites(['Lachs', 'Spinat'])
    expect(loadFavorites()).toEqual(['Lachs', 'Spinat'])
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(['Feta', 3, '', null]))
    expect(loadFavorites()).toEqual(['Feta'])
    localStorage.setItem(FAVORITES_KEY, '{kaputt')
    expect(loadFavorites()).toEqual([])
    saveFavorites(Array.from({ length: 60 }, (_, i) => `Zutat ${i}`))
    expect(loadFavorites()).toHaveLength(MAX_FAVORITES)
  })
})
