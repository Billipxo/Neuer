/**
 * Grundnahrungsmittel beim Erfassen: Die Nährwerttabelle des Kochbuchs (Äpfel, Haferflocken, Hähnchenbrust, Öl …)
 * liefert sofort und offline Treffer – mit den passenden Maßen (Stück, Scheibe, EL, TL).
 */
import type { IngredientInfo } from '../data/ingredients'
import type { Food } from '../types'
import type { NewFood } from '../hooks/data'
import { searchIngredientTable } from './ingredientSearch'
import { fmtInt } from './format'

/** Reine Würzmittel ohne Nährwert, die beim Erfassen nur stören würden */
const EXCLUDED = new Set(['Salz', 'Meersalz', 'Salz und Pfeffer'])

/** Einheiten, die sich als „Stück“ eintragen lassen */
const PIECE_UNITS = ['Stück', 'Scheibe', 'Zehe', 'Blatt', 'Beutel', 'Rolle', 'Päckchen']

/** Stück-Maß einer Zutat, z. B. 1 Scheibe Brot = 50 g */
export function pieceUnitOf(info: IngredientInfo): { unit: string; grams: number } | null {
  for (const u of PIECE_UNITS) if (info.units[u]) return { unit: u, grams: info.units[u] }
  return null
}

/** Zutat der Nährwerttabelle als Lebensmittel für die eigene Bibliothek */
export function basicFoodFromIngredient(info: IngredientInfo): NewFood {
  const piece = pieceUnitOf(info)
  return {
    name: info.name,
    brand: null,
    barcode: null,
    source: 'custom',
    kcal_100: info.kcal,
    protein_100: info.protein,
    carbs_100: info.carbs,
    fat_100: info.fat,
    serving_g: null,
    piece_g: piece?.grams ?? null,
    tbsp_g: info.units.EL ?? null,
    tsp_g: info.units.TL ?? null,
    image_url: null,
    is_favorite: false,
    last_used_at: null,
    use_count: 0,
  }
}

export interface BasicFoodHit {
  info: IngredientInfo
  food: NewFood
}

/** Sofort-Treffer aus der Nährwerttabelle (ab zwei Zeichen) */
export function searchBasicFoods(query: string, limit = 8): BasicFoodHit[] {
  if (query.trim().length < 2) return []
  return searchIngredientTable(query, limit + EXCLUDED.size)
    .filter((i) => !EXCLUDED.has(i.name))
    .slice(0, limit)
    .map((info) => ({ info, food: basicFoodFromIngredient(info) }))
}

/** Schon gespeichertes Grundnahrungsmittel gleichen Namens in der eigenen Bibliothek */
export function findStoredBasic(foods: Food[], name: string): Food | undefined {
  const n = name.trim().toLowerCase()
  return foods.find((f) => f.source === 'custom' && !f.barcode && f.name.trim().toLowerCase() === n)
}

/** Kurzbeschreibung der Maße, z. B. „1 Stück ≈ 150 g · 1 EL ≈ 12 g“ */
export function basicFoodHint(info: IngredientInfo): string {
  const parts: string[] = []
  const piece = pieceUnitOf(info)
  if (piece) parts.push(`1 ${piece.unit} ≈ ${fmtInt(piece.grams)} g`)
  if (info.units.EL) parts.push(`1 EL ≈ ${fmtInt(info.units.EL)} g`)
  return parts.length ? parts.join(' · ') : 'Grundnahrungsmittel'
}
