import rawRecipes from '../data/recipes.json'
import type { Allergen, DietPreference, MealType, Nutrients, RawRecipe, Recipe, RecipeIngredient } from '../types'
import { scaleNutrients } from './nutrition'
import { detectVeggies } from './veggies'
import { deriveTags, dietInfo, ingredientFlags, ingredientGrams, ingredientInfo, nutritionPerServing } from './recipeNutrition'
import { recipeNeeds } from './pantry'

/** Rezept um berechnete Nährwerte, Ernährungsform und abgeleitete Tags ergänzen */
export function buildRecipe(raw: RawRecipe): Recipe {
  const { fiber, ...nutrition } = nutritionPerServing(raw.ingredients, raw.servings)
  const diet = dietInfo(raw.ingredients)
  return { ...raw, nutrition, fiber, diet, tags: deriveTags(raw, { ...nutrition, fiber }, diet) }
}

export const RECIPES: Recipe[] = (rawRecipes as RawRecipe[]).map(buildRecipe)

export function getRecipe(id: string | null | undefined): Recipe | undefined {
  return id ? RECIPES.find((r) => r.id === id) : undefined
}

/** Kennzahlen eines Rezepts für Filter und Sortierung – aus den Zutaten berechnet */
export interface RecipeFacts {
  /** Enthält Fleisch (auch ohne Mengenangabe) */
  hasMeat: boolean
  /** Enthält Fisch oder Meeresfrüchte */
  hasFish: boolean
  /** Fleisch pro Portion in Gramm */
  meat: number
  /** Fisch und Meeresfrüchte pro Portion in Gramm */
  fish: number
  /** Anzahl der Zutaten ohne Grundvorrat (Salz, Öl, Gewürze …) */
  ingredients: number
  /** Minuten, bis das Gericht fertig ist – Zubereitung plus Warte-, Quell- und Kühlzeit */
  totalTime: number
}

const FACTS = new WeakMap<Recipe, RecipeFacts>()

export function recipeFacts(r: Recipe): RecipeFacts {
  const cached = FACTS.get(r)
  if (cached) return cached
  let meat = 0
  let fish = 0
  let hasMeat = false
  let hasFish = false
  for (const ing of r.ingredients) {
    const flags = ingredientFlags(ing)
    const grams = ingredientGrams(ing) ?? 0
    if (flags.includes('M')) {
      hasMeat = true
      meat += grams
    }
    if (flags.includes('F')) {
      hasFish = true
      fish += grams
    }
  }
  const servings = r.servings > 0 ? r.servings : 1
  const facts: RecipeFacts = {
    hasMeat,
    hasFish,
    meat: Math.round(meat / servings),
    fish: Math.round(fish / servings),
    ingredients: recipeNeeds(r, { assumeBasics: false }).length,
    totalTime: r.time_min + (r.rest_min ?? 0),
  }
  FACTS.set(r, facts)
  return facts
}

/** Fleisch & Fisch: vegetarisch (ohne beides), wenig Fleisch, viel Fleisch oder mit Fisch */
export type MeatFilter = 'none' | 'little' | 'much' | 'fish'
/** Ab so vielen Gramm Fleisch pro Portion gilt ein Gericht als „viel Fleisch“ – darunter als „wenig“ (Schinken, Speck, Würstchen als Beigabe) */
export const MEAT_MUCH_FROM = 100

export const MEAT_LABELS: Record<MeatFilter, string> = {
  none: 'Vegetarisch',
  little: 'Wenig Fleisch',
  much: 'Viel Fleisch',
  fish: 'Mit Fisch',
}

export function matchesMeat(r: Recipe, filter: MeatFilter): boolean {
  const { hasMeat, hasFish, meat } = recipeFacts(r)
  switch (filter) {
    case 'none':
      return !hasMeat && !hasFish
    case 'little':
      return hasMeat && meat < MEAT_MUCH_FROM
    case 'much':
      return hasMeat && meat >= MEAT_MUCH_FROM
    case 'fish':
      return hasFish
  }
}

/** Kalorien pro Portion in drei Stufen */
export type KcalFilter = 'light' | 'medium' | 'hearty'
export const KCAL_LIGHT_MAX = 350
export const KCAL_HEARTY_FROM = 550

export const KCAL_LABELS: Record<KcalFilter, string> = {
  light: `Leicht · bis ${KCAL_LIGHT_MAX} kcal`,
  medium: `Mittel · ${KCAL_LIGHT_MAX}–${KCAL_HEARTY_FROM} kcal`,
  hearty: `Deftig · ab ${KCAL_HEARTY_FROM} kcal`,
}

export function matchesKcal(r: Recipe, filter: KcalFilter): boolean {
  const kcal = r.nutrition.kcal
  if (filter === 'light') return kcal <= KCAL_LIGHT_MAX
  if (filter === 'hearty') return kcal >= KCAL_HEARTY_FROM
  return kcal > KCAL_LIGHT_MAX && kcal < KCAL_HEARTY_FROM
}

/** „Fertig in“: Auswahl in Minuten */
export const TIME_OPTIONS = [15, 30, 45] as const
/** „Wenige Zutaten“: höchstens so viele, ohne Grundvorrat */
export const FEW_INGREDIENTS_MAX = 5

export interface RecipeFilter {
  chapter?: string | null
  meal?: MealType | null
  maxKcal?: number | null
  /** Höchstens so viele Minuten aktive Zubereitung */
  maxTime?: number | null
  /** Fertig in höchstens so vielen Minuten – inklusive Warte-, Quell- und Kühlzeit */
  maxTotalTime?: number | null
  meat?: MeatFilter | null
  kcal?: KcalFilter | null
  /** Höchstens so viele Zutaten (ohne Grundvorrat) */
  maxIngredients?: number | null
  keyword?: string
  tag?: string | null
  /** Eigenschaften, die alle zutreffen müssen */
  tags?: string[]
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Rezepte nach Mahlzeit, kcal pro Portion, Zubereitungszeit, Stichwort und Tag filtern */
export function filterRecipes(recipes: Recipe[], f: RecipeFilter): Recipe[] {
  const kw = f.keyword ? normalize(f.keyword.trim()) : ''
  return recipes.filter((r) => {
    if (f.chapter && r.chapter !== f.chapter) return false
    if (f.meal && !r.meal.includes(f.meal)) return false
    if (f.maxKcal && r.nutrition.kcal > f.maxKcal) return false
    if (f.maxTime && r.time_min > f.maxTime) return false
    if (f.maxTotalTime && recipeFacts(r).totalTime > f.maxTotalTime) return false
    if (f.meat && !matchesMeat(r, f.meat)) return false
    if (f.kcal && !matchesKcal(r, f.kcal)) return false
    if (f.maxIngredients && recipeFacts(r).ingredients > f.maxIngredients) return false
    if (f.tag && !r.tags.includes(f.tag)) return false
    if (f.tags?.length && !f.tags.every((t) => r.tags.includes(t))) return false
    if (kw) {
      const hay = normalize([r.title, ...r.tags, ...r.ingredients.map((i) => i.name)].join(' '))
      if (!kw.split(/\s+/).every((w) => hay.includes(w))) return false
    }
    return true
  })
}

export function allTags(recipes: Recipe[]): string[] {
  return [...new Set(recipes.flatMap((r) => r.tags))].sort((a, b) => a.localeCompare(b, 'de'))
}

/**
 * Empfehlungen passend zum verbleibenden Tagesbudget:
 * Das Restbudget wird auf die noch offenen Mahlzeiten verteilt; Rezepte, die nicht ins Restbudget passen, fallen raus.
 * Sortiert nach Nähe zum Budget pro Mahlzeit.
 */
export function recommendRecipes(
  recipes: Recipe[],
  opts: { remainingKcal: number; meal: MealType; openMeals: number; limit?: number },
): Recipe[] {
  const { remainingKcal, meal, openMeals, limit = 6 } = opts
  if (remainingKcal <= 0) return []
  const perMeal = remainingKcal / Math.max(1, openMeals)
  return recipes
    // Grundrezepte (Brot, Marmelade, Saucen …) sind Bausteine, keine eigene Mahlzeit
    .filter((r) => r.chapter !== 'grundrezepte' && r.meal.includes(meal) && r.nutrition.kcal <= remainingKcal)
    .map((r) => ({ r, score: Math.abs(r.nutrition.kcal - perMeal) }))
    .sort((a, b) => a.score - b.score || a.r.title.localeCompare(b.r.title, 'de'))
    .slice(0, limit)
    .map((x) => x.r)
}

/** Zutatenmengen für eine andere Portionszahl umrechnen */
export function scaleIngredients(r: Recipe, servings: number): RecipeIngredient[] {
  const f = r.servings > 0 ? servings / r.servings : 1
  return r.ingredients.map((i) => ({ ...i, amount: i.amount === null ? null : roundAmount(i.amount * f, i.unit) }))
}

/** Sinnvoll runden: Gramm/ml auf 5er-Schritte ab 50, sonst auf 0,25 */
export function roundAmount(amount: number, unit: string): number {
  if ((unit === 'g' || unit === 'ml') && amount >= 50) return Math.round(amount / 5) * 5
  if (unit === 'g' || unit === 'ml') return Math.round(amount)
  return Math.round(amount * 4) / 4
}

export function recipeNutrients(r: Recipe, servings: number): Nutrients {
  return scaleNutrients(r.nutrition, servings)
}

export function recipeVeggies(r: Recipe): string[] {
  return detectVeggies(...r.ingredients.filter((i) => i.category === 'obst_gemuese').map((i) => i.name))
}

const EMOJI_RULES: [RegExp, string][] = [
  // Getränke
  [/lassi/i, '🥭'],
  [/ayran|haferdrink selbst/i, '🥛'],
  [/kaffee|espresso/i, '☕'],
  [/tee\b|chai|goldene milch/i, '🍵'],
  [/limonade/i, '🍋'],
  [/^wasser\b/i, '💧'],
  // Gerichte
  [/burger/i, '🍔'],
  [/pizza|flammkuchen/i, '🍕'],
  [/taco/i, '🌮'],
  [/pulled chicken/i, '🥪'],
  [/burrito|enchilada|wrap/i, '🌯'],
  [/sushi|poke/i, '🍣'],
  [/paella/i, '🥘'],
  [/pad thai|nudelsuppe|ramen|suppe mit (faden)?nudeln|gemüsebrühe mit/i, '🍜'],
  [/risotto|reis-bowl|reisbowl|gemüsereis|milchreis|reispfanne|nasi goreng|biryani|^reis\b/i, '🍚'],
  [/currywurst|würstchen|bratwurst/i, '🌭'],
  [/curry|dal\b|butter chicken|masala/i, '🍛'],
  [/käsespätzle/i, '🧀'],
  [/lasagne|spaghetti|pasta|nudel|bolognese|gnocchi|penne|cannelloni|tortellini|makkaroni|spätzle/i, '🍝'],
  [/pfannkuchen|pancake|kaiserschmarrn|okonomiyaki|quarkkeulchen/i, '🥞'],
  [/reiswaffel/i, '🍘'],
  [/waffel/i, '🧇'],
  [/oats|porridge|müsli|granola|grieß/i, '🥣'],
  [/muffin/i, '🧁'],
  [/bananenbrot|^dinkel-vollkornbrot/i, '🍞'],
  [/kuchen|tiramisu/i, '🍰'],
  [/brownie/i, '🍫'],
  [/keks|makrone|kipferl/i, '🍪'],
  [/zimtschnecke/i, '🥐'],
  [/quiche|tarte|\bpie\b|börek|strudel/i, '🥧'],
  [/pudding|grütze/i, '🍮'],
  [/kirsch/i, '🍒'],
  [/quarkbällchen/i, '🍩'],
  [/brötchen/i, '🥯'],
  [/pommes/i, '🍟'],
  [/popcorn/i, '🍿'],
  [/studentenfutter/i, '🥜'],
  [/nicecream|frozen|parfait|bananen-eis|eis am stiel/i, '🍨'],
  [/schoko/i, '🍫'],
  [/marmelade/i, '🫙'],
  [/chia/i, '🥥'],
  [/shake|smoothie/i, '🥤'],
  [/tintenfisch/i, '🦑'],
  [/muschel/i, '🦪'],
  [/garnele|krabben|gambas/i, '🦐'],
  [/lachs|kabeljau|thunfisch|seelachs|fisch|fish\b|forelle|matjes|zander|dorade|makrele|rotbarsch/i, '🐟'],
  [/hähnchen|pute|huhn|hühner|chicken|gyros/i, '🍗'],
  [/kohlroulade|kohlrabi/i, '🥬'],
  // vegetarische Gerichte mit „fleischigen“ Namen
  [/blumenkohl-steak/i, '🥦'],
  [/kartoffelgulasch/i, '🥔'],
  [/roulade|steak|schnitzel|rind|schwein|kasseler|lamm/i, '🥩'],
  [/gemüse-frikadelle/i, '🥕'],
  [/klopse|frikadelle|ćevap|cevap|gulasch|hack/i, '🍖'],
  [/kugeln|bällchen|riegel/i, '🍪'],
  [/trauben/i, '🍇'],
  [/falafel/i, '🧆'],
  [/hummus|edamame|kichererbse|linse|bohne|erbse/i, '🫘'],
  [/aubergine|parmigiana|moussaka|baba ganoush/i, '🍆'],
  [/knödel/i, '🥟'],
  [/(^|[\s-])ei([\s,.)-]|$)|eier|omelett|frittata|shakshuka|rührei|spiegelei|bauernfrühstück|huevos/i, '🍳'],
  [/tomatensuppe|tomatensauce|tomatensalsa|tomate-mozzarella|bruschetta|caprese/i, '🍅'],
  [/guacamole/i, '🥑'],
  [/kürbis/i, '🎃'],
  [/möhre|karotte|gemüsesticks/i, '🥕'],
  [/suppe|eintopf|chili|pichelsteiner|brühe|kaltschale/i, '🍲'],
  [/salat|tabouleh|rucola/i, '🥗'],
  [/gurke|tzatziki/i, '🥒'],
  [/brokkoli|blumenkohl|rosenkohl/i, '🥦'],
  [/grünkohl|rotkohl|spitzkohl|weißkohl|sauerkraut|wirsing/i, '🥬'],
  [/spargel/i, '🌿'],
  [/champignon|pilz/i, '🍄'],
  [/apfel|beeren|banane|crumble/i, '🍎'],
  [/brot|toast|knäcke/i, '🥪'],
  [/süßkartoffel/i, '🍠'],
  [/kartoffel/i, '🥔'],
  [/paprika|gemüse|zucchini|ratatouille|antipasti|tian/i, '🫑'],
  [/tofu/i, '🍱'],
  [/kräuterbutter/i, '🧈'],
  [/quark|skyr|joghurt|hüttenkäse/i, '🥛'],
  [/feta|halloumi|camembert|obatzda/i, '🧀'],
  [/pesto/i, '🌿'],
  [/zwiebel/i, '🧅'],
  [/sauce|béchamel|hollandaise|vinaigrette|dressing|dip\b/i, '🫙'],
]

function matchEmoji(text: string): string | undefined {
  for (const [re, e] of EMOJI_RULES) if (re.test(text)) return e
  return undefined
}

/**
 * Symbol für eine Rezeptkarte. Zuerst zählt der Hauptteil des Titels („Rinderrouladen“ in „Rinderrouladen mit
 * Rotkohl“), erst danach der ganze Titel – so bestimmt die Beilage nicht das Bild.
 */
export function recipeEmoji(r: Pick<Recipe, 'title'>): string {
  const head = r.title.split(/\s(?:mit|in|auf)\s/)[0]
  return matchEmoji(head) ?? matchEmoji(r.title) ?? '🍽️'
}

export const TAG_LABELS: Record<string, string> = {
  vegetarisch: 'Vegetarisch',
  vegan: 'Vegan',
  proteinreich: 'Proteinreich',
  'low-carb': 'Low Carb',
  schnell: 'Schnell',
  'meal-prep': 'Meal Prep',
  glutenfrei: 'Glutenfrei',
  ballaststoffreich: 'Ballaststoffreich',
  heissluftfritteuse: 'Heißluftfritteuse',
  klassiker: 'Klassiker',
  'one-pot': 'One Pot',
  suess: 'Süßes',
  variante: 'Meine Variante',
  eigen: 'Eigenes Rezept',
}

export type RecipeSort = 'empfohlen' | 'zeit' | 'zutaten' | 'kcal' | 'eiweiss' | 'oft'

export const SORT_LABELS: Record<RecipeSort, string> = {
  empfohlen: 'Empfohlen',
  zeit: 'Schnell fertig zuerst',
  zutaten: 'Wenige Zutaten zuerst',
  kcal: 'Wenig kcal zuerst',
  eiweiss: 'Viel Eiweiß zuerst',
  oft: 'Oft gekocht',
}

export interface CookedStat {
  count: number
  /** Datum des letzten Eintrags (yyyy-MM-dd) */
  last: string
}

/** Wie oft und wann zuletzt ein Rezept als gegessen eingetragen wurde */
export function cookedStats(log: { recipe_id: string | null; date: string }[]): Map<string, CookedStat> {
  const map = new Map<string, CookedStat>()
  for (const e of log) {
    if (!e.recipe_id) continue
    const cur = map.get(e.recipe_id)
    map.set(e.recipe_id, { count: (cur?.count ?? 0) + 1, last: cur && cur.last > e.date ? cur.last : e.date })
  }
  return map
}

/** Eiweiß in Gramm pro 100 kcal – Maß für „proteinreich“ unabhängig von der Portionsgröße */
export function proteinDensity(r: Recipe): number {
  return r.nutrition.kcal > 0 ? (r.nutrition.protein / r.nutrition.kcal) * 100 : 0
}

/**
 * Sortierung. „Empfohlen“ stellt Favoriten und (falls vorhanden) Heißluftfritteusen-Rezepte nach vorne,
 * sonst bleibt die Reihenfolge des Datensatzes.
 */
export function sortRecipes(
  recipes: Recipe[],
  sort: RecipeSort,
  opts: { favorites?: string[]; preferAirfryer?: boolean; cooked?: Map<string, CookedStat> } = {},
): Recipe[] {
  const fav = new Set(opts.favorites ?? [])
  const index = new Map(recipes.map((r, i) => [r.id, i]))
  const byIndex = (a: Recipe, b: Recipe) => index.get(a.id)! - index.get(b.id)!
  const list = [...recipes]
  switch (sort) {
    case 'kcal':
      return list.sort((a, b) => a.nutrition.kcal - b.nutrition.kcal || byIndex(a, b))
    case 'zeit':
      // fertig auf dem Tisch: Wartezeiten zählen mit; bei Gleichstand das mit weniger Arbeit zuerst
      return list.sort((a, b) => recipeFacts(a).totalTime - recipeFacts(b).totalTime || a.time_min - b.time_min || byIndex(a, b))
    case 'zutaten':
      return list.sort((a, b) => recipeFacts(a).ingredients - recipeFacts(b).ingredients || a.time_min - b.time_min || byIndex(a, b))
    case 'eiweiss':
      return list.sort((a, b) => proteinDensity(b) - proteinDensity(a) || byIndex(a, b))
    case 'oft': {
      const c = (r: Recipe) => opts.cooked?.get(r.id)?.count ?? 0
      return list.sort((a, b) => c(b) - c(a) || byIndex(a, b))
    }
    default: {
      const rank = (r: Recipe) => (fav.has(r.id) ? 0 : opts.preferAirfryer && r.airfryer ? 1 : 2)
      return list.sort((a, b) => rank(a) - rank(b) || byIndex(a, b))
    }
  }
}

export function airfryerRecipes(recipes: Recipe[]): Recipe[] {
  return recipes.filter((r) => r.airfryer)
}

/** Zubereitungsschritte je nach Gerät */
export function recipeSteps(r: Recipe, method: 'airfryer' | 'oven'): string[] {
  if (method === 'airfryer' && r.airfryer?.steps) return r.airfryer.steps
  return r.steps
}

/** Rezept ist eine Backofen-Variante mit zusätzlicher Anleitung für die Heißluftfritteuse */
export function hasAirfryerVariant(r: Recipe): boolean {
  return Boolean(r.airfryer?.steps)
}

/** Rezept ist direkt für die Heißluftfritteuse geschrieben */
export function isAirfryerNative(r: Recipe): boolean {
  return Boolean(r.airfryer && !r.airfryer.steps)
}

export function toggleFavorite(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

/** Rezept als Text zum Teilen (Messenger, E-Mail) */
export function recipeShareText(r: Recipe, servings: number, steps: string[]): string {
  const lines = [
    `${recipeEmoji(r)} ${r.title}`,
    `${servings} Portion${servings === 1 ? '' : 'en'} · ${r.time_min} Min. · ca. ${Math.round(r.nutrition.kcal)} kcal pro Portion`,
    '',
    'Zutaten:',
    ...scaleIngredients(r, servings).map((i) => `• ${[formatAmount(i.amount, i.unit), i.name].filter(Boolean).join(' ')}${i.note ? ` (${i.note})` : ''}`),
    '',
    'Zubereitung:',
    ...steps.map((s, idx) => `${idx + 1}. ${s}`),
  ]
  return lines.join('\n')
}

function formatAmount(amount: number | null, unit: string): string {
  if (amount === null) return ''
  const n = String(Math.round(amount * 100) / 100).replace('.', ',')
  return unit ? `${n} ${unit}` : n
}

/** Tags, die zwei Rezepte wirklich ähnlich machen (Ernährungsform allein reicht nicht) */
const SIMILAR_TAGS = ['one-pot', 'klassiker', 'suess', 'meal-prep', 'heissluftfritteuse', 'low-carb', 'proteinreich']

function mainBases(r: Recipe): Set<string> {
  const out = new Set<string>()
  for (const i of r.ingredients) {
    const info = ingredientInfo(i.name)
    if (info?.staple || info?.basic) continue
    out.add(info?.base ?? i.name)
  }
  return out
}

/**
 * Ähnliche Rezepte: gleiches Kapitel, gemeinsame Hauptzutaten und Eigenschaften zählen; Ergebnis nach Ähnlichkeit,
 * bei Gleichstand nach ähnlicher Kalorienzahl.
 */
export function similarRecipes(recipe: Recipe, all: Recipe[], limit = 6): Recipe[] {
  const own = mainBases(recipe)
  const score = (r: Recipe) => {
    let s = r.chapter === recipe.chapter ? 2 : 0
    for (const t of SIMILAR_TAGS) if (recipe.tags.includes(t) && r.tags.includes(t)) s += 1
    for (const b of mainBases(r)) if (own.has(b)) s += 1
    if (r.meal.some((m) => recipe.meal.includes(m))) s += 0.5
    return s
  }
  return all
    .filter((r) => r.id !== recipe.id && r.title !== recipe.title)
    .map((r) => ({ r, s: score(r) }))
    .filter((x) => x.s >= 3)
    .sort((a, b) => b.s - a.s || Math.abs(a.r.nutrition.kcal - recipe.nutrition.kcal) - Math.abs(b.r.nutrition.kcal - recipe.nutrition.kcal))
    .slice(0, limit)
    .map((x) => x.r)
}

export const DIET_LABELS: Record<DietPreference, string> = {
  all: 'Alles',
  vegetarian: 'Vegetarisch',
  vegan: 'Vegan',
}

/** Passt das Rezept zur gewählten Ernährungsweise? */
/** Passt das Rezept zur Ernährungsweise und enthält nichts, was gemieden wird (Unverträglichkeiten)? */
export function matchesDiet(r: Recipe, diet: DietPreference | undefined, avoid: readonly Allergen[] = []): boolean {
  if (diet === 'vegan' && !r.diet.vegan) return false
  if (diet === 'vegetarian' && !r.diet.vegetarian) return false
  return !avoid.some((a) => r.diet.allergens.includes(a))
}

/** Zufälliger Vorschlag aus einer Auswahl – möglichst ein anderer als der zuletzt gezeigte */
export function pickRandom(recipes: Recipe[], exclude?: string | null, random: () => number = Math.random): Recipe | undefined {
  const pool = recipes.length > 1 && exclude ? recipes.filter((r) => r.id !== exclude) : recipes
  return pool.length ? pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] : undefined
}
