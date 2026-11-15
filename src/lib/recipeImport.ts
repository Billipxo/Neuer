/**
 * Rezept aus Text übernehmen: Zutatenliste („200 g Mehl“, „2 EL Olivenöl“, „1 Zwiebel, fein gewürfelt“) und Zubereitung
 * (nummerierte Schritte oder Absätze), z. B. von einer Webseite kopiert. Zutaten werden der Nährwerttabelle zugeordnet,
 * damit die Nährwerte stimmen; was nicht passt, wird genannt und lässt sich von Hand ergänzen.
 */
import { DEFAULT_UNIT_GRAMS, INGREDIENT_LIST, type IngredientInfo } from '../data/ingredients'
import type { RecipeIngredient } from '../types'
import { norm } from './basicFoods'
import { ingredientCategory, unitOptions } from './variants'
import { fmt1 } from './format'

/** Aufzählungszeichen und Nummern am Zeilenanfang („- “, „• “, „1. “, „2) “, „▢ “) – nicht „2 Eier“ */
const LIST_MARK = /^\s*(?:[-–—•*·◦▪▢☐☑✓✔]+|\[[ xX✓]?\]|\d+[.)](?=\s)|schritt\s+\d+[:.)]?)\s*/i

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 }

/** Menge vorn: „200“, „1,5“, „1/2“, „½“, „1 ½“, „2-3“ (dann der Mittelwert) */
const AMOUNT = /^(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?(?:\s*[½¼¾⅓⅔⅛])?|[½¼¾⅓⅔⅛])(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*/

function parseAmount(s: string): number | null {
  const t = s.replace(/\s+/g, '')
  const frac = /^(\d+)\/(\d+)$/.exec(t)
  if (frac) return Number(frac[2]) > 0 ? Number(frac[1]) / Number(frac[2]) : null
  const mixed = /^(\d+(?:[.,]\d+)?)?([½¼¾⅓⅔⅛])?$/.exec(t)
  if (!mixed || (!mixed[1] && !mixed[2])) return null
  return (mixed[1] ? Number(mixed[1].replace(',', '.')) : 0) + (mixed[2] ? FRACTIONS[mixed[2]] : 0)
}

/** Einheiten, wie sie in Rezepten stehen → Einheit der App (und Umrechnung) */
const UNIT_ALIASES: [RegExp, string, number][] = [
  [/^(g|gr|gramm)\.?$/i, 'g', 1],
  [/^(kg|kilo|kilogramm)\.?$/i, 'g', 1000],
  [/^(ml|milliliter)\.?$/i, 'ml', 1],
  [/^(cl|zentiliter)\.?$/i, 'ml', 10],
  [/^(dl|deziliter)\.?$/i, 'ml', 100],
  [/^(l|liter|ltr)\.?$/i, 'ml', 1000],
  [/^(el|essl(ö|oe)ffel|essl\.)\.?$/i, 'EL', 1],
  [/^(tl|teel(ö|oe)ffel|teel\.)\.?$/i, 'TL', 1],
  [/^(prise|prisen|msp|messerspitze|messerspitzen)\.?$/i, 'Prise', 1],
  [/^(zehe|zehen)$/i, 'Zehe', 1],
  [/^(bund|bd)\.?$/i, 'Bund', 1],
  [/^(zweig|zweige|stängel|stiel|stiele)$/i, 'Zweig', 1],
  [/^(stück|stücke|stk|st)\.?$/i, 'Stück', 1],
  [/^(scheibe|scheiben)$/i, 'Scheibe', 1],
  [/^(dose|dosen)$/i, 'Dose', 1],
  [/^(päckchen|pck|pkg|packung|packungen|tüte|tütchen)\.?$/i, 'Päckchen', 1],
  [/^(blatt|blätter)$/i, 'Blatt', 1],
  [/^(schale|schalen)$/i, 'Schale', 1],
  [/^(tasse|tassen)$/i, 'ml', 200],
  [/^(becher)$/i, 'g', 200],
  [/^(glas|gläser)$/i, 'g', 200],
]

/** Wörter vor dem Namen, die nichts an der Zutat ändern („frische Champignons“, „große Zwiebel“) */
const ADJECTIVES =
  /^(?:(?:etwas|wenig|reichlich|frisch|frische|frischer|frisches|frischen|groß|große|großer|großes|großen|klein|kleine|kleiner|kleines|kleinen|mittelgroß|mittelgroße|mittelgroßer|mittelgroßes|mittelgroßen|reif|reife|reifer|reifes|reifen|tk|tiefgekühlt|tiefgekühlte|gehackt|gehackte|gehackter|gehacktes|gemahlen|gemahlene|gemahlener|getrocknet|getrocknete|getrockneter|bio|ca\.?|etwa|evtl\.?|eventuell|optional)\s+)+/i

/** Stimmt dieses Wort-Ende als Mehrzahl? („Zwiebeln“ → „Zwiebel“, „Eiern“ → „Eier“) */
function singulars(q: string): string[] {
  const out = [q]
  for (const end of ['n', 'en', 'e', 's', 'er']) if (q.endsWith(end) && q.length - end.length >= 3) out.push(q.slice(0, -end.length))
  return out
}

/** Allgemeine Namen in Rezepten → Eintrag der Nährwerttabelle */
const GENERIC: Record<string, string> = { ol: 'Rapsöl', speiseol: 'Rapsöl', pflanzenol: 'Rapsöl', bratol: 'Rapsöl' }

/** Passende Zutat der Nährwerttabelle: genauer Name, Mehrzahl, längster Namensanfang, Oberbegriff */
export function matchTableIngredient(text: string): IngredientInfo | null {
  const q = norm(text.replace(ADJECTIVES, '').trim())
  if (q.length < 2) return null
  if (GENERIC[q]) return INGREDIENT_LIST.find((i) => i.name === GENERIC[q]) ?? null
  const forms = singulars(q)
  const byName = (pred: (n: string) => boolean) => INGREDIENT_LIST.find((i) => pred(norm(i.name)))
  // 1. genauer Name, auch in Mehrzahl oder Einzahl
  for (const f of forms) {
    const hit = byName((n) => n === f || singulars(n).includes(f))
    if (hit) return hit
  }
  // 2. Tabellenname ist der Anfang („Hähnchenbrustfilets“ → Hähnchenbrust) – der längste gewinnt
  const prefix = INGREDIENT_LIST.filter((i) => q.startsWith(norm(i.name)) && norm(i.name).length >= 4).sort((a, b) => b.name.length - a.name.length)[0]
  if (prefix) return prefix
  // 3. Name beginnt mit der Eingabe („Parmesan“ → Parmesan), dann der Oberbegriff („Hähnchen“ → Hähnchenbrust)
  const starts = INGREDIENT_LIST.filter((i) => forms.some((f) => norm(i.name).startsWith(f))).sort((a, b) => a.name.length - b.name.length)[0]
  if (starts) return starts
  return INGREDIENT_LIST.find((i) => forms.includes(norm(i.base))) ?? null
}

export interface ImportedIngredients {
  ingredients: RecipeIngredient[]
  /** Zeilen ohne passende Zutat in der Nährwerttabelle */
  unknown: string[]
}

/** Eine Zeile der Zutatenliste: „2 EL Olivenöl“, „1 Zwiebel, fein gewürfelt“, „Salz und Pfeffer“ */
export function parseIngredientLine(raw: string): RecipeIngredient | null {
  let s = raw.replace(LIST_MARK, '').replace(/\s+/g, ' ').trim()
  if (!s) return null
  let amount: number | null = null
  const a = AMOUNT.exec(s)
  if (a) {
    const first = parseAmount(a[1])
    const second = a[2] ? Number(a[2].replace(',', '.')) : null
    amount = first !== null && second !== null ? (first + second) / 2 : first
    s = s.slice(a[0].length)
  }
  let unit: string | null = null
  let unitText = ''
  let factor = 1
  const word = /^([a-zäöüß]+\.?)(?:\s+|$)/i.exec(s)
  if (word) {
    const alias = UNIT_ALIASES.find(([re]) => re.test(word[1]))
    if (alias && s.slice(word[0].length).trim()) {
      ;[, unit, factor] = alias
      unitText = word[1]
      s = s.slice(word[0].length)
    }
  }
  // Der ganze Rest ist schon ein Name der Tabelle („Tomaten (stückig)“)? Dann nichts abtrennen
  const exact = INGREDIENT_LIST.find((i) => norm(i.name) === norm(s.trim()))
  // „2 Knoblauchzehen“ heißt 2 Zehen, nicht 2 Knollen
  if (!unit && /zehen?$/i.test(s.trim())) unit = 'Zehe'
  // Hinweise abtrennen: „Zwiebel, fein gewürfelt“, „Mehl (Type 405)“
  const notes: string[] = []
  if (exact) s = exact.name
  else {
    s = s.replace(/\(([^)]*)\)/g, (_, n: string) => {
      if (n.trim()) notes.push(n.trim())
      return ' '
    })
    const comma = s.indexOf(',')
    if (comma > 0) {
      notes.push(s.slice(comma + 1).trim())
      s = s.slice(0, comma)
    }
  }
  const name = s.replace(/\s+/g, ' ').trim()
  const info = exact ?? matchTableIngredient(name)
  if (!info) return null
  // Einheit, die es für diese Zutat gibt; sonst umrechnen – oder die Menge offen lassen und als Hinweis behalten
  const options = unitOptions({ name: info.name })
  const asText = (n: number | null, u: string) => `${n === null ? '' : `${fmt1(n)} `}${u}`.trim()
  let finalAmount = amount === null ? null : amount * factor
  let finalUnit: string
  if (unit) finalUnit = unit
  else if (amount === null) finalUnit = options[0]
  else if (options.includes('Stück')) finalUnit = 'Stück'
  else {
    // „2 Hähnchenbrustfilets“: Stückgewicht unbekannt – Gramm bitte selbst eintragen
    notes.push(asText(amount, 'Stück'))
    finalUnit = 'g'
    finalAmount = null
  }
  if (!options.includes(finalUnit)) {
    if (finalUnit === 'ml' && options.includes('g')) finalUnit = 'g'
    else if (DEFAULT_UNIT_GRAMS[finalUnit] && finalAmount !== null) {
      // „1 Prise Zucker“ → 0,5 g, der Hinweis behält die Angabe aus dem Rezept
      notes.push(asText(amount, unitText || finalUnit))
      finalAmount *= DEFAULT_UNIT_GRAMS[finalUnit]
      finalUnit = 'g'
    } else {
      notes.push(asText(amount, unitText || finalUnit))
      finalUnit = options[0]
      finalAmount = null
    }
  }
  const note = [...new Set(notes.filter(Boolean))].join(', ')
  return {
    name: info.name,
    amount: finalAmount === null ? null : Math.round(finalAmount * 100) / 100,
    unit: finalUnit,
    category: ingredientCategory(info.name),
    ...(note ? { note } : {}),
  }
}

/** Ganze Zutatenliste – eine Zutat je Zeile; Überschriften („Für den Teig:“) werden überlesen */
export function parseIngredientList(text: string): ImportedIngredients {
  const out: ImportedIngredients = { ingredients: [], unknown: [] }
  for (const line of text.split(/\r?\n/)) {
    const t = line.replace(LIST_MARK, '').trim()
    if (!t || /:$/.test(t) || /^zutaten\b/i.test(t)) continue
    // „Salz und Pfeffer“ – zwei Gewürze in einer Zeile, außer die Tabelle kennt genau das
    const whole = parseIngredientLine(t)
    const parts = !whole && /^[a-zäöüß]+ und [a-zäöüß]+$/i.test(t) ? t.split(/\s+und\s+/i) : [t]
    for (const p of parts) {
      const ing = parts.length === 1 ? whole : parseIngredientLine(p)
      if (ing) out.ingredients.push(ing)
      else out.unknown.push(p)
    }
  }
  return out
}

/** Zubereitung in Schritte: nummerierte Zeilen bzw. Aufzählungen, sonst Absätze; Fortsetzungszeilen gehören dazu */
export function parseSteps(text: string): string[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim())
  const marked = lines.filter((l) => LIST_MARK.test(l) && l.replace(LIST_MARK, '').trim()).length
  const steps: string[] = []
  if (marked >= 2) {
    for (const l of lines) {
      if (!l) continue
      if (LIST_MARK.test(l) || !steps.length) steps.push(l.replace(LIST_MARK, '').trim())
      else steps[steps.length - 1] += ` ${l}`
    }
  } else {
    let current = ''
    for (const l of lines) {
      if (!l) {
        if (current) steps.push(current)
        current = ''
      } else current = current ? `${current} ${l}` : l
    }
    if (current) steps.push(current)
  }
  return steps.map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 1 && !/^(zubereitung|anleitung)\s*:?$/i.test(s))
}
