import { describe, expect, it } from 'vitest'
import { activeChips, activeFilterCount, NO_FILTERS, NO_SHEET_FILTERS, parseFilters, readEntry, sheetFilterCount, toggleTag, toRecipeFilter, writeEntry } from './cookbookFilters'
import { FEW_INGREDIENTS_MAX } from './recipes'

describe('Filter im Kochbuch merken', () => {
  it('liest einen gespeicherten Stand vollständig zurück', () => {
    const f = { ...NO_FILTERS, keyword: 'Lachs', meal: 'dinner' as const, time: 30, meat: 'little' as const, kcal: 'light' as const, few: true, tags: ['vegan', 'proteinreich'], onlyFav: true, sort: 'zutaten' as const }
    expect(parseFilters(JSON.stringify(f))).toEqual(f)
  })

  it('verwirft Unbekanntes und Kaputtes, statt das Kochbuch leer zu zeigen', () => {
    expect(parseFilters(null)).toEqual(NO_FILTERS)
    expect(parseFilters('kein json')).toEqual(NO_FILTERS)
    expect(parseFilters('[1,2]')).toEqual(NO_FILTERS)
    const parsed = parseFilters(JSON.stringify({ meal: 'mitternacht', time: 7, meat: 'roh', kcal: 9, few: 'ja', tags: ['vegan', 'gibts-nicht', 3, 'vegan'], sort: 'zufall', keyword: 42 }))
    expect(parsed).toEqual({ ...NO_FILTERS, tags: ['vegan'] })
  })
})

describe('Auswahl je Eintrag im Verlauf', () => {
  const a = { ...NO_FILTERS, time: 30 }
  const b = { ...NO_FILTERS, meat: 'none' as const }

  it('stellt beim Zurückgehen die Auswahl dieses Eintrags wieder her, ein neuer Eintrag beginnt leer', () => {
    let raw = writeEntry(null, 'eintrag-a', a)
    raw = writeEntry(raw, 'eintrag-b', b)
    expect(readEntry(raw, 'eintrag-a')).toEqual(a)
    expect(readEntry(raw, 'eintrag-b')).toEqual(b)
    expect(readEntry(raw, 'neu')).toEqual(NO_FILTERS)
    expect(readEntry(null, 'eintrag-a')).toEqual(NO_FILTERS)
  })

  it('behält nur die zuletzt benutzten Einträge und übersteht kaputte Daten', () => {
    let raw: string | null = null
    for (let i = 0; i < 5; i++) raw = writeEntry(raw, `e${i}`, { ...NO_FILTERS, time: 15 }, 3)
    // e2 erneut benutzt: rückt nach hinten und bleibt
    raw = writeEntry(raw, 'e2', a, 3)
    expect(Object.keys(JSON.parse(raw!))).toEqual(['e3', 'e4', 'e2'])
    expect(readEntry('kein json', 'e1')).toEqual(NO_FILTERS)
    expect(readEntry(JSON.stringify({ e1: 'kaputt' }), 'e1')).toEqual(NO_FILTERS)
    expect(readEntry(writeEntry('kein json', 'e1', a), 'e1')).toEqual(a)
  })
})

describe('Gesetzte Filter', () => {
  const f = { ...NO_FILTERS, time: 15, meat: 'much' as const, few: true, tags: ['low-carb'], sort: 'zeit' as const, onlyFav: true, keyword: ' ' }

  it('übersetzt in die Rezeptsuche', () => {
    expect(toRecipeFilter(f, 'pasta')).toEqual({
      chapter: 'pasta',
      meal: null,
      keyword: ' ',
      maxTotalTime: 15,
      meat: 'much',
      kcal: null,
      maxIngredients: FEW_INGREDIENTS_MAX,
      tags: ['low-carb'],
    })
    expect(toRecipeFilter(NO_FILTERS).maxIngredients).toBeNull()
  })

  it('zählt für den Knopf und für die Trefferzeile', () => {
    // Zeit, Fleisch, wenige Zutaten, eine Eigenschaft, Sortierung
    expect(sheetFilterCount(f)).toBe(5)
    // Zeit, Fleisch, wenige Zutaten, eine Eigenschaft, Favoriten – Sortierung und leere Suche zählen nicht
    expect(activeFilterCount(f)).toBe(5)
    expect(sheetFilterCount(NO_FILTERS)).toBe(0)
    expect(activeFilterCount(NO_FILTERS)).toBe(0)
  })

  it('zeigt jede Einstellung als Chip, der genau sie wieder entfernt', () => {
    const chips = activeChips(f)
    expect(chips.map((c) => c.label)).toEqual(['Fertig in 15 Min.', 'Viel Fleisch', `Bis ${FEW_INGREDIENTS_MAX} Zutaten`, 'Low Carb', 'Schnell fertig zuerst'])
    for (const c of chips) {
      const after = { ...f, ...c.clear }
      expect(sheetFilterCount(after), c.label).toBe(sheetFilterCount(f) - 1)
    }
    expect(activeChips(NO_FILTERS)).toEqual([])
  })

  it('setzt „Filtern & sortieren“ zurück, lässt Suche und Schnellfilter stehen', () => {
    const reset = { ...f, ...NO_SHEET_FILTERS }
    expect(sheetFilterCount(reset)).toBe(0)
    expect(reset).toMatchObject({ onlyFav: true, keyword: ' ' })
  })

  it('nimmt Eigenschaften hinzu und wieder heraus', () => {
    expect(toggleTag([], 'vegan')).toEqual(['vegan'])
    expect(toggleTag(['vegan', 'low-carb'], 'vegan')).toEqual(['low-carb'])
  })
})
