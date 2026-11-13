import { describe, expect, it } from 'vitest'
import { chunk, parseBackup, planImport, type Backup, type Row } from './backup'

const ids = () => {
  let n = 0
  return () => `neu-${++n}`
}

const backup: Backup = {
  exportedAt: '2026-11-12T10:00:00.000Z',
  profile: { id: 'alt', created_at: 'x', name: 'Alex', kcal_target: 1900, favorite_recipes: ['shakshuka', 'v-alt'] },
  tables: {
    foods: [
      { id: 'f-alt', user_id: 'u1', name: 'Haferflocken', brand: null, barcode: null, kcal_100: 372 },
      { id: 'f-alt2', user_id: 'u1', name: 'Skyr', brand: 'Molkerei', barcode: '123', kcal_100: 63 },
    ],
    dishes: [{ id: 'd-alt', user_id: 'u1', name: 'Müsli', servings: 1, ingredients: [{ food_id: 'f-alt', name: 'Haferflocken', grams: 40 }] }],
    recipe_variants: [{ id: 'v-alt', user_id: 'u1', title: 'Bolognese light', base_recipe_id: 'spaghetti-bolognese', servings: 4, ingredients: [1, 2] }],
    log_entries: [
      { id: 'l1', user_id: 'u1', date: '2026-11-10', meal: 'breakfast', name: 'Haferflocken', amount: 40, unit: 'g', kcal: 149, food_id: 'f-alt', dish_id: null, recipe_id: null, created_at: '2026-11-10T07:00:00Z' },
      { id: 'l2', user_id: 'u1', date: '2026-11-10', meal: 'lunch', name: 'Bolognese light', amount: 1, unit: 'serving', kcal: 480, food_id: null, dish_id: null, recipe_id: 'v-alt' },
      { id: 'l3', user_id: 'u1', date: '2026-11-10', meal: 'dinner', name: 'Shakshuka', amount: 1, unit: 'serving', kcal: 400, food_id: null, dish_id: null, recipe_id: 'shakshuka' },
      { id: 'l4', user_id: 'u1', date: '2026-11-10', meal: 'snack', name: 'Müsli', amount: 1, unit: 'serving', kcal: 250, food_id: null, dish_id: 'd-alt', recipe_id: null },
    ],
    water_logs: [
      { id: 'w1', date: '2026-11-10', ml: 250 },
      { id: 'w2', date: '2026-11-10', ml: 250 },
    ],
    weight_logs: [{ id: 'g1', date: '2026-11-10', kg: 82 }],
    plan_items: [{ id: 'p1', date: '2026-11-13', meal: 'dinner', kind: 'recipe', title: 'Bolognese light', servings: 2, recipe_id: 'v-alt', dish_id: null }],
    shopping_items: [{ id: 's1', name: 'Kaffee', unit: '', amount: null, source: 'manual' }],
    achievements: [{ id: 'a1', key: 'first_entry', unlocked_at: 'x' }],
  },
}

describe('Sicherung einspielen', () => {
  it('liest nur echte Teller-Sicherungen', () => {
    expect(() => parseBackup('kein json')).toThrow(/gültiges JSON/)
    expect(() => parseBackup('[1,2]')).toThrow(/keine Teller-Sicherung/)
    expect(() => parseBackup('{"etwas":1}')).toThrow(/keine Teller-Sicherung/)
    expect(() => parseBackup('{"foods":"kaputt"}')).toThrow(/beschädigt.*Lebensmittel/)
    const ok = parseBackup(JSON.stringify({ exportiert_am: '2026-11-12T10:00:00Z', profil: { name: 'A' }, foods: [{ name: 'x' }], unbekannt: [1] }))
    expect(ok.exportedAt).toBe('2026-11-12T10:00:00Z')
    expect(ok.tables.foods).toHaveLength(1)
    expect(Object.keys(ok.tables)).toEqual(['foods'])
  })

  it('vergibt neue IDs und schreibt Verweise um', () => {
    const plan = planImport(backup, {}, ids())
    const rows = (t: string) => plan.inserts.find((i) => i.table === t)?.rows ?? []
    expect(plan.inserts.map((i) => i.table)).toEqual(['foods', 'dishes', 'recipe_variants', 'log_entries', 'water_logs', 'weight_logs', 'plan_items', 'shopping_items', 'achievements'])
    expect(plan.total).toBe(14)
    const [hafer] = rows('foods')
    expect(hafer).toMatchObject({ id: 'neu-1', name: 'Haferflocken' })
    expect(hafer.user_id).toBeUndefined()
    const [muesli] = rows('dishes')
    expect((muesli.ingredients as Row[])[0].food_id).toBe('neu-1')
    const variantId = rows('recipe_variants')[0].id
    const log = rows('log_entries')
    expect(log[0]).toMatchObject({ food_id: 'neu-1', created_at: '2026-11-10T07:00:00Z' })
    expect(log[0].id).toBeUndefined()
    expect(log[1].recipe_id).toBe(variantId)
    // Kochbuch-Rezepte behalten ihre ID
    expect(log[2].recipe_id).toBe('shakshuka')
    expect(log[3].dish_id).toBe(muesli.id)
    expect(rows('plan_items')[0].recipe_id).toBe(variantId)
    // zwei gleiche Gläser Wasser bleiben zwei Einträge
    expect(rows('water_logs')).toHaveLength(2)
    expect(plan.profile).toMatchObject({ name: 'Alex', favorite_recipes: ['shakshuka', variantId] })
    expect(plan.profile!.id).toBeUndefined()
  })

  it('überspringt, was schon vorhanden ist – auch beim zweiten Einspielen', () => {
    const first = planImport(backup, {}, ids())
    // Zustand nach dem ersten Einspielen nachbilden (Zeilen ohne ID bekommen eine)
    let n = 0
    const existing = Object.fromEntries(first.inserts.map((i) => [i.table, i.rows.map((r) => ({ id: `x-${++n}`, ...r }))]))
    const second = planImport(backup, existing, ids())
    expect(second.total).toBe(0)
    expect(second.inserts).toEqual([])
    expect(second.counts.log_entries).toEqual({ added: 0, skipped: 4 })
    expect(second.counts.water_logs).toEqual({ added: 0, skipped: 2 })
    // Favoriten zeigen auf die vorhandene Variante
    const variantId = (existing.recipe_variants as Row[])[0].id
    expect(second.profile!.favorite_recipes).toEqual(['shakshuka', variantId])
  })

  it('ergänzt nur Fehlendes und nutzt vorhandene Lebensmittel für Verweise', () => {
    const existing = {
      foods: [{ id: 'f-da', name: 'haferflocken', brand: null, barcode: null, kcal_100: 372 }],
      water_logs: [{ id: 'w-da', date: '2026-11-10', ml: 250 }],
      weight_logs: [{ id: 'g-da', date: '2026-11-10', kg: 81.5 }],
      achievements: [{ id: 'a-da', key: 'first_entry' }],
    }
    const plan = planImport(backup, existing, ids())
    expect(plan.counts.foods).toEqual({ added: 1, skipped: 1 })
    // eines der beiden Gläser gab es schon
    expect(plan.counts.water_logs).toEqual({ added: 1, skipped: 1 })
    // ein Gewicht pro Tag, jedes Abzeichen einmal
    expect(plan.counts.weight_logs).toEqual({ added: 0, skipped: 1 })
    expect(plan.counts.achievements).toEqual({ added: 0, skipped: 1 })
    const log = plan.inserts.find((i) => i.table === 'log_entries')!.rows
    expect(log[0].food_id).toBe('f-da')
  })

  it('setzt unbekannte Verweise auf leer und teilt in Päckchen', () => {
    const plan = planImport({ exportedAt: null, profile: null, tables: { log_entries: [{ id: 'l', date: '2026-11-10', meal: 'lunch', name: 'x', amount: 1, unit: 'g', kcal: 1, food_id: 'gibt-es-nicht', dish_id: 'auch-nicht', recipe_id: null }] } }, {}, ids())
    expect(plan.inserts[0].rows[0]).toMatchObject({ food_id: null, dish_id: null, recipe_id: null })
    expect(plan.profile).toBeNull()
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })
})
