/**
 * „Mit Fleisch“: Ideen, wie man ein Rezept mit Fleisch abwandelt – eine vegetarische Eiweißquelle gegen Fleisch
 * tauschen (Tofu → Hähnchen, Linsen → Hack), Fleisch ergänzen (Hähnchen, Speck, Schinken, Würstchen, Hack, Kasseler)
 * oder bei Fleischgerichten ein anderes Stück bzw. mehr davon nehmen.
 *
 * Jede Idee bringt die fertige Zutatenliste, einen zusätzlichen Zubereitungsschritt und einen passenden Titel mit;
 * die Nährwerte rechnet der Editor wie immer aus den Zutaten neu.
 */
import type { ChapterId } from '../data/chapters'
import type { RecipeIngredient } from '../types'
import { getRecipe, roundAmount } from './recipes'
import { ingredientFlags, ingredientGrams, ingredientInfo, nutritionPerServing } from './recipeNutrition'
import type { VariantDraft } from './variants'

/** Wie ein Fleisch (oder eine vegetarische Zutat) im Titel heißt */
interface Words {
  /** Wörter im Titel, die diese Zutat meinen – längere zuerst */
  match: string[]
  /** allein stehend, z. B. „mit Hähnchen“ */
  word: string
  /** vor einem Bindestrich, z. B. „Puten-Curry“ */
  hyphen: string
  /** in zusammengeschriebenen Wörtern, z. B. „Putengeschnetzeltes“ */
  stem: string
}

interface Meat extends Words {
  /** Name in der Nährwerttabelle */
  name: string
  /** Was man damit macht (ganze Sätze) */
  prep: string
  /** Menge pro Portion, wenn es dazukommt bzw. mindestens beim Tausch */
  perServing: number
  /** Einheit dafür (sonst Gramm) */
  unit?: 'Stück'
}

const w = (word: string, hyphen = word, stem = hyphen, match: string[] = [word]): Words => ({ match, word, hyphen, stem })

const POULTRY_PREP = 'in Streifen oder Würfel schneiden, salzen und pfeffern und in einer Pfanne mit wenig Öl rundum braten, bis sie innen nicht mehr rosa ist (6–8 Minuten).'
const MINCE_PREP = 'zu Beginn in einem Topf oder einer Pfanne ohne zusätzliches Fett krümelig braten, salzen und pfeffern.'
const STRIPS_PREP = 'in dünne Streifen schneiden und portionsweise in einer sehr heißen Pfanne mit wenig Öl 1–2 Minuten scharf anbraten – so bleibt es zart. Erst danach salzen und pfeffern.'

const MEATS: Meat[] = [
  { name: 'Hähnchenbrust', ...w('Hähnchen', 'Hähnchen', 'Hähnchen', ['Hähnchenbrust', 'Hähnchen']), prep: `Die Hähnchenbrust ${POULTRY_PREP}`, perServing: 100 },
  { name: 'Putenbrust', ...w('Pute', 'Puten', 'Puten', ['Putenbrust', 'Puten', 'Pute']), prep: `Die Putenbrust ${POULTRY_PREP}`, perServing: 100 },
  {
    name: 'Schweinefilet',
    ...w('Schweinefilet', 'Schweinefilet', 'Schweine', ['Schweinefilet', 'Schweine']),
    prep: 'Das Schweinefilet in Medaillons oder Streifen schneiden, salzen und pfeffern und in einer Pfanne mit wenig Öl rundum anbraten, bis es innen nur noch zart rosa ist (4–6 Minuten).',
    perServing: 100,
  },
  { name: 'Rinderhüftsteak', ...w('Rindfleisch', 'Rindfleisch', 'Rinder', ['Rinderhüftsteak', 'Hüftsteak', 'Rindfleisch', 'Rinder', 'Rind']), prep: `Das Rindfleisch ${STRIPS_PREP}`, perServing: 100 },
  { name: 'Rumpsteak', ...w('Rumpsteak', 'Rumpsteak', 'Rinder'), prep: `Das Rumpsteak ${STRIPS_PREP}`, perServing: 100 },
  {
    name: 'Rinderfilet',
    ...w('Rinderfilet', 'Rinderfilet', 'Rinder'),
    prep: 'Das Rinderfilet in Medaillons oder Streifen schneiden und in einer sehr heißen Pfanne mit wenig Öl kurz scharf anbraten (Streifen 1–2 Minuten, Medaillons je Seite 2–3 Minuten). Erst danach salzen und pfeffern.',
    perServing: 100,
  },
  { name: 'Rinderhack (mager)', ...w('Hackfleisch', 'Hackfleisch', 'Hack', ['Hackfleisch', 'Rinderhack', 'Hack']), prep: `Das Hackfleisch ${MINCE_PREP}`, perServing: 100 },
  { name: 'Hackfleisch (gemischt)', ...w('Hackfleisch', 'Hackfleisch', 'Hack', ['Hackfleisch', 'Hack']), prep: `Das Hackfleisch ${MINCE_PREP}`, perServing: 100 },
  { name: 'Putenhackfleisch', ...w('Putenhack', 'Putenhack', 'Putenhack', ['Putenhackfleisch', 'Putenhack']), prep: `Das Putenhack ${MINCE_PREP}`, perServing: 100 },
  { name: 'Lammhackfleisch', ...w('Lammhack', 'Lammhack', 'Lammhack', ['Lammhackfleisch', 'Lammhack']), prep: `Das Lammhack ${MINCE_PREP}`, perServing: 100 },
  { name: 'Frühstücksspeck', ...w('Speck', 'Speck', 'Speck', ['Speck', 'Bacon']), prep: 'Den Speck in Streifen schneiden und in einer Pfanne ohne Fett knusprig auslassen.', perServing: 15 },
  { name: 'Kochschinken (mager)', ...w('Schinken'), prep: 'Den Schinken in Streifen oder Würfel schneiden.', perServing: 30 },
  { name: 'Rohschinken', ...w('Rohschinken'), prep: 'Den Rohschinken in Streifen zupfen.', perServing: 20 },
  { name: 'Wiener Würstchen', ...w('Würstchen'), prep: 'Die Würstchen in Scheiben schneiden.', perServing: 1, unit: 'Stück' },
  { name: 'Geflügelwürstchen', ...w('Würstchen'), prep: 'Die Würstchen in Scheiben schneiden.', perServing: 1, unit: 'Stück' },
  { name: 'Kasseler', ...w('Kasseler'), prep: 'Das Kasseler in Würfel oder Scheiben schneiden und in einer Pfanne ohne Fett rundum anbraten.', perServing: 100 },
  {
    name: 'Schweineschnitzel',
    ...w('Schweineschnitzel', 'Schweine', 'Schweine', ['Schweineschnitzel', 'Schweine', 'Schnitzel']),
    prep: 'Das Schweinefleisch wie im Rezept schneiden, würzen und braten, bis es durchgegart ist – etwa so lange wie Pute.',
    perServing: 150,
  },
  {
    name: 'Kalbsschnitzel',
    ...w('Kalbsschnitzel', 'Kalbs', 'Kalbs', ['Kalbsschnitzel', 'Kalbs']),
    prep: 'Das Kalbfleisch wie im Rezept schneiden und würzen, aber nur kurz braten – Schnitzel je Seite 1–2 Minuten, Streifen etwa 2 Minuten –, dann bleibt es zart.',
    perServing: 150,
  },
  {
    name: 'Putenschnitzel',
    ...w('Putenschnitzel', 'Puten', 'Puten', ['Putenschnitzel', 'Puten', 'Pute']),
    prep: 'Das Putenfleisch wie im Rezept schneiden, würzen und braten, bis es durchgegart ist – Schnitzel je Seite etwa 3 Minuten.',
    perServing: 150,
  },
  { name: 'Bratwurst', ...w('Bratwurst', 'Bratwurst', 'Bratwurst', ['Bratwurst', 'Bratwürste']), prep: 'Die Bratwürste in einer Pfanne mit wenig Öl rundum 8–10 Minuten braten.', perServing: 1, unit: 'Stück' },
  {
    name: 'Bratwurst (Geflügel)',
    ...w('Geflügelbratwurst', 'Geflügelbratwurst', 'Geflügelbratwurst', ['Geflügelbratwurst', 'Geflügelbratwürste', 'Bratwurst']),
    prep: 'Die Geflügelbratwürste in einer Pfanne mit wenig Öl rundum 8–10 Minuten braten.',
    perServing: 1,
    unit: 'Stück',
  },
  {
    name: 'Hirschfleisch',
    ...w('Hirsch', 'Hirsch', 'Hirsch', ['Hirschfleisch', 'Hirsch']),
    prep: 'Das Hirschfleisch wie im Rezept anbraten und schmoren, bis es weich ist (je nach Stück 1½–2 Stunden).',
    perServing: 150,
  },
  {
    name: 'Schweineschulter',
    ...w('Schweinefleisch', 'Schweinefleisch', 'Schweine'),
    prep: 'Das Schweinefleisch in Würfel schneiden und wie im Rezept anbraten und schmoren, bis es weich ist (etwa 1½ Stunden).',
    perServing: 150,
  },
]
const MEAT = new Map(MEATS.map((m) => [m.name, m]))

/** Vegetarische Eiweißquellen und womit man sie ersetzen kann */
interface VegSwap {
  from: string
  words: Words
  to: string
  /** Mengenfaktor nach Gewicht, z. B. 2,5 bei trockenen Linsen → Hack */
  factor: number
  why: string
  /** nur bei passenden Titeln (z. B. Linsen nur in Bolognese, Chili, Lasagne …) */
  when?: RegExp
  /** nicht bei diesen Titeln (z. B. kein Hähnchen statt Kichererbsen im Hummus) */
  not?: RegExp
  /** Hinweis, der an den Schritt angehängt wird */
  extra?: string
}

const HACK_DISHES = /bolognese|lasagne|moussaka|chili|ragout|ragù|sugo|shepherd|hirtenkuchen|auflauf/i
const VEG_SWAPS: VegSwap[] = [
  { from: 'Tofu (natur)', words: w('Tofu'), to: 'Hähnchenbrust', factor: 1, why: 'mindestens gleiche Menge – rundum anbraten', not: /rührei/i },
  { from: 'Tofu (natur)', words: w('Tofu'), to: 'Rinderhüftsteak', factor: 1, why: 'in dünnen Streifen, nur kurz scharf angebraten', not: /rührei|nuggets|spieß/i },
  { from: 'Räuchertofu', words: w('Räuchertofu'), to: 'Kasseler', factor: 1, why: 'würzt ähnlich rauchig' },
  { from: 'Räuchertofu', words: w('Räuchertofu'), to: 'Frühstücksspeck', factor: 0.5, why: 'halbe Menge – knusprig ausgelassen' },
  { from: 'Halloumi', words: w('Halloumi'), to: 'Hähnchenbrust', factor: 1, why: 'gebraten oder gegrillt statt Käse' },
  {
    from: 'Kichererbsen',
    words: w('Kichererbsen'),
    to: 'Hähnchenbrust',
    factor: 1,
    why: 'Hähnchen als Eiweißquelle statt Hülsenfrüchten',
    not: /hummus|falafel|knusprig|creme|aufstrich|dip/i,
    extra: 'Dort untermischen, wo im Rezept die Kichererbsen dazukommen.',
  },
  ...(['Tellerlinsen', 'rote Linsen'] as const).map(
    (from): VegSwap => ({
      from,
      words: w('Linsen'),
      to: 'Rinderhack (mager)',
      factor: 2.5,
      why: '100 g Hack statt 40 g trockener Linsen',
      when: HACK_DISHES,
      extra: 'Die Kochzeit der Linsen entfällt – die Sauce danach nur noch 15–20 Minuten köcheln lassen.',
    }),
  ),
]

/** Andere Fleischstücke für Fleischgerichte – jeweils in ähnlicher Zubereitung */
const OTHER_MEAT: Record<string, string[]> = {
  Hähnchenbrust: ['Putenbrust', 'Schweinefilet', 'Rinderhüftsteak'],
  Hähnchenschenkelfilet: ['Putenbrust', 'Schweinefilet'],
  Putenbrust: ['Hähnchenbrust', 'Schweinefilet'],
  Putenschnitzel: ['Schweineschnitzel', 'Kalbsschnitzel'],
  Schweineschnitzel: ['Kalbsschnitzel', 'Putenschnitzel'],
  Schweinefilet: ['Rinderfilet', 'Hähnchenbrust'],
  Rinderhüftsteak: ['Rumpsteak', 'Rinderfilet'],
  'Rinderhack (mager)': ['Hackfleisch (gemischt)', 'Lammhackfleisch'],
  Rinderhackfleisch: ['Hackfleisch (gemischt)', 'Lammhackfleisch'],
  'Hackfleisch (gemischt)': ['Rinderhack (mager)', 'Lammhackfleisch'],
  Putenhackfleisch: ['Rinderhack (mager)', 'Hackfleisch (gemischt)'],
  Lammhackfleisch: ['Rinderhack (mager)'],
  Rindergulasch: ['Hirschfleisch', 'Schweineschulter'],
  Geflügelwürstchen: ['Wiener Würstchen'],
  'Bratwurst (Geflügel)': ['Bratwurst'],
  'Kochschinken (mager)': ['Rohschinken'],
}

/** Titel-Wörter für Fleisch, das selbst getauscht wird (aber nicht als Ziel vorkommt) */
const FROM_WORDS: Record<string, Words> = {
  Hähnchenschenkelfilet: w('Hähnchen', 'Hähnchen', 'Hähnchen', ['Hähnchenschenkel', 'Hähnchen']),
  Rinderhackfleisch: w('Hackfleisch', 'Hackfleisch', 'Hack', ['Hackfleisch', 'Rinderhack', 'Hack']),
  Rindergulasch: w('Rindfleisch', 'Rinder', 'Rinder', ['Rinder', 'Rind']),
}

export type MeatIdeaKind = 'swap' | 'add' | 'more'

export interface MeatIdea {
  /** Eindeutig je Rezept – auch als Link-Parameter (?fleisch=…) */
  key: string
  kind: MeatIdeaKind
  /** Kurz für Knopf und Liste, z. B. „Hähnchen statt Tofu“ oder „Mit Speck“ */
  label: string
  /** Ergänzung, z. B. „gleiche Menge – rundum anbraten“ */
  why: string
  /** Neue Zutat (bzw. die mehr genommene) */
  ingredient: RecipeIngredient
  /** Ergebnis: Zutaten, Schritte und Titel nach der Abwandlung */
  ingredients: RecipeIngredient[]
  steps: string[]
  title: string
  /** Unterschied pro Portion */
  kcalDelta: number
  proteinDelta: number
}

const SWEET_CHAPTERS: ChapterId[] = ['suesses', 'getraenke', 'grundrezepte']
const SWEET = ['Zucker', 'Honig', 'Ahornsirup', 'Vanillezucker', 'Puderzucker', 'Bananen', 'Beeren (TK)', 'Erdbeeren', 'Heidelbeeren', 'Kakaopulver', 'Mango (TK)', 'Milchreis', 'Grieß', 'Datteln (entsteint)']
const SAVORY_BREAKFAST = ['Eier', 'Vollkornbrot', 'Vollkorntoast', 'Vollkornbrötchen', 'Vollkorn-Wraps', 'Tortillas (Mais)', 'Kartoffeln', 'Baguette']
const PASTA = ['Spaghetti', 'Vollkornspaghetti', 'Bandnudeln', 'Vollkorn-Penne', 'Makkaroni', 'Lasagneplatten', 'Gnocchi', 'Tortellini (frisch)', 'Spätzle (frisch)', 'Schupfnudeln', 'Cannelloni']
const ASIAN = ['Sojasauce', 'Currypaste', 'Kokosmilch (light)', 'Mie-Nudeln', 'Reisnudeln', 'Sesamöl', 'Garam Masala']
const STEW = ['Kartoffeln', 'Tellerlinsen', 'rote Linsen', 'Schälerbsen (getrocknet)', 'Kidneybohnen', 'weiße Bohnen', 'Perlgraupen', 'Weißkohl', 'Wirsing']
const CABBAGE = ['Sauerkraut', 'Grünkohl', 'Weißkohl', 'Wirsing', 'Spitzkohl', 'Rosenkohl', 'Rotkohl']
const TOMATO = ['passierte Tomaten', 'Tomaten (stückig)']
const CREAMY = ['Sahne', 'Kochsahne 15 %', 'Frischkäse (leicht)', 'Erbsen (TK)']

const VARIANT_SUFFIX = ' – meine Variante'
/** Fleisch, das man zusätzlich obendrauf oder hinein gibt, ohne dass es die Eiweißquelle ersetzt */
const TOPPINGS = ['Frühstücksspeck', 'Kochschinken (mager)', 'Rohschinken', 'Wiener Würstchen', 'Kasseler']

/** Ideen, wie man einen Entwurf mit Fleisch abwandelt – die naheliegendsten zuerst */
export function meatIdeas(d: VariantDraft, limit = 4): MeatIdea[] {
  if (isSweet(d)) return []
  const ingredients = d.ingredients
  const has = (names: string[]) => ingredients.some((i) => names.includes(i.name))
  const flags = ingredients.map(ingredientFlags).join('')
  const title = d.title.endsWith(VARIANT_SUFFIX) ? d.title.slice(0, -VARIANT_SUFFIX.length) : d.title
  const before = nutritionPerServing(ingredients, d.servings)
  const out: MeatIdea[] = []

  const finish = (
    partial: Omit<MeatIdea, 'kcalDelta' | 'proteinDelta' | 'steps'> & { step: string | null },
  ): MeatIdea => {
    const after = nutritionPerServing(partial.ingredients, d.servings)
    const { step, ...rest } = partial
    return { ...rest, steps: step ? [step, ...d.steps] : [...d.steps], kcalDelta: after.kcal - before.kcal, proteinDelta: after.protein - before.protein }
  }

  if (!flags.includes('M') && !flags.includes('F')) {
    // 1. Vegetarische Eiweißquelle gegen Fleisch tauschen
    for (const rule of VEG_SWAPS) {
      const index = ingredients.findIndex((i) => i.name === rule.from)
      if (index < 0 || (rule.when && !rule.when.test(title)) || (rule.not && rule.not.test(title))) continue
      const meat = MEAT.get(rule.to)!
      const grams = Math.max((ingredientGrams(ingredients[index]) ?? 0) * rule.factor, meat.perServing * d.servings)
      const next = meatIngredient(meat, grams)
      const list = ingredients.map((x, i) => (i === index ? next : x))
      const label = `${meat.word} statt ${rule.words.word}`
      out.push(
        finish({
          key: `swap:${rule.from}:${meat.name}`,
          kind: 'swap',
          label,
          why: rule.why,
          ingredient: next,
          ingredients: list,
          title: swapTitle(title, rule.words, meat),
          step: `${label}: ${meat.prep} Danach im Rezept anstelle von ${rule.words.word} verwenden.${rule.extra ? ` ${rule.extra}` : ''}`,
        }),
      )
    }

    // 2. Fleisch ergänzen – je nach Gericht. Gibt es schon einen Tausch, nur noch etwas obendrauf (Speck, Schinken …),
    //    damit nicht Tofu und Schweinefilet nebeneinander im Rezept stehen
    const offered = new Set(out.map((i) => i.ingredient.name))
    for (const name of additions(d, has)) {
      const meat = MEAT.get(name)!
      if (has([meat.name]) || offered.has(meat.name) || (offered.size > 0 && !TOPPINGS.includes(meat.name))) continue
      const next = meatIngredient(meat, meat.perServing * d.servings)
      out.push(
        finish({
          key: `add::${meat.name}`,
          kind: 'add',
          label: `Mit ${meat.word}`,
          why: `${formatAmount(next)} ${meat.name} dazu`,
          ingredient: next,
          ingredients: [next, ...ingredients],
          title: addToTitle(title, meat.word),
          step: `${meat.word} dazu: ${meat.prep} ${placement(meat, d.chapter)}`,
        }),
      )
    }
  } else if (flags.includes('M')) {
    // 3. Fleischgerichte: anderes Stück oder mehr davon
    const main = mainMeat(ingredients)
    if (main) {
      const { index, ing } = main
      const fromWords = MEAT.get(ing.name) ?? FROM_WORDS[ing.name]
      for (const to of OTHER_MEAT[ing.name] ?? []) {
        const meat = MEAT.get(to)
        if (!meat || has([to]) || !fromWords) continue
        const next = convertTo(ing, meat)
        // gleiches Wort (Hackfleisch → Hackfleisch): die genauen Namen nennen
        const label = meat.word === fromWords.word ? `${meat.name} statt ${ing.name}` : `${meat.word} statt ${fromWords.word}`
        out.push(
          finish({
            key: `swap:${ing.name}:${meat.name}`,
            kind: 'swap',
            label,
            why: `gleiche Menge ${meat.name}`,
            ingredient: next,
            ingredients: ingredients.map((x, i) => (i === index ? next : x)),
            title: swapTitle(title, fromWords, meat),
            step: `${label}: ${meat.prep} Danach im Rezept anstelle von ${meat.word === fromWords.word ? ing.name : fromWords.word} verwenden.`,
          }),
        )
      }
      const grams = ingredientGrams(ing) ?? 0
      if (ing.amount !== null && grams / d.servings < 200) {
        const more = { ...ing, amount: roundAmount(ing.amount * 1.5, ing.unit) }
        out.push(
          finish({
            key: `more:${ing.name}:`,
            kind: 'more',
            label: 'Mehr Fleisch',
            why: `${ing.name}: ${formatAmount(ing)} → ${formatAmount(more)}`,
            ingredient: more,
            ingredients: ingredients.map((x, i) => (i === index ? more : x)),
            title,
            step: null,
          }),
        )
      }
    }
  }
  return out.slice(0, limit)
}

/** Idee übernehmen: Zutaten, Schritte und Titel */
export function applyMeatIdea<T extends VariantDraft>(d: T, idea: MeatIdea): T {
  return { ...d, ingredients: idea.ingredients, steps: idea.steps, title: idea.title }
}

function isSweet(d: VariantDraft): boolean {
  if (SWEET_CHAPTERS.includes(d.chapter)) return true
  if (getRecipe(d.base_recipe_id)?.tags.includes('suess')) return true
  const names = new Set(d.ingredients.map((i) => i.name))
  if (d.chapter === 'fruehstueck') return SWEET.some((n) => names.has(n)) || !SAVORY_BREAKFAST.some((n) => names.has(n))
  if (d.chapter === 'snacks') return SWEET.some((n) => names.has(n))
  return false
}

/** Welches Fleisch zu welchem Gericht passt – das Passendste zuerst */
function additions(d: VariantDraft, has: (names: string[]) => boolean): string[] {
  const asian = has(ASIAN)
  const tomato = has(TOMATO)
  if (d.chapter === 'fruehstueck') return ['Frühstücksspeck', 'Kochschinken (mager)']
  if (d.chapter === 'snacks') return ['Kochschinken (mager)', 'Rohschinken']
  if (/sin carne|bolognese|lasagne|moussaka|chili/i.test(d.title)) return ['Rinderhack (mager)', 'Frühstücksspeck']
  if (asian) return ['Hähnchenbrust', 'Rinderhüftsteak', 'Schweinefilet']
  if (d.chapter === 'suppen') {
    if (has(STEW)) return ['Wiener Würstchen', 'Frühstücksspeck', 'Kasseler']
    return ['Frühstücksspeck', 'Hähnchenbrust']
  }
  if (has(CABBAGE)) return ['Kasseler', 'Frühstücksspeck', 'Wiener Würstchen']
  if (d.chapter === 'ofen') return tomato ? ['Rinderhack (mager)', 'Kochschinken (mager)', 'Hähnchenbrust'] : ['Kochschinken (mager)', 'Frühstücksspeck', 'Hähnchenbrust']
  if (d.chapter === 'pasta' || has(PASTA)) {
    if (tomato) return ['Rinderhack (mager)', 'Hähnchenbrust', 'Frühstücksspeck']
    if (has(CREAMY)) return ['Kochschinken (mager)', 'Hähnchenbrust', 'Frühstücksspeck']
    return ['Hähnchenbrust', 'Frühstücksspeck', 'Rohschinken']
  }
  if (d.chapter === 'salate') return ['Hähnchenbrust', 'Frühstücksspeck', 'Rohschinken']
  return tomato ? ['Hähnchenbrust', 'Rinderhack (mager)', 'Frühstücksspeck'] : ['Hähnchenbrust', 'Frühstücksspeck', 'Kasseler']
}

function placement(meat: Meat, chapter: ChapterId): string {
  switch (meat.name) {
    case 'Frühstücksspeck':
      return 'Zum Schluss über das Gericht streuen.'
    case 'Kochschinken (mager)':
    case 'Rohschinken':
      return chapter === 'ofen' ? 'Vor dem Backen untermischen oder darauf verteilen.' : 'Zum Schluss untermischen oder darauf verteilen.'
    case 'Wiener Würstchen':
    case 'Geflügelwürstchen':
      return 'In den letzten 5 Minuten im Gericht erhitzen – nicht mehr kochen lassen.'
    case 'Rinderhack (mager)':
    case 'Hackfleisch (gemischt)':
      return 'Danach wie beschrieben weiterkochen und das Hackfleisch mit Sauce oder Gemüse mischen.'
    case 'Kasseler':
      return 'In den letzten 10 Minuten mitgaren oder zum Schluss darauf anrichten.'
    default:
      return 'Zum Schluss unter das fertige Gericht heben oder darauf anrichten.'
  }
}

/** Größtes Stück Fleisch im Rezept (ohne Brühe) */
function mainMeat(ingredients: RecipeIngredient[]): { index: number; ing: RecipeIngredient } | null {
  let index = -1
  let most = -1
  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i]
    if (!ingredientFlags(ing).includes('M') || /brühe/i.test(ing.name)) continue
    const grams = ingredientGrams(ing) ?? 0
    if (grams > most) {
      most = grams
      index = i
    }
  }
  return index < 0 ? null : { index, ing: ingredients[index] }
}

function meatIngredient(meat: Meat, amount: number): RecipeIngredient {
  if (meat.unit) return { name: meat.name, amount: Math.max(1, Math.round(amount)), unit: meat.unit, category: 'fleisch_fisch' }
  return { name: meat.name, amount: roundAmount(amount, 'g'), unit: 'g', category: 'fleisch_fisch' }
}

/** Gleiche Menge vom anderen Fleisch – Stück bleibt Stück, wenn beide eins kennen */
function convertTo(old: RecipeIngredient, meat: Meat): RecipeIngredient {
  const grams = ingredientGrams(old) ?? meat.perServing
  const info = ingredientInfo(meat.name)
  const perUnit = info?.units[old.unit]
  if (old.unit !== 'g' && perUnit) return { name: meat.name, amount: roundAmount(grams / perUnit, old.unit), unit: old.unit, category: 'fleisch_fisch' }
  if (meat.unit) return meatIngredient(meat, Math.max(1, grams / (info?.units[meat.unit] ?? 100)))
  return meatIngredient(meat, grams)
}

function formatAmount(i: RecipeIngredient): string {
  return `${String(i.amount ?? '').replace('.', ',')} ${i.unit === 'Stück' ? 'Stück' : i.unit}`
}

/** Stellen, an denen ein allein stehendes Wort ohne Folgen für Artikel oder Adjektiv ersetzt werden kann */
const SAFE_BEFORE = new Set(['mit', 'und', 'vom', 'auf', 'aus', '&'])

/** Wort im Titel ersetzen; null, wenn es nicht (sicher) vorkommt */
export function replaceInTitle(title: string, from: Words, to: Words): string | null {
  for (const m of from.match) {
    for (let i = title.indexOf(m); i >= 0; i = title.indexOf(m, i + 1)) {
      const before = title.slice(0, i)
      const after = title.slice(i + m.length)
      if (i > 0 && !/[\s(„-]$/.test(before)) continue
      const next = after.charAt(0)
      if (next === '-') return before + to.hyphen + after
      if (/[a-zäöüß]/.test(next)) return before + to.stem + after
      const prev = before.trimEnd()
      const prevWord = prev.split(/\s+/).pop() ?? ''
      if (i === 0 || /[-(„,]$/.test(prev) || SAFE_BEFORE.has(prevWord)) return before + to.word + after
    }
  }
  return null
}

function swapTitle(title: string, from: Words, to: Words): string {
  if (from.word === to.word) return title
  return replaceInTitle(title, from, to) ?? `${title} (${to.word} statt ${from.word})`
}

/** „Penne mit Tomatensauce und Basilikum“ + Speck → „Penne mit Tomatensauce, Basilikum und Speck“ */
export function addToTitle(title: string, word: string): string {
  if (/sin carne/i.test(title)) {
    const conCarne = title.replace(/sin carne/i, 'con Carne')
    return word === 'Hackfleisch' ? conCarne : addToTitle(conCarne, word)
  }
  const mit = title.indexOf(' mit ')
  if (mit < 0) return `${title} mit ${word}`
  const und = title.lastIndexOf(' und ')
  if (und > mit) return `${title.slice(0, und)}, ${title.slice(und + 5)} und ${word}`
  return `${title} und ${word}`
}
