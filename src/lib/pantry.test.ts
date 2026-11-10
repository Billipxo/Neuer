import { describe, expect, it } from 'vitest'
import { choicesFromShopping, matchRecipes, missingIngredients, pantryChoices, recipeNeeds } from './pantry'
import { RECIPES, getRecipe } from './recipes'
import type { ShoppingItem } from '../types'

describe('Was habe ich da?', () => {
  it('ignoriert Salz, Öl und Gewürze – Zwiebel und Knoblauch optional', () => {
    const r = getRecipe('chili-con-carne')!
    const needs = recipeNeeds(r, { assumeBasics: true })
    expect(needs).toEqual(expect.arrayContaining(['Hackfleisch', 'Paprika', 'Dosentomaten', 'Bohnen (Dose)', 'Mais', 'Reis']))
    expect(needs).not.toContain('Öl')
    expect(needs).not.toContain('Kreuzkümmel')
    expect(needs).not.toContain('Zwiebeln')
    expect(recipeNeeds(r, { assumeBasics: false })).toContain('Zwiebeln')
  })
  it('bietet häufige Zutaten zur Auswahl an', () => {
    const choices = pantryChoices(RECIPES)
    expect(choices.length).toBeGreaterThan(80)
    expect(choices.slice(0, 15).map((c) => c.name)).toEqual(expect.arrayContaining(['Eier', 'Kartoffeln']))
    expect(choices.find((c) => c.name === 'Salz')).toBeUndefined()
  })
  it('sortiert Rezepte nach fehlenden Zutaten', () => {
    const res = matchRecipes(RECIPES, ['Eier', 'Spinat', 'Feta'], { assumeBasics: true })
    expect(res[0].recipe.id).toBe('spinat-feta-omelett')
    expect(res[0].missing).toEqual([])
    expect(res[0].coverage).toBe(1)
    for (let i = 1; i < res.length; i++) expect(res[i].missing.length).toBeGreaterThanOrEqual(res[i - 1].missing.length)
    expect(matchRecipes(RECIPES, [], { assumeBasics: true })).toEqual([])
  })
  it('liefert die fehlenden Zutaten für die Einkaufsliste', () => {
    const r = getRecipe('griechischer-salat')!
    const missing = missingIngredients(r, ['Feta', 'Oliven'])
    expect(missing.map((i) => i.name)).toEqual(['Feta', 'Oliven'])
  })
  it('übernimmt den Vorrat aus der Einkaufsliste', () => {
    const item = (name: string, in_stock = true): ShoppingItem => ({ id: name, name, amount: null, unit: null, category: 'sonstiges', checked: false, in_stock, source: 'manual' })
    const res = choicesFromShopping([item('Kartoffeln'), item('eier'), item('Reis', false), item('Haferflocken (zart)')], ['Kartoffeln', 'Eier', 'Reis', 'Haferflocken', 'Zwiebeln'])
    expect(res.sort()).toEqual(['Eier', 'Haferflocken', 'Kartoffeln'])
  })
})
