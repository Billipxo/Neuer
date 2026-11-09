import { describe, expect, it } from 'vitest'
import { formatQuantity, groupByCategory, guessCategory, mergeIngredients, normalizeQuantity, planAddToList, planRegenerate } from './shopping'
import type { ShoppingItem } from '../types'

const item = (p: Partial<ShoppingItem>): ShoppingItem => ({
  id: Math.random().toString(36),
  name: 'Zwiebel',
  amount: 1,
  unit: 'Stück',
  category: 'obst_gemuese',
  checked: false,
  in_stock: false,
  source: 'plan',
  ...p,
})

describe('Einkaufsliste – Zusammenführen', () => {
  it('normalisiert kg und l', () => {
    expect(normalizeQuantity(1.2, 'l')).toEqual({ amount: 1200, unit: 'ml' })
    expect(normalizeQuantity(1, 'kg')).toEqual({ amount: 1000, unit: 'g' })
    expect(normalizeQuantity(null, 'Prise')).toEqual({ amount: null, unit: 'Prise' })
  })
  it('addiert gleiche Zutaten und Einheiten', () => {
    const merged = mergeIngredients([
      { name: 'Zwiebel', amount: 1, unit: 'Stück', category: 'obst_gemuese' },
      { name: 'zwiebel ', amount: 0.5, unit: 'Stück', category: 'obst_gemuese' },
      { name: 'Kartoffeln', amount: 1, unit: 'kg', category: 'obst_gemuese' },
      { name: 'Kartoffeln', amount: 400, unit: 'g', category: 'obst_gemuese' },
      { name: 'Olivenöl', amount: 1, unit: 'EL', category: 'vorrat' },
      { name: 'Olivenöl', amount: 2, unit: 'TL', category: 'vorrat' },
      { name: 'Salz und Pfeffer', amount: null, unit: '', category: 'vorrat' },
      { name: 'Salz und Pfeffer', amount: null, unit: '', category: 'vorrat' },
    ])
    expect(merged).toEqual([
      { name: 'Zwiebel', amount: 1.5, unit: 'Stück', category: 'obst_gemuese' },
      { name: 'Kartoffeln', amount: 1400, unit: 'g', category: 'obst_gemuese' },
      { name: 'Olivenöl', amount: 1, unit: 'EL', category: 'vorrat' },
      { name: 'Olivenöl', amount: 2, unit: 'TL', category: 'vorrat' },
      { name: 'Salz und Pfeffer', amount: null, unit: '', category: 'vorrat' },
    ])
  })
  it('sortiert nach Kategorien in fester Reihenfolge', () => {
    const groups = groupByCategory([
      { name: 'Reis', category: 'vorrat' as const },
      { name: 'Milch', category: 'milch' as const },
      { name: 'Apfel', category: 'obst_gemuese' as const },
      { name: 'Banane', category: 'obst_gemuese' as const },
    ])
    expect(groups.map((g) => g.label)).toEqual(['Obst & Gemüse', 'Milchprodukte', 'Vorrat'])
    expect(groups[0].items.map((i) => i.name)).toEqual(['Apfel', 'Banane'])
  })
})

describe('Einkaufsliste – Aktualisieren', () => {
  it('erhöht offene Artikel statt sie doppelt anzulegen', () => {
    const open = item({ id: 'a', amount: 1 })
    const done = item({ id: 'b', name: 'Milch', unit: 'ml', amount: 500, checked: true, category: 'milch' })
    const plan = planAddToList([open, done], [
      { name: 'Zwiebel', amount: 2, unit: 'Stück', category: 'obst_gemuese' },
      { name: 'Milch', amount: 200, unit: 'ml', category: 'milch' },
    ])
    expect(plan.updates).toEqual([{ id: 'a', amount: 3 }])
    expect(plan.inserts).toEqual([{ name: 'Milch', amount: 200, unit: 'ml', category: 'milch' }])
  })
  it('ersetzt Plan-Artikel und behält Status sowie eigene Artikel', () => {
    const existing = [
      item({ id: 'p1', name: 'Zwiebel', in_stock: true }),
      item({ id: 'p2', name: 'Reis', unit: 'g', amount: 100, category: 'vorrat', checked: true }),
      item({ id: 'm1', name: 'Kaffee', source: 'manual', unit: null, amount: null, category: 'vorrat' }),
    ]
    const res = planRegenerate(existing, [
      { name: 'Zwiebel', amount: 3, unit: 'Stück', category: 'obst_gemuese' },
      { name: 'Paprika', amount: 2, unit: 'Stück', category: 'obst_gemuese' },
    ])
    expect(res.deleteIds.sort()).toEqual(['p1', 'p2'])
    expect(res.inserts).toEqual([
      { name: 'Zwiebel', amount: 3, unit: 'Stück', category: 'obst_gemuese', checked: false, in_stock: true },
      { name: 'Paprika', amount: 2, unit: 'Stück', category: 'obst_gemuese', checked: false, in_stock: false },
    ])
  })
})

describe('Einkaufsliste – Anzeige', () => {
  it('formatiert Mengen', () => {
    expect(formatQuantity(1400, 'g')).toBe('1,4 kg')
    expect(formatQuantity(250, 'ml')).toBe('250 ml')
    expect(formatQuantity(1.5, 'Stück')).toBe('1,5 Stück')
    expect(formatQuantity(null, '')).toBe('')
  })
  it('errät Kategorien', () => {
    expect(guessCategory('Bananen')).toBe('obst_gemuese')
    expect(guessCategory('Vollmilch')).toBe('milch')
    expect(guessCategory('Lachsfilet')).toBe('fleisch_fisch')
    expect(guessCategory('Reis')).toBe('vorrat')
    expect(guessCategory('Spülmittel')).toBe('sonstiges')
  })
})
