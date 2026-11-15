/**
 * Grundnahrungsmittel beim Erfassen: Die Nährwerttabelle des Kochbuchs (Äpfel, Haferflocken, Hähnchenbrust, Öl …)
 * liefert sofort und offline Treffer – mit den passenden Maßen (Stück, Scheibe, EL, TL).
 */
import { INGREDIENT_LIST, type IngredientInfo } from '../data/ingredients'
import { EVERYDAY_FOODS, type EverydayFood } from '../data/everydayFoods'
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

// --- Sofort-Suche: Grundnahrungsmittel und Alltägliches zusammen ----------------------------------------------

/** Alltägliches (Brötchen, Döner, Cappuccino …) als Lebensmittel für die eigene Bibliothek */
export function everydayFoodToNew(e: EverydayFood): NewFood {
  return {
    name: e.name,
    brand: null,
    barcode: null,
    source: 'custom',
    kcal_100: e.kcal,
    protein_100: e.protein,
    carbs_100: e.carbs,
    fat_100: e.fat,
    serving_g: e.portion,
    piece_g: e.piece,
    tbsp_g: null,
    tsp_g: null,
    image_url: null,
    is_favorite: false,
    last_used_at: null,
    use_count: 0,
  }
}

/** Typische Menge, z. B. „1 Döner ≈ 350 g“ oder „1 Dose = 330 ml“ */
export function everydayHint(e: EverydayFood): string {
  const grams = e.piece ?? e.portion ?? 100
  if (e.liquid) return /\(/.test(e.measure) ? `1 ${e.measure}` : `1 ${e.measure} = ${fmtInt(grams)} ml`
  return `1 ${e.measure} ≈ ${fmtInt(grams)} g`
}

export interface QuickFoodHit {
  key: string
  name: string
  /** Typische Menge oder Art des Treffers */
  subtitle: string
  /** kcal für die typische Menge (sonst pro 100 g) */
  kcal: number
  kcalLabel: string
  food: NewFood
  /** Typische Menge in Gramm, falls bekannt – für Vorschläge beim Schnell-Eintrag */
  typicalGrams: number | null
  /** Bezeichnung der typischen Menge, z. B. „1 Döner“ */
  typicalLabel: string | null
}

/** Für den Vergleich: klein, ohne Akzente; ß = ss, und ae/oe/ue gelten wie ä/ö/ü („Doener“ findet „Döner“) */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
}

/** Wie gut passt ein Name zur Suche? Kleiner ist besser, -1 heißt gar nicht */
function matchScore(q: string, name: string, others: string[]): number {
  const n = norm(name)
  const o = others.map(norm)
  if (n === q) return 0
  if (o.some((x) => x === q)) return 1
  if (n.startsWith(q)) return 2
  if (o.some((x) => x.startsWith(q))) return 3
  if (n.split(/[\s\-(),/]+/).some((w) => w.startsWith(q))) return 4
  if (n.includes(q)) return 5
  if (o.some((x) => x.includes(q))) return 6
  return -1
}

function tableHit(info: IngredientInfo): QuickFoodHit {
  const food = basicFoodFromIngredient(info)
  const piece = pieceUnitOf(info)
  const per = (g: number) => Math.round((info.kcal * g) / 100)
  if (piece) {
    return { key: `t:${info.name}`, name: info.name, subtitle: basicFoodHint(info), kcal: per(piece.grams), kcalLabel: 'kcal', food, typicalGrams: piece.grams, typicalLabel: `1 ${piece.unit}` }
  }
  if (info.units.EL) {
    return { key: `t:${info.name}`, name: info.name, subtitle: basicFoodHint(info), kcal: per(info.units.EL), kcalLabel: 'kcal', food, typicalGrams: info.units.EL, typicalLabel: '1 EL' }
  }
  return { key: `t:${info.name}`, name: info.name, subtitle: 'Grundnahrungsmittel', kcal: info.kcal, kcalLabel: 'kcal/100 g', food, typicalGrams: null, typicalLabel: null }
}

function everydayHit(e: EverydayFood): QuickFoodHit {
  const grams = e.piece ?? e.portion
  return {
    key: `a:${e.name}`,
    name: e.name,
    subtitle: everydayHint(e),
    kcal: grams ? Math.round((e.kcal * grams) / 100) : e.kcal,
    kcalLabel: grams ? 'kcal' : 'kcal/100 g',
    food: everydayFoodToNew(e),
    typicalGrams: grams,
    typicalLabel: grams ? `1 ${e.measure.replace(/\s*\(.*\)$/, '')}` : null,
  }
}

/**
 * Sofort-Treffer beim Erfassen – ohne Internet: Grundnahrungsmittel aus der Nährwerttabelle und Alltägliches
 * (Brötchen, Döner, Cappuccino …) mit typischer Menge. Genaue Namenstreffer zuerst, dann Wortanfänge, dann der Rest.
 */
export function searchQuickFoods(query: string, limit = 10): QuickFoodHit[] {
  const q = norm(query.trim())
  if (q.length < 2) return []
  const candidates: { hit: () => QuickFoodHit; name: string; score: number; order: number }[] = []
  INGREDIENT_LIST.forEach((info, i) => {
    if (EXCLUDED.has(info.name)) return
    const score = matchScore(q, info.name, info.base !== info.name ? [info.base] : [])
    if (score >= 0) candidates.push({ hit: () => tableHit(info), name: info.name, score, order: 1000 + i })
  })
  EVERYDAY_FOODS.forEach((e, i) => {
    const score = matchScore(q, e.name, e.aliases)
    if (score >= 0) candidates.push({ hit: () => everydayHit(e), name: e.name, score, order: i })
  })
  return candidates
    .sort(
      (a, b) =>
        a.score - b.score ||
        // gleich gut: Treffer am Namensanfang vor Treffern über andere Begriffe, kurze Namen vor langen
        Number(!norm(a.name).startsWith(q)) - Number(!norm(b.name).startsWith(q)) ||
        a.name.length - b.name.length ||
        a.order - b.order,
    )
    .slice(0, limit)
    .map((c) => c.hit())
}

/** Füllwörter, die bei Vorschlägen nichts bedeuten („Döner beim Imbiss“ → „Döner“) */
const FILLERS = new Set(['mit', 'ohne', 'und', 'oder', 'vom', 'von', 'beim', 'bei', 'im', 'am', 'zum', 'zur', 'aus', 'für', 'der', 'die', 'das', 'den', 'dem', 'ein', 'eine', 'einen', 'meine', 'mein', 'selbst', 'gemacht', 'hausgemacht', 'groß', 'große', 'großer', 'klein', 'kleine', 'kleiner'])

/**
 * Vorschläge zu einem frei eingetippten Namen: erst der ganze Name, sonst die einzelnen Wörter –
 * so findet „Pizza vom Italiener“ die Pizzen und „Döner beim Imbiss“ den Döner.
 */
export function suggestFoods(name: string, limit = 4): QuickFoodHit[] {
  const whole = searchQuickFoods(name, limit)
  if (whole.length) return whole
  const words = name
    .split(/[\s,;/+&-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !FILLERS.has(w.toLowerCase()))
  const seen = new Set<string>()
  const out: QuickFoodHit[] = []
  for (const w of words) {
    for (const h of searchQuickFoods(w, limit)) {
      if (seen.has(h.key)) continue
      seen.add(h.key)
      out.push(h)
      if (out.length >= limit) return out
    }
  }
  return out
}
