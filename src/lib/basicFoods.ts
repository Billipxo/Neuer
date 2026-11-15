/**
 * Grundnahrungsmittel beim Erfassen: Die Nährwerttabelle des Kochbuchs (Äpfel, Haferflocken, Hähnchenbrust, Öl …)
 * liefert sofort und offline Treffer – mit den passenden Maßen (Stück, Scheibe, EL, TL).
 */
import { INGREDIENT_LIST, type IngredientInfo } from '../data/ingredients'
import { EVERYDAY_FOODS, type EverydayFood, type FoodGroupId } from '../data/everydayFoods'
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
    tbsp_g: e.spoon,
    tsp_g: null,
    image_url: null,
    is_favorite: false,
    last_used_at: null,
    use_count: 0,
  }
}

/** Typische Menge, z. B. „1 Döner ≈ 350 g“, „1 Dose = 330 ml“ oder „1 EL ≈ 15 g“ */
export function everydayHint(e: EverydayFood): string {
  const grams = e.piece ?? e.portion ?? e.spoon ?? 100
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
  /** Getränk: Mengen in ml statt g */
  liquid: boolean
}

/** Für den Vergleich: klein, ohne Akzente; ß = ss, und ae/oe/ue gelten wie ä/ö/ü („Doener“ findet „Döner“) */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
}

/**
 * Ist die Suche das erste Wort des Namens – auch in der Mehrzahl? „Döner“ passt so zu „Döner Kebab“ (nicht zu
 * „Dönerbox“), „Banane“ zu „Bananen“ (nicht zu „Bananenchips“).
 */
function wholeFirstWord(q: string, first: string): boolean {
  if (first === q) return true
  return first.startsWith(q) && ['n', 'en', 'e', 'er', 'r'].includes(first.slice(q.length))
}

/**
 * Trockene Grundzutaten der Nährwerttabelle (Reis, Nudeln, Couscous …): Ihre Werte gelten ungekocht – auf dem Teller
 * wiegen sie zwei- bis dreimal so viel. Sie werden gekennzeichnet und stehen hinter der gekochten Portion.
 */
const DRY = new Set(['Couscous', 'Quinoa', 'Bulgur', 'Hirse', 'Polenta', 'Grieß', 'Perlgraupen', 'rote Linsen', 'Tellerlinsen', 'Schälerbsen (getrocknet)', 'Lasagneplatten'])
function isDry(info: IngredientInfo): boolean {
  return ['Nudeln', 'Asia-Nudeln', 'Reis'].includes(info.base) || DRY.has(info.name)
}

/** Getränke der Nährwerttabelle mit üblicher Menge – sonst hieße „ein doppelter Espresso“ 200 ml */
const TABLE_SERVINGS: Readonly<Record<string, { measure: string; ml: number }>> = {
  Espresso: { measure: 'Tasse', ml: 30 },
  'Milch 1,5 %': { measure: 'Glas', ml: 200 },
  Haferdrink: { measure: 'Glas', ml: 200 },
}

/** Flüssiges aus der Nährwerttabelle – Mengen in ml */
const TABLE_LIQUIDS = new Set(['Milch 1,5 %', 'Haferdrink', 'Gemüsebrühe', 'Rinderbrühe', 'Espresso', 'Schwarzer Tee', 'Zitronensaft', 'Kokosmilch (light)', 'Sahne', 'Kochsahne 15 %', 'Sojasauce', 'Essig', 'Balsamico'])

/** Andere gebräuchliche Namen für Einträge der Nährwerttabelle – auch aus Österreich und der Schweiz */
const TABLE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  Kartoffeln: ['Erdäpfel'],
  Tomate: ['Paradeiser'],
  Karotten: ['Möhren', 'Mohrrüben', 'Gelbe Rüben', 'Rüebli'],
  Blumenkohl: ['Karfiol'],
  Aubergine: ['Melanzani'],
  Zucchini: ['Zucchetti'],
  Paprika: ['Paprikaschote'],
  'grüne Bohnen': ['Fisolen', 'Brechbohnen', 'Prinzessbohnen'],
  Mais: ['Kukuruz', 'Zuckermais'],
  Champignons: ['Pilze', 'Schwammerl', 'Egerlinge'],
  Lauch: ['Porree'],
  Frühlingszwiebel: ['Lauchzwiebel'],
  'Rote Bete (vorgegart)': ['Rote Rüben', 'Rote Beete', 'Randen'],
  Rotkohl: ['Rotkraut', 'Blaukraut'],
  Weißkohl: ['Weißkraut'],
  Grünkohl: ['Braunkohl'],
  Feldsalat: ['Rapunzel', 'Vogerlsalat', 'Nüsslisalat'],
  Rucola: ['Rauke'],
  Kopfsalat: ['Blattsalat', 'grüner Salat'],
  Meerrettich: ['Kren'],
  Gewürzgurken: ['Essiggurken', 'saure Gurken', 'Cornichons'],
  Orange: ['Apfelsine'],
  Weintrauben: ['Trauben'],
  Pflaumen: ['Zwetschgen', 'Zwetschken'],
  Heidelbeeren: ['Blaubeeren'],
  Rosinen: ['Sultaninen'],
  Magerquark: ['Magertopfen'],
  Sahne: ['Schlagsahne', 'Schlagobers', 'Obers', 'Rahm'],
  'saure Sahne (10 %)': ['Sauerrahm'],
  Hähnchenbrust: ['Hühnerbrust', 'Pouletbrust'],
  Putenbrust: ['Truthahnbrust'],
  Rinderhüftsteak: ['Steak', 'Rindersteak'],
  Frühstücksspeck: ['Bacon', 'Speck'],
  'Kochschinken (mager)': ['Schinken', 'gekochter Schinken'],
  Rohschinken: ['Serranoschinken', 'Parmaschinken', 'Prosciutto'],
  Garnelen: ['Shrimps', 'Crevetten', 'Scampi', 'Gambas'],
  Kabeljaufilet: ['Dorsch'],
  Seelachsfilet: ['Köhler'],
  'Spätzle (frisch)': ['Knöpfle'],
  'Vollkorn-Paniermehl': ['Semmelbrösel', 'Paniermehl'],
  Mehl: ['Weizenmehl'],
  Puderzucker: ['Staubzucker'],
  Speisestärke: ['Maisstärke'],
  Erdnussbutter: ['Erdnussmus'],
}

/** Ein Name, für den Vergleich vorbereitet: einmal normalisiert statt bei jedem Tastendruck */
interface Prepared {
  /** Name, normalisiert */
  n: string
  /** Wörter des Namens */
  words: string[]
  /** Erstes Wort des Namens */
  first: string
  /** Gleichwertige Namen (Semmel = Brötchen), normalisiert */
  a: string[]
  /** Oberbegriffe (Spaghetti → Nudeln), normalisiert */
  b: string[]
}

function prepare(name: string, aliases: readonly string[] = [], bases: readonly string[] = []): Prepared {
  const n = norm(name)
  return { n, words: n.split(/[\s\-(),/]+/), first: n.split(/[\s\-(]+/)[0], a: aliases.map(norm), b: bases.map(norm) }
}

/** Wie gut passt ein Name zur Suche? Kleiner ist besser, -1 heißt gar nicht. */
function matchScore(q: string, p: Prepared): number {
  if (p.n === q) return 0
  if (p.a.some((x) => x === q)) return 1
  if (p.n.startsWith(q)) return 2
  if (p.a.some((x) => x.startsWith(q)) || p.b.some((x) => x === q)) return 3
  if (p.words.some((w) => w.startsWith(q)) || p.b.some((x) => x.startsWith(q))) return 4
  if (p.n.includes(q)) return 5
  if (p.a.some((x) => x.includes(q)) || p.b.some((x) => x.includes(q))) return 6
  return -1
}

function tableHit(info: IngredientInfo): QuickFoodHit {
  const food = basicFoodFromIngredient(info)
  const piece = pieceUnitOf(info)
  const per = (g: number) => Math.round((info.kcal * g) / 100)
  const serving = TABLE_SERVINGS[info.name]
  if (serving) {
    return {
      key: `t:${info.name}`,
      name: info.name,
      subtitle: `1 ${serving.measure} = ${fmtInt(serving.ml)} ml`,
      kcal: per(serving.ml),
      kcalLabel: 'kcal',
      food: { ...food, serving_g: serving.ml },
      typicalGrams: serving.ml,
      typicalLabel: `1 ${serving.measure}`,
      liquid: true,
    }
  }
  if (piece) {
    return { key: `t:${info.name}`, name: info.name, subtitle: basicFoodHint(info), kcal: per(piece.grams), kcalLabel: 'kcal', food, typicalGrams: piece.grams, typicalLabel: `1 ${piece.unit}`, liquid: false }
  }
  if (info.units.EL) {
    return { key: `t:${info.name}`, name: info.name, subtitle: basicFoodHint(info), kcal: per(info.units.EL), kcalLabel: 'kcal', food, typicalGrams: info.units.EL, typicalLabel: '1 EL', liquid: TABLE_LIQUIDS.has(info.name) }
  }
  return {
    key: `t:${info.name}`,
    name: info.name,
    subtitle: isDry(info) ? 'ungekocht' : 'Grundnahrungsmittel',
    kcal: info.kcal,
    kcalLabel: 'kcal/100 g',
    food,
    typicalGrams: null,
    typicalLabel: null,
    liquid: TABLE_LIQUIDS.has(info.name),
  }
}

function everydayHit(e: EverydayFood): QuickFoodHit {
  const grams = e.piece ?? e.portion ?? e.spoon
  return {
    key: `a:${e.name}`,
    name: e.name,
    subtitle: everydayHint(e),
    kcal: grams ? Math.round((e.kcal * grams) / 100) : e.kcal,
    kcalLabel: grams ? 'kcal' : 'kcal/100 g',
    food: everydayFoodToNew(e),
    typicalGrams: grams,
    typicalLabel: grams ? `1 ${e.measure.replace(/\s*\(.*\)$/, '')}` : null,
    liquid: e.liquid,
  }
}

/**
 * Grundformen ohne Mehrzahl-Endung, damit „Kartoffeln“ auch Kartoffelsalat findet und „Erdbeeren“ den Erdbeerkuchen.
 * Kürzer als vier Buchstaben wird nichts („Eis“ bleibt Eis und wird nicht zu „Ei“).
 */
function stems(q: string): string[] {
  const out = new Set<string>()
  for (const end of ['n', 'en', 'e', 's']) {
    if (q.endsWith(end) && q.length - end.length >= 4) out.add(q.slice(0, -end.length))
  }
  return [...out]
}

/** Güte mit Grundformen: Treffer über die Grundform zählen eine Stufe schwächer als über das eingetippte Wort */
function scoreWithStems(q: string, qStems: string[], p: Prepared): number {
  let best = matchScore(q, p)
  for (const s of qStems) {
    const viaStem = matchScore(s, p)
    if (viaStem >= 0 && (best < 0 || viaStem + 1 < best)) best = viaStem + 1
  }
  return best
}

interface Entry extends Prepared {
  name: string
  /** Aufschlag auf die Güte (Trockengewichte stehen hinter der gekochten Portion) */
  penalty: number
  /** Reihenfolge bei Gleichstand: Alltägliches vor der Nährwerttabelle, Gängiges zuerst */
  order: number
  hit: () => QuickFoodHit
}

let ENTRIES: Entry[] | null = null
/** Alle durchsuchbaren Einträge, beim ersten Gebrauch einmal vorbereitet */
function entries(): Entry[] {
  if (ENTRIES) return ENTRIES
  const out: Entry[] = []
  INGREDIENT_LIST.forEach((info, i) => {
    if (EXCLUDED.has(info.name)) return
    out.push({
      ...prepare(info.name, TABLE_ALIASES[info.name] ?? [], info.base !== info.name ? [info.base] : []),
      name: info.name,
      penalty: isDry(info) ? 1 : 0,
      order: 1000 + i,
      hit: () => tableHit(info),
    })
  })
  EVERYDAY_FOODS.forEach((e, i) => {
    out.push({ ...prepare(e.name, e.aliases), name: e.name, penalty: 0, order: i, hit: () => everydayHit(e) })
  })
  ENTRIES = out
  return out
}

/** Treffer mit Güte, beste zuerst */
function rank(query: string): { entry: Entry; score: number }[] {
  const q = norm(query.trim())
  if (q.length < 2) return []
  const qStems = stems(q)
  const found: { entry: Entry; score: number }[] = []
  for (const entry of entries()) {
    const s = scoreWithStems(q, qStems, entry)
    if (s >= 0) found.push({ entry, score: s + entry.penalty })
  }
  return found.sort(
    (a, b) =>
      a.score - b.score ||
      // gleich gut: Suche als ganzes erstes Wort vor Wortanfängen, Namensanfang vor anderen Begriffen,
      // danach die Reihenfolge der Listen (Gängiges zuerst)
      Number(!wholeFirstWord(q, a.entry.first)) - Number(!wholeFirstWord(q, b.entry.first)) ||
      Number(!a.entry.n.startsWith(q)) - Number(!b.entry.n.startsWith(q)) ||
      a.entry.order - b.entry.order,
  )
}

/**
 * Sofort-Treffer beim Erfassen – ohne Internet: Grundnahrungsmittel aus der Nährwerttabelle und Alltägliches
 * (Brötchen, Döner, Cappuccino …) mit typischer Menge. Genaue Namenstreffer zuerst, dann Wortanfänge, dann der Rest.
 */
export function searchQuickFoods(query: string, limit = 10): QuickFoodHit[] {
  return rank(query)
    .slice(0, limit)
    .map((r) => r.entry.hit())
}

/** Wie `searchQuickFoods`, mit der Güte jedes Treffers (0 = genau dieser Name; kleiner ist besser) */
export function scoredQuickFoods(query: string, limit = 8): { hit: QuickFoodHit; score: number }[] {
  return rank(query)
    .slice(0, limit)
    .map((r) => ({ hit: r.entry.hit(), score: r.score }))
}

/** Güte eines beliebigen Namens (z. B. eines eigenen Lebensmittels) für eine Suche, -1 = passt nicht */
export function nameScore(query: string, name: string): number {
  const q = norm(query.trim())
  if (q.length < 2) return -1
  return scoreWithStems(q, stems(q), prepare(name))
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

// --- Stöbern nach Kategorien -----------------------------------------------------------------------------------

/** Grundnahrungsmittel aus der Nährwerttabelle, die beim Stöbern in eine Kategorie gehören */
export const TABLE_IN_GROUP: Partial<Record<FoodGroupId, readonly string[]>> = {
  baeckerei: ['Vollkornbrot', 'Vollkornbrötchen', 'Vollkorntoast', 'Baguette', 'Vollkorn-Knäckebrot', 'Haferflocken', 'Honig', 'Erdnussbutter'],
  milch: [
    'Eier',
    'Butter',
    'Milch 1,5 %',
    'Naturjoghurt 1,5 %',
    'Griechischer Joghurt 2 %',
    'Skyr',
    'Magerquark',
    'Hüttenkäse',
    'Frischkäse (leicht)',
    'Gouda',
    'Bergkäse',
    'Camembert',
    'Feta',
    'Mozzarella (light)',
    'Parmesan',
    'Halloumi',
    'Haferdrink',
  ],
  wurst: [
    'Kochschinken (mager)',
    'Putenbrust-Aufschnitt',
    'Rohschinken',
    'Frühstücksspeck',
    'Geflügelwürstchen',
    'Räucherlachs',
    'Hähnchenbrust',
    'Putenschnitzel',
    'Lachsfilet',
    'Thunfisch (naturell)',
    'Garnelen',
    'Matjesfilet',
    'Makrele (geräuchert)',
  ],
  obst: ['Apfel', 'Bananen', 'Birne', 'Orange', 'Kiwi', 'Weintrauben', 'Erdbeeren', 'Heidelbeeren', 'Ananas', 'Pflaumen', 'Mango (TK)', 'Avocado', 'Datteln (entsteint)', 'Rosinen'],
  gemuese: [
    'Salatgurke',
    'Tomate',
    'Cherrytomaten',
    'Karotten',
    'Paprika',
    'Kohlrabi',
    'Radieschen',
    'Brokkoli',
    'Blumenkohl',
    'Zucchini',
    'Champignons',
    'Mais',
    'Erbsen (TK)',
    'grüne Bohnen',
    'Spargel (weiß)',
    'Feldsalat',
    'Kopfsalat',
    'Rucola',
    'Kartoffeln',
    'Süßkartoffel',
    'Oliven',
    'Gewürzgurken',
  ],
  snacks: ['Mandeln', 'Walnüsse', 'Cashewkerne', 'Haselnüsse', 'Erdnüsse (geröstet, ungesalzen)', 'Reiswaffeln', 'Kürbiskerne', 'Sonnenblumenkerne'],
  suesses: ['Zartbitterschokolade (70 %)'],
  getraenke: ['Espresso', 'Schwarzer Tee'],
}

/** Bei Obst und Gemüse stehen die Grundnahrungsmittel (Apfel, Gurke …) vorn, sonst das Alltägliche */
const TABLE_FIRST: ReadonlySet<FoodGroupId> = new Set(['obst', 'gemuese'])

/** Alles aus einer Kategorie zum Stöbern beim Erfassen */
export function browseFoods(group: FoodGroupId): QuickFoodHit[] {
  const everyday = EVERYDAY_FOODS.filter((e) => e.group === group).map(everydayHit)
  const table = (TABLE_IN_GROUP[group] ?? [])
    .map((name) => INGREDIENT_LIST.find((i) => i.name === name))
    .filter((i): i is IngredientInfo => Boolean(i))
    .map(tableHit)
  return TABLE_FIRST.has(group) ? [...table, ...everyday] : [...everyday, ...table]
}
