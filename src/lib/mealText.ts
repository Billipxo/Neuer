/**
 * Mehreres auf einmal eintragen: Freitext wie „2 Brötchen mit Butter, 1 Cappuccino und eine Banane“ wird in
 * Lebensmittel mit Mengen zerlegt – mit den Werten aus Alltäglichem, der Nährwerttabelle, der eigenen Bibliothek und
 * den eigenen Gerichten. Klappt auch mit diktiertem Text („zwei Brötchen und einen Kaffee“) und mit Größen
 * („große Pommes“, „ein kleines Bier“).
 */
import type { AmountUnit, Dish, Food } from '../types'
import type { NewFood } from '../hooks/data'
import { nameScore, norm, scoredQuickFoods, type QuickFoodHit } from './basicFoods'
import { amountToGrams, dishPerServing, nutrientsForFoodAmount } from './nutrition'
import { fmtAmount } from './units'
import { fmt1, fmtInt } from './format'

export interface MealPart {
  /** Teil der Eingabe, aus dem der Eintrag stammt */
  text: string
  name: string
  /** Gespeichertes Lebensmittel der eigenen Bibliothek oder Vorlage, die beim Eintragen gespeichert wird */
  food: Food | NewFood
  stored: boolean
  /** Eigenes Gericht – wird in Portionen eingetragen (`food` rechnet dann je Portion) */
  dish?: Dish
  amount: number
  unit: AmountUnit
  grams: number
  kcal: number
  /** z. B. „2 Stück · 120 g“, „1 Glas · 200 ml“ oder „750 ml“ */
  amountLabel: string
  /** Getränk: Menge in ml */
  liquid: boolean
}

export interface MealParse {
  parts: MealPart[]
  /** Teile, zu denen nichts Passendes gefunden wurde */
  unknown: string[]
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

/** Was die Nutzerin bzw. der Nutzer selbst angelegt hat */
interface Library {
  foods: readonly Food[]
  dishes: readonly Dish[]
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

function fromHit(hit: QuickFoodHit, score: number): Match {
  return { name: hit.name, food: hit.food, stored: false, score, measure: measureOf(hit), liquid: hit.liquid }
}

/** Bester Treffer; mit Einheit („Scheiben Käse“) gewinnt ein fast so guter Treffer mit genau dieser Einheit */
function findMatch(text: string, unitWord: string | null, lib: Library): Match | null {
  if (norm(text).length < 2) return null
  const quick = scoredQuickFoods(text, 8).map((s) => fromHit(s.hit, s.score))
  let best: Match | null = quick[0] ?? null
  let mine: Match | null = null
  for (const f of lib.foods) {
    const score = nameScore(text, f.name)
    if (score >= 0 && (!mine || score < mine.score)) {
      mine = { name: f.name, food: f, stored: true, score, measure: null, liquid: false }
    }
  }
  for (const d of lib.dishes) {
    const score = nameScore(text, d.name)
    if (score >= 0 && (!mine || score < mine.score)) {
      mine = { name: d.name, food: dishAsFood(d), stored: true, score, measure: 'Portion', liquid: false, dish: d }
    }
  }
  // Eigenes zuerst, wenn es mindestens so gut passt
  if (mine && (!best || mine.score <= best.score)) best = mine
  if (best && unitWord) {
    const fit = quick.find((m) => m.measure && norm(m.measure.split(' ')[0]) === unitWord && m.score <= best!.score + 3)
    if (fit && !(best.stored && best.score < fit.score)) best = fit
  }
  return best
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
  if (part.dish) {
    if (unit !== 'serving' || !(amount > 0)) return null
    const n = nutrientsForFoodAmount(part.food as Food, amount, 'serving')
    if (!n) return null
    return { ...part, amount, unit, grams: amount * 100, kcal: Math.round(n.kcal), amountLabel: dishLabel(part.dish, amount) }
  }
  const n = nutrientsForFoodAmount(part.food as Food, amount, unit)
  const grams = amountToGrams(amount, unit, part.food)
  if (!n || !grams) return null
  const a: Amount = { amount, unit, grams, typical: false }
  return { ...part, amount, unit, grams, kcal: Math.round(n.kcal), amountLabel: amountLabel({ measure: null, liquid: part.liquid }, a) }
}

// --- Zerlegen ---------------------------------------------------------------------------------------------------

/** Trennt Lebensmittel sicher: Komma, Semikolon, Zeilenumbruch, Plus, Schrägstrich oder Gedankenstrich */
const HARD = /\s*(?:[,;\n+]|\s[/–-]\s)\s*/
/** Trennt, wenn der Teil als Ganzes kein bekanntes Gericht ist („Hähnchen mit Reis und Gemüse“ bleibt zusammen) */
const SOFT = /\s+(?:und|&|sowie|dazu|plus|außerdem|ausserdem)\s+/i
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

function addPart(out: Out, m: Match, q: Qty, text: string) {
  const a = amountFor(m, q)
  const n = nutrientsForFoodAmount(m.food as Food, a.amount, a.unit)
  if (!n || !(a.grams > 0)) {
    out.unknown.push(text)
    return
  }
  out.parts.push({
    text,
    name: m.name,
    food: m.food,
    stored: m.stored,
    dish: m.dish,
    amount: a.amount,
    unit: a.unit,
    grams: a.grams,
    kcal: Math.round(n.kcal),
    amountLabel: amountLabel(m, a),
    liquid: m.liquid,
  })
}

/** Ein Teil ist als Ganzes ein bekannter Name („Halbes Hähnchen“, „Kaffee mit Milch“, „Quark 20 %“) */
function wholeName(s: string, lib: Library): Match | null {
  const direct = findMatch(s, null, lib)
  if (direct && direct.score <= 2) return direct
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
    addPart(out, whole, NO_QTY(text), text)
    return
  }
  const q = parseQty(text)
  if (q.explicit) out.explicit = true
  const m = q.rest ? findMatch(q.rest, q.unit?.word ?? null, lib) : null
  if (m && m.score <= 2) {
    addPart(out, m, q, text)
    return
  }
  // „und“: mehrere Lebensmittel, jedes mit eigener Menge
  if (!nested) {
    const pieces = text.split(SOFT)
    if (pieces.length > 1) {
      for (const p of pieces) parseSegment(p, lib, out, true)
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
      if (left) addPart(out, left, q, withParts[0])
      else out.unknown.push(withParts[0])
      const perPiece = !q.unit || ['count', 'serving', 'container'].includes(q.unit.kind)
      const sideQty: Qty = rq.explicit ? rq : { ...NO_QTY(rq.rest), n: perPiece && q.n <= 12 ? q.n : 1 }
      if (right) addPart(out, right, sideQty, withParts[1])
      else out.unknown.push(withParts[1])
      return
    }
  }
  const fallback = m ?? (q.rest ? wordMatch(q.rest, q.unit?.word ?? null, lib) : null)
  if (fallback) addPart(out, fallback, q, text)
  else out.unknown.push(text)
}

/**
 * Zerlegt eine Eingabe in Einträge. Gibt `null` zurück, wenn es nichts zu zerlegen gibt – ein einzelnes Lebensmittel
 * ohne Mengenangabe findet die normale Suche.
 */
export function parseMealText(input: string, foods: readonly Food[] = [], dishes: readonly Dish[] = []): MealParse | null {
  const lib: Library = { foods, dishes }
  let text = input.trim()
  if (text.length < 3) return null
  // „Frühstück: 2 Brötchen …“ – die Bezeichnung davor zählt nicht
  if (text.includes(':')) text = text.slice(text.lastIndexOf(':') + 1)
  // Dezimalkomma schützen („0,5 l“), damit nur Kommas zwischen Lebensmitteln trennen
  const KEEP = '\u0001'
  const segments = text
    .replace(/(\d),(\d)/g, `$1${KEEP}$2`)
    .split(HARD)
    .map((s) => s.split(KEEP).join(',').trim())
    .filter(Boolean)
    .slice(0, 15)
  const out: Out = { parts: [], unknown: [], explicit: false }
  for (const s of segments) parseSegment(s, lib, out)
  if (!out.parts.length) return null
  if (out.parts.length + out.unknown.length < 2 && !out.explicit) return null
  return { parts: out.parts, unknown: out.unknown }
}
