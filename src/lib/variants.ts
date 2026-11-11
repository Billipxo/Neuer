/**
 * Rezept-Varianten und eigene Rezepte: Ein Kochbuch-Rezept wird kopiert, Zutaten und Mengen werden geändert,
 * und die Nährwerte werden – wie bei allen Rezepten – aus den Zutaten neu berechnet.
 */
import { DEFAULT_UNIT_GRAMS, INGREDIENT_LIST, type IngredientInfo } from '../data/ingredients'
import { getChapter, type ChapterId } from '../data/chapters'
import type { RawRecipe, Recipe, RecipeIngredient, RecipeVariant, ShoppingCategory } from '../types'
import { buildRecipe, getRecipe, isAirfryerNative, RECIPES, recipeSteps, roundAmount } from './recipes'
import { ingredientFlags, ingredientGrams, ingredientInfo, nutritionPerServing, totalNutrition, unitGrams, unresolvedIngredients } from './recipeNutrition'
import { guessCategory } from './shopping'
import { fmtInt } from './format'

export type VariantDraft = Omit<RecipeVariant, 'id' | 'user_id' | 'created_at' | 'updated_at'>

/** Manuelle Tags, die eine Variante vom Original übernimmt („Klassiker“ nicht – es ist ja abgewandelt) */
const INHERITED_TAGS = ['meal-prep', 'one-pot', 'suess']

/** Variante oder eigenes Rezept als vollwertiges Rezept mit berechneten Nährwerten, Ernährungsform und Tags */
export function variantToRecipe(v: VariantDraft & { id: string }, base: Recipe | undefined = getRecipe(v.base_recipe_id)): Recipe {
  const raw: RawRecipe = {
    id: v.id,
    title: v.title,
    chapter: getChapter(v.chapter)?.id ?? 'vegetarisch',
    meal: v.meal,
    time_min: v.time_min,
    rest_min: v.rest_min ?? undefined,
    servings: v.servings,
    tags: [...(base?.tags.filter((t) => INHERITED_TAGS.includes(t)) ?? []), base ? 'variante' : 'eigen'],
    ingredients: v.ingredients,
    steps: v.steps,
    airfryer: v.airfryer ?? undefined,
    tips: base?.tips,
  }
  return buildRecipe(raw)
}

/** Entwurf einer Variante aus einem Kochbuch-Rezept – mit den Schritten für die gewählte Zubereitungsart */
export function draftFromRecipe(base: Recipe, method: 'airfryer' | 'oven' = 'airfryer'): VariantDraft {
  const forAirfryer = Boolean(base.airfryer) && (isAirfryerNative(base) || method === 'airfryer')
  return {
    base_recipe_id: base.id,
    title: `${base.title} – meine Variante`,
    chapter: base.chapter,
    meal: [...base.meal],
    time_min: base.time_min,
    rest_min: base.rest_min ?? null,
    servings: base.servings,
    ingredients: base.ingredients.map((i) => ({ ...i })),
    steps: [...recipeSteps(base, method)],
    airfryer: forAirfryer && base.airfryer ? { temp_c: base.airfryer.temp_c, time_min: base.airfryer.time_min } : null,
    note: null,
  }
}

/** Leerer Entwurf für ein eigenes Rezept */
export function emptyDraft(): VariantDraft {
  return {
    base_recipe_id: null,
    title: '',
    chapter: 'vegetarisch',
    meal: ['lunch', 'dinner'],
    time_min: 30,
    rest_min: null,
    servings: 2,
    ingredients: [],
    steps: [],
    airfryer: null,
    note: null,
  }
}

export function draftFromVariant(v: RecipeVariant): VariantDraft {
  return {
    base_recipe_id: v.base_recipe_id,
    title: v.title,
    chapter: v.chapter,
    meal: [...v.meal],
    time_min: Number(v.time_min),
    rest_min: v.rest_min === null || v.rest_min === undefined ? null : Number(v.rest_min),
    servings: Number(v.servings),
    ingredients: v.ingredients.map((i) => ({ ...i })),
    steps: [...v.steps],
    airfryer: v.airfryer ? { ...v.airfryer } : null,
    note: v.note ?? null,
  }
}

/** Kapitel-Vorschlag für ein eigenes Rezept anhand der Zutaten */
export function suggestChapter(ingredients: RecipeIngredient[]): ChapterId {
  const flags = ingredients.map(ingredientFlags).join('')
  if (flags.includes('F')) return 'fisch'
  if (flags.includes('M')) return 'fleisch'
  return 'vegetarisch'
}

/** Was noch fehlt, bevor der Entwurf gespeichert werden kann */
export function draftProblems(d: VariantDraft): string[] {
  const out: string[] = []
  if (!d.title.trim()) out.push('Ein Titel fehlt.')
  if (!(d.servings > 0)) out.push('Die Portionszahl muss größer als 0 sein.')
  if (d.ingredients.length === 0) out.push('Mindestens eine Zutat wird gebraucht.')
  if (!d.steps.some((s) => s.trim())) out.push('Mindestens ein Zubereitungsschritt wird gebraucht.')
  const unresolved = unresolvedIngredients(d.ingredients)
  if (unresolved.length) out.push(`Nicht berechenbar: ${unresolved.join(', ')}`)
  return out
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Zutaten der Nährwerttabelle suchen – Treffer am Wortanfang zuerst */
export function searchIngredients(query: string, limit = 25): IngredientInfo[] {
  const q = norm(query.trim())
  if (!q) return []
  return INGREDIENT_LIST.map((i) => {
    const name = norm(i.name)
    const base = norm(i.base)
    const score = name.startsWith(q) ? 0 : base.startsWith(q) ? 1 : name.includes(q) ? 2 : base.includes(q) ? 3 : -1
    return { i, score }
  })
    .filter((x) => x.score >= 0)
    .sort((a, b) => a.score - b.score || a.i.name.localeCompare(b.i.name, 'de'))
    .slice(0, limit)
    .map((x) => x.i)
}

let categoryMap: Map<string, ShoppingCategory> | null = null

/** Einkaufs-Kategorie einer Tabellenzutat – so, wie sie im Kochbuch am häufigsten verwendet wird */
export function ingredientCategory(name: string): ShoppingCategory {
  if (!categoryMap) {
    const counts = new Map<string, Map<ShoppingCategory, number>>()
    for (const r of RECIPES) {
      for (const i of r.ingredients) {
        const m = counts.get(i.name) ?? new Map<ShoppingCategory, number>()
        m.set(i.category, (m.get(i.category) ?? 0) + 1)
        counts.set(i.name, m)
      }
    }
    categoryMap = new Map([...counts].map(([n, m]) => [n, [...m].sort((a, b) => b[1] - a[1])[0][0]]))
  }
  return categoryMap.get(name) ?? guessCategory(name)
}

const COMMON_UNITS = ['g', 'ml', 'EL', 'TL']

/** Einheiten, in denen sich eine Zutat angeben lässt (passende zuerst, z. B. Stück bei Zwiebeln) */
export function unitOptions(ing: Pick<RecipeIngredient, 'name' | 'custom'>): string[] {
  if (ing.custom) return [...(ing.custom.unit_g ? ['Stück'] : []), ...COMMON_UNITS]
  const info = ingredientInfo(ing.name)
  const specific = info ? Object.keys(info.units).filter((u) => u in DEFAULT_UNIT_GRAMS || info.units[u] >= 1) : []
  return [...new Set([...specific, ...COMMON_UNITS])]
}

export function defaultAmount(unit: string): number {
  return unit === 'g' || unit === 'ml' ? 100 : 1
}

/** Neue Zutat aus der Nährwerttabelle mit sinnvoller Einheit und Menge */
export function ingredientFromTable(info: IngredientInfo): RecipeIngredient {
  const unit = unitOptions({ name: info.name })[0]
  return { name: info.name, amount: defaultAmount(unit), unit, category: ingredientCategory(info.name) }
}

export type CustomKind = 'plant' | 'dairy_egg' | 'meat' | 'fish'

export const CUSTOM_KIND_LABELS: Record<CustomKind, string> = {
  plant: 'Pflanzlich',
  dairy_egg: 'Milch/Ei',
  meat: 'Fleisch',
  fish: 'Fisch',
}

const KIND_FLAGS: Record<CustomKind, string> = { plant: '', dairy_egg: 'DE', meat: 'M', fish: 'F' }

export interface CustomIngredientInput {
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber?: number | null
  kind: CustomKind
  /** Ohne Angabe gilt die Zutat vorsichtshalber als glutenhaltig */
  glutenFree: boolean
  /** Gramm pro Stück – dann wird die Zutat in Stück angegeben */
  unit_g?: number | null
}

/** Eigene Zutat mit Nährwerten pro 100 g (z. B. ein Produkt, das nicht in der Tabelle steht) */
export function customIngredient(input: CustomIngredientInput): RecipeIngredient {
  const name = input.name.trim()
  const unit_g = input.unit_g && input.unit_g > 0 ? input.unit_g : undefined
  const unit = unit_g ? 'Stück' : 'g'
  return {
    name,
    amount: defaultAmount(unit),
    unit,
    category: guessCategory(name),
    custom: {
      kcal: input.kcal,
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      fiber: input.fiber ?? 0,
      flags: KIND_FLAGS[input.kind] + (input.glutenFree ? '' : 'G'),
      unit_g,
    },
  }
}

/** Art und Gluten-Kennzeichnung aus den Flags einer eigenen Zutat (zum Bearbeiten) */
export function customKindOf(flags: string): { kind: CustomKind; glutenFree: boolean } {
  const kind: CustomKind = flags.includes('F') ? 'fish' : flags.includes('M') ? 'meat' : /[DE]/.test(flags) ? 'dairy_egg' : 'plant'
  return { kind, glutenFree: !flags.includes('G') }
}

/** Zutat gegen eine andere tauschen – Menge und Einheit bleiben, wenn sie auch zur neuen Zutat passen */
export function swapIngredient(old: RecipeIngredient, next: RecipeIngredient): RecipeIngredient {
  if (old.amount !== null && unitOptions(next).includes(old.unit)) return { ...next, amount: old.amount, unit: old.unit, note: undefined }
  return { ...next, note: undefined }
}

function gramsPerUnit(ing: RecipeIngredient, unit: string): number | null {
  if (ing.custom) return unit === 'Stück' ? (ing.custom.unit_g ?? null) : (DEFAULT_UNIT_GRAMS[unit] ?? null)
  const info = ingredientInfo(ing.name)
  return info ? unitGrams(info, unit) : null
}

/** Einheit wechseln und die Menge umrechnen, z. B. 200 g Zwiebeln → 2,5 Stück */
export function changeUnit(ing: RecipeIngredient, unit: string): RecipeIngredient {
  const grams = ingredientGrams(ing)
  const perUnit = gramsPerUnit(ing, unit)
  if (!grams || !perUnit) return { ...ing, unit }
  return { ...ing, unit, amount: roundAmount(grams / perUnit, unit) }
}

/** Kalorien einer einzelnen Zutat (für die Anzeige beim Bearbeiten) */
export function ingredientKcal(ing: RecipeIngredient): number {
  return Math.round(totalNutrition([ing]).kcal)
}

export interface NutritionDiff {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

/** Unterschied pro Portion: Variante minus Original */
export function nutritionDiff(variant: Recipe, base: Recipe): NutritionDiff {
  return {
    kcal: variant.nutrition.kcal - base.nutrition.kcal,
    protein: variant.nutrition.protein - base.nutrition.protein,
    carbs: variant.nutrition.carbs - base.nutrition.carbs,
    fat: variant.nutrition.fat - base.nutrition.fat,
    fiber: variant.fiber - base.fiber,
  }
}

/** Vorzeichenbehaftete Zahl mit echtem Minus, z. B. „−45 kcal“ */
export function fmtSigned(n: number, unit: string): string {
  return `${n > 0 ? '+' : '−'}${fmtInt(Math.abs(n))}${unit}`
}
const signed = fmtSigned

/** Lesbare Unterschiede, z. B. „−120 kcal“, „+4 g Eiweiß“ – nur, was sich geändert hat */
export function formatDiff(d: NutritionDiff): string[] {
  const out: string[] = []
  if (d.kcal) out.push(signed(d.kcal, ' kcal'))
  if (d.protein) out.push(`${signed(d.protein, ' g')} Eiweiß`)
  if (d.carbs) out.push(`${signed(d.carbs, ' g')} Kohlenhydrate`)
  if (d.fat) out.push(`${signed(d.fat, ' g')} Fett`)
  if (d.fiber) out.push(`${signed(d.fiber, ' g')} Ballaststoffe`)
  return out
}

export function isVariantRecipe(r: Recipe): boolean {
  return r.tags.includes('variante') || r.tags.includes('eigen')
}

export interface SwapRule {
  from: string
  to: string
  why: string
  /** Mengenfaktor, z. B. 0,4 bei Hack → trockene Linsen */
  factor?: number
  /** Auch vorschlagen, wenn es nicht weniger Kalorien sind (z. B. mehr Ballaststoffe, vegetarisch) */
  always?: boolean
}

/** Bewährte leichtere oder vollwertigere Alternativen – Namen wie in der Nährwerttabelle */
export const SWAP_RULES: SwapRule[] = [
  { from: 'Sahne', to: 'Kochsahne 15 %', why: 'bindet genauso, mit der Hälfte Fett' },
  { from: 'saure Sahne (10 %)', to: 'Naturjoghurt 1,5 %', why: 'für Dips und kalte Saucen' },
  { from: 'Butter', to: 'Rapsöl', why: 'zum Braten und Dünsten', factor: 0.75 },
  { from: 'Gouda', to: 'Mozzarella (light)', why: 'zum Überbacken' },
  { from: 'Bergkäse', to: 'Mozzarella (light)', why: 'zum Überbacken' },
  { from: 'Rinderhack (mager)', to: 'Tellerlinsen', why: 'vegetarisch – für Bolognese, Chili und Aufläufe', factor: 0.4, always: true },
  { from: 'Hähnchenschenkelfilet', to: 'Hähnchenbrust', why: 'magerer – etwas kürzer garen' },
  { from: 'Schweineschnitzel', to: 'Putenschnitzel', why: 'magerer' },
  { from: 'Frühstücksspeck', to: 'Kochschinken (mager)', why: 'würzt ähnlich, mit viel weniger Fett' },
  { from: 'Reis', to: 'Vollkornreis', why: 'mehr Ballaststoffe, sättigt länger', always: true },
  { from: 'Spaghetti', to: 'Vollkornspaghetti', why: 'mehr Ballaststoffe', always: true },
  { from: 'Bandnudeln', to: 'Vollkorn-Penne', why: 'mehr Ballaststoffe', always: true },
  { from: 'Mehl', to: 'Dinkelvollkornmehl', why: 'mehr Ballaststoffe – etwas mehr Flüssigkeit einplanen', always: true },
]

export interface SwapSuggestion {
  /** Position der Zutat im Entwurf */
  index: number
  from: RecipeIngredient
  to: RecipeIngredient
  why: string
  /** Unterschied in kcal pro Portion nach dem Tausch (negativ = leichter) */
  kcalDelta: number
}

/** Leichtere oder vollwertigere Alternativen für Zutaten eines Entwurfs – größte Ersparnis zuerst */
export function swapSuggestions(d: VariantDraft, limit = 4): SwapSuggestion[] {
  const before = nutritionPerServing(d.ingredients, d.servings).kcal
  const out: SwapSuggestion[] = []
  d.ingredients.forEach((ing, index) => {
    for (const rule of SWAP_RULES) {
      if (rule.from !== ing.name) continue
      const info = ingredientInfo(rule.to)
      if (!info) continue
      let to = swapIngredient(ing, ingredientFromTable(info))
      if (rule.factor && to.amount !== null) to = { ...to, amount: roundAmount(to.amount * rule.factor, to.unit) }
      const after = nutritionPerServing(d.ingredients.map((x, i) => (i === index ? to : x)), d.servings).kcal
      const kcalDelta = after - before
      if (kcalDelta < 0 || rule.always) out.push({ index, from: ing, to, why: rule.why, kcalDelta })
    }
  })
  return out.sort((a, b) => a.kcalDelta - b.kcalDelta).slice(0, limit)
}
