/**
 * Mehreres auf einmal eintragen: Freitext wie „2 Brötchen mit Butter, 1 Cappuccino und eine Banane“ wird in
 * Lebensmittel mit Mengen zerlegt – mit den Werten aus Alltäglichem, der Nährwerttabelle, der eigenen Bibliothek und
 * den eigenen Gerichten. Klappt auch mit diktiertem Text („zwei Brötchen und einen Kaffee“) und mit Größen
 * („große Pommes“, „ein kleines Bier“).
 */
import type { AmountUnit, Dish, Food, MealType, Nutrients } from '../types'
import type { NewFood } from '../hooks/data'
import { nameScore, norm, scoredQuickFoods, type QuickFoodHit } from './basicFoods'
import type { CookbookEntry } from './cookbookIndex'
import { amountToGrams, dishPerServing, nutrientsForFoodAmount, roundNutrients } from './nutrition'
import { fmtAmount } from './units'
import { fmt1, fmtInt } from './format'

export interface MealPart {
  /** Teil der Eingabe, aus dem der Eintrag stammt */
  text: string
  /** Wonach gesucht wurde, z. B. „Käse“ – für andere Treffer und zum Merken der Wahl */
  query: string
  name: string
  /** Gespeichertes Lebensmittel der eigenen Bibliothek oder Vorlage, die beim Eintragen gespeichert wird */
  food: Food | NewFood
  stored: boolean
  /** Eigenes Gericht – wird in Portionen eingetragen (`food` rechnet dann je Portion) */
  dish?: Dish
  /** Rezept aus dem Kochbuch oder eigenes Rezept – ebenfalls in Portionen */
  recipe?: CookbookEntry
  amount: number
  unit: AmountUnit
  grams: number
  kcal: number
  /** z. B. „2 Stück · 120 g“, „1 Glas · 200 ml“ oder „750 ml“ */
  amountLabel: string
  /** Getränk: Menge in ml */
  liquid: boolean
  /** Nährwerte dieser Menge (gerundet) */
  nutrients: Nutrients
  /** Andere passende Lebensmittel mit derselben Menge – zum Tauschen, wenn die App danebenlag */
  alternatives: MealPart[]
  /** Mahlzeit aus dem Text („Frühstück: …“, „mittags …“); sonst gilt die gewählte */
  meal?: MealType
}

export interface MealParse {
  parts: MealPart[]
  /** Teile, zu denen nichts Passendes gefunden wurde */
  unknown: string[]
}

// --- Mahlzeiten im Text ---------------------------------------------------------------------------------------

/**
 * „Frühstück: …“, „Mittag: …“, „zum Abendessen …“, „mittags …“ – alles danach gehört zu dieser Mahlzeit, bis die
 * nächste genannt wird. Mit Doppelpunkt zählen die Namen der Mahlzeiten, ohne nur eindeutige Wendungen.
 */
const MEAL_MARK = new RegExp(
  String.raw`(^|[\s,;.])(?:(frühstück|fruehstueck|mittagessen|mittag|abendessen|abendbrot|abend|snacks?|zwischenmahlzeit)\s*:|(zum\s+(?:frühstück|fruehstueck|mittagessen|mittag|abendessen|abendbrot|kaffee)|als\s+snack|morgens|mittags|abends|nachmittags|zwischendurch)(?=[\s,;:.]|$))`,
  'gi',
)

function mealOf(word: string): MealType {
  const w = norm(word)
  if (w.includes('nachmittag') || w.includes('kaffee')) return 'snack'
  if (w.includes('fruhstuck') || w.includes('morgens')) return 'breakfast'
  if (w.includes('mittag')) return 'lunch'
  if (w.includes('abend')) return 'dinner'
  return 'snack'
}

/**
 * Text in Abschnitte je Mahlzeit. Meist steht die Mahlzeit vorn („Frühstück: Müsli, mittags Döner“); endet der Text mit
 * einer Mahlzeit, gilt jede für das, was davor steht („Müsli zum Frühstück, Döner zum Mittagessen“).
 */
export function splitByMeals(text: string): { meal?: MealType; text: string }[] {
  const marks = [...text.matchAll(MEAL_MARK)].map((m) => ({
    start: (m.index ?? 0) + m[1].length,
    end: (m.index ?? 0) + m[0].length,
    meal: mealOf(m[2] ?? m[3]),
  }))
  const out: { meal?: MealType; text: string }[] = []
  const trailing = marks.length > 0 && !/[a-zäöüß\d]/i.test(text.slice(marks[marks.length - 1].end))
  let last = 0
  if (trailing) {
    for (const m of marks) {
      out.push({ meal: m.meal, text: text.slice(last, m.start) })
      last = m.end
    }
  } else {
    let meal: MealType | undefined
    for (const m of marks) {
      out.push({ meal, text: text.slice(last, m.start) })
      meal = m.meal
      last = m.end
    }
    out.push({ meal, text: text.slice(last) })
  }
  return out.filter((c) => /[a-zäöüß\d]/i.test(c.text))
}

// --- Mengen ---------------------------------------------------------------------------------------------------

const NUMBER_WORDS: Record<string, number> = {
  ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, eins: 1, einmal: 1,
  zwei: 2, zweimal: 2, drei: 3, dreimal: 3, vier: 4, viermal: 4, funf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9,
  zehn: 10, elf: 11, zwolf: 12,
  halb: 0.5, halbe: 0.5, halber: 0.5, halbes: 0.5, halben: 0.5,
  viertel: 0.25, dreiviertel: 0.75, anderthalb: 1.5, eineinhalb: 1.5, zweieinhalb: 2.5,
}
const ARTICLES = new Set(['ein', 'eine', 'einen', 'einem', 'einer'])
const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 }

type UnitKind = 'mass' | 'volume' | 'tbsp' | 'tsp' | 'count' | 'serving' | 'container'
interface UnitDef {
  kind: UnitKind
  /** Gramm bzw. ml je Einheit (bei Gefäßen die übliche Füllmenge) */
  factor: number
  /** Grundform zum Vergleich mit der typischen Menge eines Lebensmittels */
  word: string
  /** So heißt das Gefäß in der Anzeige („1 Glas · 200 ml“) */
  label?: string
}

const UNITS = new Map<string, UnitDef>()
function unit(kind: UnitKind, factor: number, word: string, ...spellings: string[]) {
  for (const s of [word, ...spellings]) UNITS.set(norm(s), { kind, factor, word })
}
function container(ml: number, label: string, ...spellings: string[]) {
  const word = norm(label)
  for (const s of [label, ...spellings]) UNITS.set(norm(s), { kind: 'container', factor: ml, word, label })
}
unit('mass', 1, 'g', 'gr', 'gramm')
unit('mass', 1000, 'kg', 'kilo', 'kilogramm')
unit('volume', 1, 'ml', 'milliliter')
unit('volume', 10, 'cl', 'zentiliter')
unit('volume', 100, 'dl', 'deziliter')
unit('volume', 1000, 'l', 'liter', 'ltr')
unit('tbsp', 1, 'el', 'esslöffel', 'essloeffel')
unit('tsp', 1, 'tl', 'teelöffel', 'teeloeffel')
unit('count', 1, 'stuck', 'stück', 'stücke', 'stückchen', 'stk', 'st')
unit('count', 1, 'scheibe', 'scheiben', 'scheibchen')
unit('count', 1, 'kugel', 'kugeln')
unit('count', 1, 'riegel')
unit('count', 1, 'handvoll')
unit('count', 1, 'stange', 'stangen')
unit('count', 1, 'beutel')
unit('serving', 1, 'portion', 'portionen', 'port')
unit('serving', 1, 'teller')
unit('serving', 1, 'schale', 'schalen', 'schüssel', 'schüsseln')
unit('serving', 1, 'box', 'boxen')
unit('serving', 1, 'packung', 'packungen', 'pck', 'tüte', 'tüten')
container(200, 'Glas', 'gläser')
container(200, 'Tasse', 'tassen')
container(250, 'Becher')
container(330, 'Dose', 'dosen')
container(500, 'Flasche', 'flaschen', 'fl')
container(1000, 'Maß', 'mass')

/** Größe: „große Pommes“ = 1,5 Portionen Pommes, „ein kleines Bier“ = 0,7 Flaschen */
interface SizeDef {
  factor: number
  label: string
}
const SIZES = new Map<string, SizeDef>()
function size(factor: number, label: string, ...spellings: string[]) {
  for (const s of spellings) SIZES.set(norm(s), { factor, label })
}
size(0.7, 'klein', 'klein', 'kleine', 'kleiner', 'kleines', 'kleinen', 'kleinem')
size(1, 'mittel', 'mittel', 'mittlere', 'mittlerer', 'mittleres', 'mittleren', 'normal', 'normale', 'normaler', 'normales', 'normalen')
size(1.5, 'groß', 'groß', 'große', 'großer', 'großes', 'großen', 'großem')
size(2, 'doppelt', 'doppelt', 'doppelte', 'doppelter', 'doppeltes', 'doppelten', 'doppel')
size(2, 'XXL', 'xxl', 'riesig', 'riesige', 'riesiger', 'riesiges', 'riesigen', 'extragroß', 'extragroße', 'extragroßer', 'extragroßes')

/** Größe am Anfang des Textes, z. B. „große Pommes“ oder „XXL-Döner“ – nie das letzte Wort */
function takeSize(s: string): { size: SizeDef | null; rest: string } {
  const m = /^([a-zäöüß]+)(?:\s*-\s*|\s+)(\S.*)$/i.exec(s.trim())
  const def = m ? SIZES.get(norm(m[1])) : undefined
  return def && m ? { size: def, rest: m[2] } : { size: null, rest: s }
}

interface Qty {
  n: number
  unit: UnitDef | null
  size: SizeDef | null
  /** Stand eine Zahl, ein Zahlwort, eine Einheit oder Größe in der Eingabe? */
  explicit: boolean
  /** Text ohne die Mengenangabe */
  rest: string
}

const NO_QTY = (rest: string): Qty => ({ n: 1, unit: null, size: null, explicit: false, rest })

const NUM = String.raw`(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔])`

function parseNumber(s: string): number | null {
  const t = s.replace(/\s+/g, '')
  if (t in FRACTIONS) return FRACTIONS[t]
  const frac = /^(\d+)\/(\d+)$/.exec(t)
  if (frac) return Number(frac[2]) > 0 ? Number(frac[1]) / Number(frac[2]) : null
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Einheit am Anfang des Textes, z. B. „Scheiben Brot“ → Scheibe + „Brot“ */
function takeUnit(s: string): { unit: UnitDef | null; rest: string } {
  const m = /^([a-zäöüß]+)\.?(?:\s+|$)(.*)$/i.exec(s)
  const def = m ? UNITS.get(norm(m[1])) : undefined
  return def && m ? { unit: def, rest: m[2] } : { unit: null, rest: s }
}

/**
 * Menge vorn („2 Brötchen“, „150g Reis“, „zwei Tassen Kaffee“, „ein halbes …“, „2 große Scheiben …“) oder hinten
 * („Brötchen x2“, „Cola 0,5 l“)
 */
function parseQty(text: string): Qty {
  const s = text.trim()
  let n = 1
  let counted = false
  let rest = s
  // Zahl vorn, optional mit „x“ und Einheit. Direkt angehängt zählt nur eine Einheit („150g“, „2x“) – nicht „7up“.
  const lead = new RegExp(`^${NUM}(\\s*)(.*)$`).exec(s)
  if (lead) {
    const value = parseNumber(lead[1])
    const times = /^[x×*](?:\s+|$)(.*)$/i.exec(lead[3])
    const after = times ? times[1] : lead[3]
    if (value !== null && value > 0 && (lead[2] || times || takeUnit(after).unit)) {
      n = value
      counted = true
      rest = after
    }
  }
  // Zahlwort vorn („zwei“, „eine halbe“)
  if (!counted) {
    const words = s.split(/\s+/)
    const w0 = norm(words[0] ?? '')
    if (w0 in NUMBER_WORDS && words.length > 1) {
      let value = NUMBER_WORDS[w0]
      let used = 1
      const w1 = norm(words[1] ?? '')
      if (ARTICLES.has(w0) && w1.startsWith('halb') && w1 in NUMBER_WORDS) {
        value = 0.5
        used = 2
      }
      if (words.length > used) {
        n = value
        counted = true
        rest = words.slice(used).join(' ')
      }
    }
  }
  // Größe und Einheit („große Scheiben …“, „großes Glas …“, „Glas Cola“) – nie den ganzen Rest verbrauchen
  let unit: UnitDef | null = null
  let size: SizeDef | null = null
  const before = takeSize(rest)
  const u = takeUnit(before.rest)
  const after = u.unit ? takeSize(u.rest) : null
  if (u.unit && (after?.rest ?? u.rest).trim()) {
    unit = u.unit
    size = before.size && after?.size ? { factor: before.size.factor * after.size.factor, label: before.size.label } : (before.size ?? after?.size ?? null)
    rest = after?.rest ?? u.rest
  } else if (before.size) {
    size = before.size
    rest = before.rest
  }
  // Menge hinten – nur, wenn vorn keine stand
  if (!counted) {
    const times = new RegExp(`^(.*\\S)\\s*(?:[x×]\\s*${NUM}|\\s${NUM}\\s*[x×])$`, 'i').exec(rest)
    const tail = times ? null : new RegExp(`^(.*\\S)\\s+\\(?${NUM}\\s*([a-zäöüß]+)?\\.?\\)?$`, 'i').exec(rest)
    if (times) {
      const value = parseNumber(times[2] ?? times[3])
      if (value !== null && value > 0) {
        n = value
        counted = true
        rest = times[1]
      }
    } else if (tail) {
      const value = parseNumber(tail[2])
      const def = tail[3] ? UNITS.get(norm(tail[3])) : null
      if (value !== null && value > 0 && def !== undefined) {
        n = value
        counted = true
        unit = def ?? unit
        rest = tail[1]
      }
    }
  }
  return { n, unit, size, explicit: counted || !!unit || !!size, rest: rest.trim() }
}

// --- Lebensmittel finden ----------------------------------------------------------------------------------------

/** Was die Nutzerin bzw. der Nutzer selbst angelegt und gewählt hat */
interface Library {
  foods: readonly Food[]
  dishes: readonly Dish[]
  /** Gemerkte Wahl: Suchwort (normalisiert) → Name, z. B. „kase“ → „Gouda“ */
  remembered: Readonly<Record<string, string>>
  /** Kochbuch und eigene Rezepte (leer, solange das Kochbuch nicht geladen ist) */
  recipes: readonly CookbookEntry[]
}

/** Schlüssel für eine gemerkte Wahl – „Käse“, „käse“ und „Kaese“ sind dasselbe */
export function rememberKey(query: string): string {
  return norm(query.trim())
}

interface Match {
  name: string
  food: Food | NewFood
  stored: boolean
  score: number
  /** Typische Menge, wie sie heißt („Döner“, „Glas“, „Scheibe“) – nur bei Alltäglichem und der Nährwerttabelle */
  measure: string | null
  liquid: boolean
  dish?: Dish
  recipe?: CookbookEntry
  /** Wonach gesucht wurde */
  query: string
}

/** Rezept als Lebensmittel „je Portion“: 1 Portion zählt als 100 Rechen-Gramm */
function recipeAsFood(r: CookbookEntry): NewFood {
  return {
    name: r.title,
    brand: null,
    barcode: null,
    source: 'custom',
    kcal_100: r.nutrition.kcal,
    protein_100: r.nutrition.protein,
    carbs_100: r.nutrition.carbs,
    fat_100: r.nutrition.fat,
    serving_g: 100,
    piece_g: null,
    tbsp_g: null,
    tsp_g: null,
    image_url: null,
    is_favorite: false,
    last_used_at: null,
    use_count: 0,
  }
}

function recipeLabel(r: CookbookEntry, servings: number): string {
  return `${fmt1(servings)} ${servings > 1 ? 'Portionen' : 'Portion'} · ${r.own ? 'dein Rezept' : 'aus dem Kochbuch'}`
}

function recipeMatch(r: CookbookEntry, score: number, query: string): Match {
  return { name: r.title, food: recipeAsFood(r), stored: false, score, measure: 'Portion', liquid: false, recipe: r, query }
}

/** Rezepte, deren Titel passt – eine Stufe schwächer als Alltägliches, außer bei genau diesem Titel */
function recipeMatches(text: string, lib: Library): Match[] {
  const out: Match[] = []
  for (const r of lib.recipes) {
    const score = nameScore(text, r.title)
    if (score >= 0 && score <= 4) out.push(recipeMatch(r, score === 0 ? 0 : score + 1, text))
  }
  return out.sort((a, b) => a.score - b.score || Number(!!b.recipe?.own) - Number(!!a.recipe?.own)).slice(0, 3)
}

/** Gramm je Portion eines eigenen Gerichts – unbekannt, wenn Zutaten nur als Portion angegeben sind */
function dishGramsPerServing(d: Dish): number | null {
  if (d.ingredients.some((i) => i.portion)) return null
  const total = d.ingredients.reduce((sum, i) => sum + i.grams, 0)
  return total > 0 ? total / (d.servings > 0 ? d.servings : 1) : null
}

/** Eigenes Gericht als Lebensmittel „je Portion“: 1 Portion zählt als 100 Rechen-Gramm */
function dishAsFood(d: Dish): NewFood {
  const per = dishPerServing(d)
  return {
    name: d.name,
    brand: null,
    barcode: null,
    source: 'custom',
    kcal_100: per.kcal,
    protein_100: per.protein,
    carbs_100: per.carbs,
    fat_100: per.fat,
    serving_g: 100,
    piece_g: null,
    tbsp_g: null,
    tsp_g: null,
    image_url: null,
    is_favorite: d.is_favorite,
    last_used_at: d.last_used_at,
    use_count: 0,
  }
}

function dishLabel(d: Dish, servings: number): string {
  const per = dishGramsPerServing(d)
  const head = `${fmt1(servings)} ${servings > 1 ? 'Portionen' : 'Portion'}`
  return per ? `${head} · ${fmtInt(servings * per)} g` : head
}

function measureOf(hit: QuickFoodHit): string | null {
  return hit.typicalLabel ? hit.typicalLabel.replace(/^1\s+/, '') : null
}

function fromHit(hit: QuickFoodHit, score: number, query: string): Match {
  return { name: hit.name, food: hit.food, stored: false, score, measure: measureOf(hit), liquid: hit.liquid, query }
}

function dishMatch(d: Dish, score: number, query: string): Match {
  return { name: d.name, food: dishAsFood(d), stored: true, score, measure: 'Portion', liquid: false, dish: d, query }
}

function foodMatch(f: Food, score: number, query: string): Match {
  return { name: f.name, food: f, stored: true, score, measure: null, liquid: false, query }
}

/** Eigene Lebensmittel und Gerichte, die zum Text passen – beste zuerst */
function ownMatches(text: string, lib: Library): Match[] {
  const out: Match[] = []
  for (const f of lib.foods) {
    const score = nameScore(text, f.name)
    if (score >= 0) out.push(foodMatch(f, score, text))
  }
  for (const d of lib.dishes) {
    const score = nameScore(text, d.name)
    if (score >= 0) out.push(dishMatch(d, score, text))
  }
  return out.sort((a, b) => a.score - b.score)
}

/** Gemerkte Wahl („Käse“ → Gouda) als Treffer – aus der eigenen Bibliothek oder den Richtwerten */
function rememberedMatch(text: string, lib: Library): Match | null {
  const name = lib.remembered[rememberKey(text)]
  if (!name) return null
  const n = norm(name)
  const food = lib.foods.find((f) => norm(f.name) === n)
  if (food) return foodMatch(food, 0, text)
  const dish = lib.dishes.find((d) => norm(d.name) === n)
  if (dish) return dishMatch(dish, 0, text)
  const hit = scoredQuickFoods(name, 5).find((h) => norm(h.hit.name) === n)
  if (hit) return fromHit(hit.hit, 0, text)
  const recipe = lib.recipes.find((r) => norm(r.title) === n)
  return recipe ? recipeMatch(recipe, 0, text) : null
}

/**
 * Passende Lebensmittel, bester zuerst: Eigenes vor Richtwerten bei gleich gutem Treffer; mit Einheit („Scheiben
 * Käse“) ein fast so guter Treffer mit genau dieser Einheit; eine gemerkte Wahl immer vorn.
 */
function candidates(text: string, unitWord: string | null, lib: Library, limit = 6): Match[] {
  if (norm(text).length < 2) return []
  const quick = scoredQuickFoods(text, 8).map((s) => fromHit(s.hit, s.score, text))
  // Stabile Sortierung: Bei gleicher Güte bleibt Eigenes vor den Richtwerten, Rezepte kommen danach
  const all = [...ownMatches(text, lib).slice(0, 3), ...quick, ...recipeMatches(text, lib)].sort((a, b) => a.score - b.score)
  const toFront = (m: Match) => {
    const i = all.indexOf(m)
    if (i > 0) all.splice(i, 1)
    if (i !== 0) all.unshift(m)
  }
  if (all.length && unitWord) {
    const best = all[0]
    const fit = quick.find((m) => m.measure && norm(m.measure.split(' ')[0]) === unitWord && m.score <= best.score + 3)
    if (fit && !(best.stored && best.score < fit.score)) toFront(fit)
  }
  const remembered = rememberedMatch(text, lib)
  if (remembered) toFront(remembered)
  // Doppeltes (gespeichertes Grundnahrungsmittel und Vorlage gleichen Namens) nur einmal – ein Rezept gleichen
  // Namens („Spaghetti Bolognese“) ist aber etwas anderes
  const seen = new Set<string>()
  return all
    .filter((m) => {
      const key = `${m.recipe ? 'r:' : ''}${norm(m.name)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
}

function findMatch(text: string, unitWord: string | null, lib: Library): Match | null {
  return candidates(text, unitWord, lib, 1)[0] ?? null
}

/** Füllwörter, die nichts über das Lebensmittel sagen */
const FILLERS = new Set(['mit', 'ohne', 'und', 'oder', 'vom', 'von', 'beim', 'bei', 'im', 'am', 'zum', 'zur', 'aus', 'fur', 'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'meine', 'mein', 'noch', 'dazu', 'etwas', 'bisschen', 'paar', 'selbst', 'gemacht', 'hausgemacht'])

/** Passt der ganze Text nicht, entscheidet das am besten passende einzelne Wort („Pizza vom Italiener“) */
function wordMatch(text: string, unitWord: string | null, lib: Library): Match | null {
  let best: Match | null = null
  for (const w of text.split(/[\s/-]+/)) {
    const k = norm(w)
    if (k.length < 3 || FILLERS.has(k) || UNITS.has(k) || SIZES.has(k) || /\d/.test(k)) continue
    const m = findMatch(w, unitWord, lib)
    if (m && (!best || m.score < best.score)) best = m
  }
  return best
}

// --- Menge in Einheiten der App -------------------------------------------------------------------------------

interface Amount {
  amount: number
  unit: AmountUnit
  grams: number
  /** Menge entspricht der typischen Menge des Lebensmittels („2 Döner“) */
  typical: boolean
  /** Eigene Bezeichnung der Menge, z. B. „1 Glas“ bei einem Gefäß */
  label?: string
  /** Vollständige Anzeige, z. B. bei eigenen Gerichten „2 Portionen · 900 g“ */
  fixedLabel?: string
}

function typicalUnit(m: Match): { unit: AmountUnit; grams: number } {
  const f = m.food
  // Alltägliches und Tabelle zeigen das Stück zuerst, eigene Lebensmittel wie beim Eintragen die Portion
  const order: [AmountUnit, number | null][] = m.stored
    ? [['serving', f.serving_g], ['piece', f.piece_g], ['tbsp', f.tbsp_g]]
    : [['piece', f.piece_g], ['serving', f.serving_g], ['tbsp', f.tbsp_g]]
  for (const [unit, grams] of order) if (grams) return { unit, grams }
  return { unit: 'g', grams: 100 }
}

const WINE = /wein|sekt|prosecco|champagner|cava|cremant/

function amountFor(m: Match, q: Qty): Amount {
  if (m.recipe) {
    // Rezepte in Portionen; Gramm kennt das Rezept nicht – dann 1 Portion
    const massOrVolume = q.unit && (q.unit.kind === 'mass' || q.unit.kind === 'volume')
    const servings = massOrVolume ? 1 : q.n * (q.size?.factor ?? 1)
    return { amount: servings, unit: 'serving', grams: servings * 100, typical: true, fixedLabel: recipeLabel(m.recipe, servings) }
  }
  if (m.dish) {
    const servings = dishServings(m.dish, q)
    return { amount: servings, unit: 'serving', grams: servings * 100, typical: true, fixedLabel: dishLabel(m.dish, servings) }
  }
  const base = baseAmount(m, q)
  const factor = q.size?.factor ?? 1
  if (!q.size || factor === 1 || (q.unit && (q.unit.kind === 'mass' || q.unit.kind === 'volume'))) return base
  // Größe: die typische Menge (oder das Gefäß) passend größer bzw. kleiner, in Gramm
  const grams = Math.round(base.grams * factor)
  const head = amountLabel(m, base).split(' · ')
  return { amount: grams, unit: 'g', grams, typical: false, label: head.length > 1 ? `${head[0]}, ${q.size.label}` : q.size.label }
}

/** Portionen eines eigenen Gerichts; Gramm nur, wenn das Gericht sie kennt */
function dishServings(d: Dish, q: Qty): number {
  if (q.unit && (q.unit.kind === 'mass' || q.unit.kind === 'volume')) {
    const per = dishGramsPerServing(d)
    return per ? Math.round(((q.n * q.unit.factor) / per) * 100) / 100 : 1
  }
  return q.n * (q.size?.factor ?? 1)
}

function baseAmount(m: Match, q: Qty): Amount {
  const f = m.food
  const typ = typicalUnit(m)
  const typical = (n: number): Amount =>
    typ.unit === 'g' ? { amount: n * 100, unit: 'g', grams: n * 100, typical: false } : { amount: n, unit: typ.unit, grams: n * typ.grams, typical: true }
  // Gramm/ml – als Stück oder Portion, wenn es genau aufgeht („0,5 l Bier“ = 1 Flasche)
  const inGrams = (grams: number): Amount => {
    const sizes: [AmountUnit, number | null][] = [['serving', f.serving_g], ['piece', f.piece_g]]
    for (const [unit, size] of sizes) {
      if (!size) continue
      const r = grams / size
      if (r >= 0.5 && Math.abs(r * 2 - Math.round(r * 2)) < 1e-9) return { amount: r, unit, grams, typical: unit === typ.unit }
    }
    return { amount: Math.round(grams), unit: 'g', grams: Math.round(grams), typical: false }
  }
  // Gefäß, das nicht die typische Menge ist („1 Glas Cola“): in ml, mit dem Gefäß in der Anzeige
  const inContainer = (n: number, ml: number, label: string): Amount => ({
    amount: Math.round(n * ml),
    unit: 'g',
    grams: Math.round(n * ml),
    typical: false,
    label: `${fmt1(n)} ${n > 1 ? pluralMeasure(label) : label}`,
  })
  const u = q.unit
  if (!u) {
    // Große Zahl ohne Einheit meint Gramm („150 Reis“), nicht 150 Portionen
    if (q.n > 12 && q.n * typ.grams > 1500) return inGrams(q.n)
    return typical(q.n)
  }
  switch (u.kind) {
    case 'mass':
    case 'volume':
      return inGrams(q.n * u.factor)
    case 'tbsp':
      return f.tbsp_g ? { amount: q.n, unit: 'tbsp', grams: q.n * f.tbsp_g, typical: typ.unit === 'tbsp' } : inGrams(q.n * 15)
    case 'tsp':
      return f.tsp_g ? { amount: q.n, unit: 'tsp', grams: q.n * f.tsp_g, typical: false } : inGrams(q.n * (f.tbsp_g ? f.tbsp_g / 3 : 5))
    default: {
      if (m.measure && norm(m.measure.split(' ')[0]) === u.word) return typical(q.n)
      if (u.kind === 'container') return inContainer(q.n, u.word === 'flasche' && WINE.test(norm(m.name)) ? 750 : u.factor, u.label ?? u.word)
      if (u.kind === 'count' && f.piece_g) return { amount: q.n, unit: 'piece', grams: q.n * f.piece_g, typical: typ.unit === 'piece' }
      if (u.kind === 'serving' && f.serving_g) return { amount: q.n, unit: 'serving', grams: q.n * f.serving_g, typical: typ.unit === 'serving' }
      return typical(q.n)
    }
  }
}

// --- Anzeige ----------------------------------------------------------------------------------------------------

const PLURAL: Record<string, string> = {
  Glas: 'Gläser', Pizza: 'Pizzen', Keks: 'Kekse', Spieß: 'Spieße', Ei: 'Eier', Frucht: 'Früchte', Klecks: 'Kleckse',
  Blatt: 'Blätter', Zweig: 'Zweige', Box: 'Boxen', Kugel: 'Kugeln', Waffel: 'Waffeln', Sandwich: 'Sandwiches',
  Calzone: 'Calzone', Croque: 'Croques', Baguette: 'Baguettes', Pancake: 'Pancakes', Cookie: 'Cookies',
}
const PLURAL_S = new Set(['Bowl', 'Wrap', 'Wing', 'Taco', 'Stick', 'Fajita', 'Enchilada', 'Pita', 'Steak', 'Filet', 'Kotelett', 'Muffin', 'Donut', 'Bagel', 'Brownie', 'Nugget', 'Croissant'])

/** Mehrzahl der typischen Menge: „2 Kugeln“, „3 Scheiben“, „2 Döner“ */
export function pluralMeasure(word: string): string {
  if (word in PLURAL) return PLURAL[word]
  if (PLURAL_S.has(word)) return `${word}s`
  if (/(ung|ion)$/.test(word)) return `${word}en`
  if (/e$/.test(word)) return `${word}n`
  return word
}

function amountLabel(m: Pick<Match, 'measure' | 'liquid'>, a: Amount): string {
  if (a.fixedLabel) return a.fixedLabel
  const size = `${fmtInt(a.grams)} ${m.liquid ? 'ml' : 'g'}`
  if (a.label) return `${a.label} · ${size}`
  if (a.unit === 'g') return size
  if (a.typical && m.measure) {
    const many = a.amount > 1
    const measure = many ? (m.measure.includes(' ') ? `× ${m.measure}` : pluralMeasure(m.measure)) : m.measure
    return `${fmt1(a.amount)} ${measure} · ${size}`
  }
  return `${fmtAmount(a.amount, a.unit)} · ${size}`
}

/** Menge eines erkannten Eintrags ändern – Gramm, kcal und Anzeige werden neu berechnet */
export function withAmount(part: MealPart, amount: number, unit: AmountUnit): MealPart | null {
  if (part.recipe) {
    if (unit !== 'serving' || !(amount > 0)) return null
    const n = nutrientsForFoodAmount(part.food as Food, amount, 'serving')
    if (!n) return null
    return { ...part, amount, unit, grams: amount * 100, kcal: Math.round(n.kcal), nutrients: roundNutrients(n), amountLabel: recipeLabel(part.recipe, amount) }
  }
  if (part.dish) {
    if (unit !== 'serving' || !(amount > 0)) return null
    const n = nutrientsForFoodAmount(part.food as Food, amount, 'serving')
    if (!n) return null
    return { ...part, amount, unit, grams: amount * 100, kcal: Math.round(n.kcal), nutrients: roundNutrients(n), amountLabel: dishLabel(part.dish, amount) }
  }
  const n = nutrientsForFoodAmount(part.food as Food, amount, unit)
  const grams = amountToGrams(amount, unit, part.food)
  if (!n || !grams) return null
  const a: Amount = { amount, unit, grams, typical: false }
  return {
    ...part,
    amount,
    unit,
    grams,
    kcal: Math.round(n.kcal),
    nutrients: roundNutrients(n),
    amountLabel: amountLabel({ measure: null, liquid: part.liquid }, a),
  }
}

// --- Zerlegen ---------------------------------------------------------------------------------------------------

/** Trennt Lebensmittel sicher: Komma, Semikolon, Zeilenumbruch, Plus, Schrägstrich oder Gedankenstrich */
const HARD = /\s*(?:[,;\n+]|\s[/–-]\s)\s*/
/**
 * Trennt, wenn der Teil als Ganzes kein bekanntes Gericht ist („Hähnchen mit Reis und Gemüse“ bleibt zusammen).
 * Die Trennwörter bleiben erhalten, damit sich Namen mit „und“ wieder zusammensetzen lassen.
 */
const SOFT_KEEP = /(\s+(?:und|&|sowie|dazu|plus|außerdem|ausserdem)\s+)/i
const WITH = /\s+mit\s+/i
/** Wörter vor der Menge, die nichts zählen („noch ein Bier“, „dazu 2 Brötchen“, „zum Frühstück …“) */
const LEADING =
  /^(?:(?:und|dazu|noch|plus|sowie|außerdem|ausserdem|mit|auch|dann|heute|gestern|morgens|mittags|abends|nachmittags|zwischendurch|zum\s+(?:frühstück|fruehstueck|mittag(?:essen)?|abendessen|kaffee|nachtisch|dessert)|als\s+(?:snack|nachtisch|dessert))\b[\s:]*)+/i

function clean(s: string): string {
  return s
    .replace(LEADING, '')
    .replace(/^[„“"'»«]+|[„“"'»«.!?]+$/g, '')
    .trim()
}

interface Out {
  parts: MealPart[]
  unknown: string[]
  explicit: boolean
}

function buildPart(m: Match, q: Qty, text: string): MealPart | null {
  const a = amountFor(m, q)
  const n = nutrientsForFoodAmount(m.food as Food, a.amount, a.unit)
  if (!n || !(a.grams > 0)) return null
  return {
    text,
    query: m.query,
    name: m.name,
    food: m.food,
    stored: m.stored,
    dish: m.dish,
    recipe: m.recipe,
    amount: a.amount,
    unit: a.unit,
    grams: a.grams,
    kcal: Math.round(n.kcal),
    amountLabel: amountLabel(m, a),
    liquid: m.liquid,
    nutrients: roundNutrients(n),
    alternatives: [],
  }
}

/** Eintrag mit bis zu fünf anderen Treffern derselben Suche – gleiche Menge, zum Tauschen */
function addPart(out: Out, m: Match, q: Qty, text: string, lib: Library) {
  const part = buildPart(m, q, text)
  if (!part) {
    out.unknown.push(text)
    return
  }
  const key = (x: Match) => `${x.recipe ? 'r:' : ''}${norm(x.name)}`
  part.alternatives = candidates(m.query, q.unit?.word ?? null, lib, 7)
    .filter((c) => key(c) !== key(m))
    .map((c) => buildPart(c, q, text))
    .filter((p): p is MealPart => !!p)
    .slice(0, 5)
  out.parts.push(part)
}

/** Ein Teil ist als Ganzes ein bekannter Name („Halbes Hähnchen“, „Kaffee mit Milch“, „Quark 20 %“) */
function wholeName(s: string, lib: Library): Match | null {
  const direct = findMatch(s, null, lib)
  // Auch der Anfang eines Rezepttitels („Dal mit roten …“ beim Tippen) ist ein Name, keine Liste
  if (direct && (direct.score <= 2 || (direct.recipe && direct.score <= 3))) return direct
  const words = s.split(/\s+/)
  if (words.length > 1 && ARTICLES.has(norm(words[0]))) {
    const rest = findMatch(words.slice(1).join(' '), null, lib)
    if (rest && rest.score <= 1) return rest
  }
  return null
}

function parseSegment(segment: string, lib: Library, out: Out, nested = false) {
  const text = clean(segment)
  if (!text || FILLERS.has(norm(text))) return
  const whole = wholeName(text, lib)
  if (whole) {
    addPart(out, whole, NO_QTY(text), text, lib)
    return
  }
  const q = parseQty(text)
  if (q.explicit) out.explicit = true
  const m = q.rest ? findMatch(q.rest, q.unit?.word ?? null, lib) : null
  if (m && m.score <= 2) {
    addPart(out, m, q, text, lib)
    return
  }
  // „und“: mehrere Lebensmittel, jedes mit eigener Menge – außer ein Name enthält selbst ein „und“
  // („Hähnchen mit Reis und Gemüse und eine Cola“, „Dal mit roten Linsen und Spinat und Wasser“)
  if (!nested) {
    const tokens = text.split(SOFT_KEEP)
    if (tokens.length > 1) {
      const pieces = tokens.filter((_, i) => i % 2 === 0)
      const seps = tokens.filter((_, i) => i % 2 === 1)
      const joined = (from: number, to: number) => pieces.slice(from, to + 1).reduce((acc, piece, k) => (k === 0 ? piece : acc + seps[from + k - 1] + piece), '')
      let i = 0
      while (i < pieces.length) {
        let end = i
        for (let j = pieces.length - 1; j > i; j--) {
          const name = wholeName(clean(joined(i, j)), lib)
          if (name && name.score <= 1) {
            end = j
            break
          }
        }
        parseSegment(joined(i, end), lib, out, true)
        i = end + 1
      }
      return
    }
  }
  // „mit“: Hauptsache und Beilage – „2 Brötchen mit Butter“ heißt Butter für beide
  const withParts = q.rest.split(WITH)
  if (withParts.length === 2) {
    const left = findMatch(withParts[0], q.unit?.word ?? null, lib) ?? wordMatch(withParts[0], q.unit?.word ?? null, lib)
    const rq = parseQty(clean(withParts[1]))
    const right = rq.rest ? (findMatch(rq.rest, rq.unit?.word ?? null, lib) ?? wordMatch(rq.rest, rq.unit?.word ?? null, lib)) : null
    if (left || right) {
      if (left) addPart(out, left, q, withParts[0], lib)
      else out.unknown.push(withParts[0])
      const perPiece = !q.unit || ['count', 'serving', 'container'].includes(q.unit.kind)
      const sideQty: Qty = rq.explicit ? rq : { ...NO_QTY(rq.rest), n: perPiece && q.n <= 12 ? q.n : 1 }
      if (right) addPart(out, right, sideQty, withParts[1], lib)
      else out.unknown.push(withParts[1])
      return
    }
  }
  const fallback = m ?? (q.rest ? wordMatch(q.rest, q.unit?.word ?? null, lib) : null)
  if (fallback) addPart(out, fallback, q, text, lib)
  else out.unknown.push(text)
}

/**
 * Zerlegt eine Eingabe in Einträge. Gibt `null` zurück, wenn es nichts zu zerlegen gibt – ein einzelnes Lebensmittel
 * ohne Mengenangabe findet die normale Suche.
 */
export function parseMealText(
  input: string,
  foods: readonly Food[] = [],
  dishes: readonly Dish[] = [],
  remembered: Readonly<Record<string, string>> = {},
  recipes: readonly CookbookEntry[] = [],
): MealParse | null {
  const lib: Library = { foods, dishes, remembered, recipes }
  const input2 = input.trim()
  if (input2.length < 3) return null
  const out: Out = { parts: [], unknown: [], explicit: false }
  let segmentCount = 0
  // Je Mahlzeit („Frühstück: … Mittag: …“) für sich zerlegen
  for (const chunk of splitByMeals(input2)) {
    let text = chunk.text
    // Andere Bezeichnungen davor („Montag: 2 Brötchen“) zählen nicht
    if (text.includes(':')) text = text.slice(text.lastIndexOf(':') + 1)
    // Dezimalkomma schützen („0,5 l“), damit nur Kommas zwischen Lebensmitteln trennen
    const KEEP = '\u0001'
    const segments = text
      .replace(/(\d),(\d)/g, `$1${KEEP}$2`)
      .split(HARD)
      .map((s) => s.split(KEEP).join(',').trim())
      .filter(Boolean)
      .slice(0, Math.max(0, 20 - segmentCount))
    segmentCount += segments.length
    const before = out.parts.length
    for (const s of segments) parseSegment(s, lib, out)
    if (chunk.meal) {
      out.explicit = true
      for (const p of out.parts.slice(before)) {
        p.meal = chunk.meal
        for (const a of p.alternatives) a.meal = chunk.meal
      }
    }
  }
  if (!out.parts.length) return null
  if (out.parts.length + out.unknown.length < 2 && !out.explicit) return null
  return { parts: out.parts, unknown: out.unknown }
}
