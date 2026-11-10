import { describe, expect, it } from 'vitest'
import { GUIDES } from '../data/guides'
import { getGuide, relatedGuides, weightRows } from './guides'
import { getRecipe, RECIPES } from './recipes'
import { inSeasonNow, seasonalRecipes, seasonRows, seasonScore } from './season'

describe('Kochwissen', () => {
  it('hat vollständige Anleitungen mit gültigen Rezeptverweisen', () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(15)
    expect(new Set(GUIDES.map((g) => g.id)).size).toBe(GUIDES.length)
    for (const g of GUIDES) {
      expect(g.blocks.length, g.id).toBeGreaterThan(1)
      expect(g.summary.length, g.id).toBeGreaterThan(20)
      g.recipeIds?.forEach((id) => expect(getRecipe(id), `${g.id} → ${id}`).toBeDefined())
      for (const b of g.blocks) if (b.type === 'table') b.rows.forEach((r) => expect(r.length, g.id).toBe(b.head.length))
    }
  })
  it('findet passende Anleitungen zu Rezepten', () => {
    const ids = (id: string) => relatedGuides(getRecipe(id)!).map((g) => g.id)
    expect(ids('suesskartoffel-pommes')).toContain('heissluftfritteuse')
    expect(ids('haehnchen-curry-joghurt')).toEqual(expect.arrayContaining(['kerntemperaturen', 'reis-kochen']))
    expect(ids('dal-rote-linsen')).toEqual(expect.arrayContaining(['reis-kochen', 'huelsenfruechte']))
    expect(getGuide('gibt-es-nicht')).toBeUndefined()
    // höchstens drei pro Rezept
    RECIPES.forEach((r) => expect(relatedGuides(r).length).toBeLessThanOrEqual(3))
  })
  it('erzeugt eine Gewichtstabelle', () => {
    const rows = weightRows()
    expect(rows).toEqual(expect.arrayContaining([['1 Stück Zwiebel', 'ca. 80 g'], ['1 Zehe Knoblauch', 'ca. 4 g']]))
    expect(rows.some(([n]) => n.includes('Pfeffer'))).toBe(false)
  })
})

describe('Saison', () => {
  it('kennt die Saison im November und im Juli', () => {
    const nov = inSeasonNow(11)
    expect(nov).toEqual(expect.arrayContaining(['Grünkohl', 'Rosenkohl', 'Kürbis', 'Äpfel']))
    expect(nov).not.toContain('Spargel')
    expect(inSeasonNow(5)).toContain('Spargel')
    expect(seasonRows(11)[0].months).toContain(11)
  })
  it('bewertet Rezepte nach Saison', () => {
    expect(seasonScore(getRecipe('gruenkohl-kartoffeln')!, 11).inSeason).toContain('Grünkohl')
    expect(seasonScore(getRecipe('spargel-kartoffeln')!, 11).outOfSeason).toContain('Spargel')
    const nov = seasonalRecipes(RECIPES, 11).map((r) => r.id)
    expect(nov).toContain('gruenkohl-kartoffeln')
    expect(nov).not.toContain('spargel-kartoffeln')
    expect(seasonalRecipes(RECIPES, 5).map((r) => r.id)).toContain('spargel-kartoffeln')
  })
})
