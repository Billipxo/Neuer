import { describe, expect, it } from 'vitest'
import { ENGLISH_TARGETS, englishToGerman } from './englishFoods'
import { searchQuickFoods, suggestFoods } from './basicFoods'

describe('Englische Suchbegriffe', () => {
  it('übersetzt Mehrwort-Begriffe zuerst und lässt Zubereitungswörter weg', () => {
    expect(englishToGerman('grilled chicken breast')).toBe('Hähnchenbrust')
    expect(englishToGerman('Scrambled Eggs')).toBe('Rührei')
    expect(englishToGerman('a bowl of oatmeal with blueberries')).toBe('Haferflocken Heidelbeeren')
    expect(englishToGerman('chicken nuggets')).toBe('Hähnchen nuggets')
  })
  it('lässt deutsche Suchen unverändert', () => {
    expect(englishToGerman('Hähnchenbrust')).toBeNull()
    expect(englishToGerman('Döner')).toBeNull()
    expect(englishToGerman('2 Brötchen')).toBeNull()
  })
  it('jede Übersetzung findet etwas in den eingebauten Lebensmitteln', () => {
    for (const target of ENGLISH_TARGETS) expect(searchQuickFoods(target, 3).length, target).toBeGreaterThan(0)
  })
  it('findet bei englischer Suche die einfachen Lebensmittel', () => {
    expect(suggestFoods('grilled chicken breast', 10)[0].name).toBe('Hähnchenbrust')
    expect(suggestFoods('scrambled eggs', 10)[0].name).toBe('Rührei')
    expect(suggestFoods('peanut butter', 10)[0].name).toBe('Erdnussbutter')
    // „oatmeal“ ist meist der gekochte Haferbrei – Haferflocken stehen gleich dabei
    expect(
      suggestFoods('oatmeal', 10)
        .map((h) => h.name)
        .slice(0, 4),
    ).toEqual(expect.arrayContaining(['Porridge', 'Haferflocken']))
    expect(suggestFoods('banana', 10)[0].name).toMatch(/^Banane/)
  })
  it('behält gute deutsche Treffer vorne', () => {
    expect(suggestFoods('Döner', 10)[0].name).toMatch(/^Döner/)
    expect(suggestFoods('Cappuccino', 10)[0].name).toBe('Cappuccino')
  })
})
