/**
 * Nährwerttabelle für Rezept-Zutaten.
 *
 * Werte pro 100 g (bzw. 100 ml) als gerundete Richtwerte nach gängigen Nährwerttabellen (u. a. Bundeslebensmittel-
 * schlüssel, USDA, Herstellerangaben). Kohlenhydrate sind verwertbare Kohlenhydrate (ohne Ballaststoffe).
 * Aus dieser Tabelle werden kcal, Makros und Ballaststoffe aller Rezepte berechnet.
 *
 * Flags: M = Fleisch, F = Fisch/Meeresfrüchte, D = Milchprodukt, E = Ei, H = Honig,
 *        L = Käse mit tierischem Lab (z. B. Parmesan), G = glutenhaltig,
 *        N = Nüsse/Erdnüsse, Y = Soja, X = Sesam
 */

export interface IngredientInfo {
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  flags: string
  /** Gramm pro Einheit (überschreibt die Standardwerte), z. B. { Stück: 80 } */
  units: Record<string, number>
  /** Oberbegriff für die Zutaten-Suche, z. B. alle Joghurts → „Joghurt“ */
  base: string
  /** Hat man meist im Haus (Salz, Öl, Gewürze …) – zählt bei der Zutaten-Suche nicht als fehlend */
  staple: boolean
  /** Grundzutat wie Zwiebel oder Knoblauch – optional bei der Zutaten-Suche ausgenommen */
  basic: boolean
  /** Monate (1–12), in denen es regional Saison hat bzw. aus heimischem Lager kommt */
  season?: number[]
}

/** Gramm pro Einheit, wenn die Zutat nichts Eigenes festlegt */
export const DEFAULT_UNIT_GRAMS: Record<string, number> = {
  g: 1,
  ml: 1,
  kg: 1000,
  l: 1000,
  EL: 12,
  TL: 4,
  Prise: 0.5,
  Zehe: 4,
  Bund: 25,
  Zweig: 1,
  Schale: 20,
}

interface Opts {
  u?: Record<string, number>
  base?: string
  staple?: boolean
  basic?: boolean
  s?: number[]
}

type Values = [kcal: number, protein: number, carbs: number, fat: number, fiber: number]

const LIST: IngredientInfo[] = []

function add(name: string, [kcal, protein, carbs, fat, fiber]: Values, flags = '', o: Opts = {}) {
  LIST.push({
    name,
    kcal,
    protein,
    carbs,
    fat,
    fiber,
    flags,
    units: o.u ?? {},
    base: o.base ?? name,
    staple: o.staple ?? false,
    basic: o.basic ?? false,
    season: o.s,
  })
}

const OIL: Values = [900, 0, 0, 100, 0]
const oil = (name: string) => add(name, OIL, '', { u: { EL: 10, TL: 4 }, base: 'Öl', staple: true })
const spice = (name: string, v: Values, u: Record<string, number> = {}) =>
  add(name, v, '', { u: { TL: 2.5, EL: 7, Prise: 0.5, ...u }, staple: true })

// Monatslisten für den Saisonkalender
const SOMMER = [7, 8, 9]
const HERBST_WINTER = [1, 2, 3, 10, 11, 12]

// --- Obst & Gemüse ------------------------------------------------------------------------------------
add('Apfel', [54, 0.3, 11.4, 0.2, 2.0], '', { u: { Stück: 150 }, base: 'Äpfel', s: [1, 2, 3, 4, 8, 9, 10, 11, 12] })
add('Apfelmus (ungesüßt)', [45, 0.2, 10.5, 0.1, 1.2], '', { base: 'Apfelmus' })
add('Aubergine', [24, 1.0, 2.9, 0.2, 3.0], '', { u: { Stück: 300 }, s: SOMMER })
add('Avocado', [160, 2.0, 1.9, 14.7, 6.7], '', { u: { Stück: 140 } })
add('Babyspinat', [23, 2.9, 1.4, 0.4, 2.2], '', { base: 'Spinat', s: [3, 4, 5, 9, 10, 11] })
add('Blattspinat (TK)', [25, 3.0, 1.0, 0.5, 2.5], '', { base: 'Spinat' })
add('Bananen', [89, 1.1, 20.0, 0.3, 2.0], '', { u: { Stück: 120 } })
add('Basilikum', [23, 3.2, 1.0, 0.6, 1.6], '', { u: { Bund: 20 } })
add('Beeren (TK)', [45, 1.0, 8.0, 0.4, 4.0], '', { base: 'Beeren' })
add('Birne', [55, 0.4, 12.4, 0.3, 3.1], '', { u: { Stück: 170 }, base: 'Birnen', s: [8, 9, 10, 11, 12] })
add('Blumenkohl', [25, 1.9, 3.0, 0.3, 2.0], '', { u: { Stück: 600 }, s: [6, 7, 8, 9, 10, 11] })
add('Brokkoli', [34, 2.8, 3.0, 0.4, 3.0], '', { u: { Stück: 500 }, s: [6, 7, 8, 9, 10] })
add('Champignons', [22, 3.1, 0.6, 0.3, 2.0])
add('Champignons (groß)', [22, 3.1, 0.6, 0.3, 2.0], '', { base: 'Champignons' })
add('Cherrytomaten', [20, 0.9, 3.0, 0.2, 1.3], '', { base: 'Tomaten', s: SOMMER })
add('Chinakohl', [13, 1.1, 1.2, 0.2, 1.2], '', { u: { Stück: 800 }, s: [1, 2, 9, 10, 11, 12] })
add('Datteln (entsteint)', [282, 2.5, 64, 0.4, 8.0], '', { u: { Stück: 8 }, base: 'Datteln' })
add('Dill', [43, 3.5, 4.9, 1.1, 2.1], '', { u: { Bund: 20 } })
add('Edamame (TK, in der Schale)', [66, 6.5, 4.0, 2.9, 2.9], 'Y', { base: 'Edamame' })
add('Edamame (TK, geschält)', [121, 11.9, 3.7, 5.2, 5.2], 'Y', { base: 'Edamame' })
add('Erbsen (TK)', [81, 5.4, 9.6, 0.4, 5.1], '', { base: 'Erbsen' })
add('Erdbeeren', [32, 0.7, 5.5, 0.4, 2.0], '', { s: [5, 6, 7] })
add('Feldsalat', [14, 1.8, 0.7, 0.4, 1.5], '', { s: HERBST_WINTER })
add('Fenchel', [31, 1.2, 4.2, 0.2, 3.1], '', { u: { Stück: 250 }, s: [6, 7, 8, 9, 10] })
add('Frühlingszwiebel', [32, 1.8, 4.7, 0.2, 2.6], '', { u: { Stück: 15, Bund: 120 }, base: 'Frühlingszwiebeln', s: [5, 6, 7, 8, 9, 10] })
add('Gewürzgurken', [25, 0.5, 4.5, 0.2, 1.0], '', { u: { Stück: 40 } })
add('grüne Bohnen', [31, 1.8, 4.5, 0.2, 2.7], '', { s: SOMMER })
add('Grünkohl', [40, 4.3, 2.5, 0.9, 4.2], '', { s: [1, 2, 11, 12] })
add('Hokkaido-Kürbis', [49, 1.4, 9.8, 0.3, 2.1], '', { u: { Stück: 1000 }, base: 'Kürbis', s: [8, 9, 10, 11, 12] })
add('Ingwer', [80, 1.8, 15.8, 0.8, 2.0], '', { u: { Stück: 15 } })
add('Karotten', [36, 0.9, 6.8, 0.2, 3.0], '', { u: { Stück: 80 } })
add('Kartoffeln', [72, 2.0, 15.4, 0.1, 2.1], '', { u: { Stück: 120 } })
add('Knoblauch', [149, 6.4, 28.0, 0.5, 2.1], '', { u: { Zehe: 4, Stück: 40 }, basic: true })
add('Knollensellerie', [19, 1.5, 2.3, 0.3, 4.2], '', { u: { Stück: 600 }, base: 'Sellerie', s: [1, 2, 3, 9, 10, 11, 12] })
add('Kohlrabi', [24, 1.9, 3.7, 0.1, 1.4], '', { u: { Stück: 300 }, s: [5, 6, 7, 8, 9, 10] })
add('Koriander', [23, 2.1, 0.9, 0.5, 2.8], '', { u: { Bund: 20 } })
add('Kresse', [32, 2.6, 3.0, 0.7, 1.1], '', { u: { Schale: 20 } })
add('Lauch', [31, 2.2, 3.3, 0.3, 2.3], '', { u: { Stück: 200 }, s: [1, 2, 3, 4, 8, 9, 10, 11, 12] })
add('Limette', [30, 0.7, 7.7, 0.2, 2.8], '', { u: { Stück: 50 }, base: 'Limetten' })
add('Mango (TK)', [60, 0.8, 13.5, 0.4, 1.6], '', { base: 'Mango' })
add('Minze', [44, 3.3, 1.6, 0.7, 6.8], '', { u: { Bund: 20 } })
add('Mungbohnensprossen', [30, 3.0, 4.1, 0.2, 1.8], '', { base: 'Sprossen' })
add('Oliven', [140, 1.0, 1.0, 14.0, 3.0])
add('Orange', [47, 0.9, 9.4, 0.1, 2.4], '', { u: { Stück: 150 }, base: 'Orangen' })
add('Pak Choi', [13, 1.5, 1.2, 0.2, 1.0], '', { u: { Stück: 250 } })
add('Paprika', [31, 1.0, 5.3, 0.3, 2.1], '', { u: { Stück: 150 }, s: SOMMER })
add('Pastinake', [75, 1.2, 13.0, 0.3, 4.9], '', { u: { Stück: 150 }, base: 'Pastinaken', s: HERBST_WINTER })
add('Petersilie', [36, 3.0, 3.3, 0.8, 3.3], '', { u: { Bund: 30 } })
add('Radieschen', [16, 0.7, 2.0, 0.1, 1.6], '', { u: { Bund: 150 }, s: [4, 5, 6, 7, 8, 9] })
add('Rosenkohl', [40, 3.9, 3.3, 0.3, 4.3], '', { s: [1, 2, 10, 11, 12] })
add('Rosmarin', [131, 3.3, 6.5, 5.9, 14.0], '', { u: { Zweig: 1 } })
add('Rote Bete (vorgegart)', [43, 1.7, 8.0, 0.2, 2.0], '', { base: 'Rote Bete', s: [1, 2, 3, 7, 8, 9, 10, 11, 12] })
add('Rotkohl', [29, 1.4, 4.6, 0.2, 2.5], '', { u: { Stück: 1000 }, s: [1, 2, 3, 9, 10, 11, 12] })
add('Römersalat', [17, 1.2, 1.2, 0.3, 2.1], '', { u: { Stück: 300 }, base: 'Salat', s: [6, 7, 8, 9, 10] })
add('rote Zwiebel', [40, 1.1, 7.6, 0.1, 1.7], '', { u: { Stück: 80 }, base: 'Zwiebeln', basic: true })
add('Salatgurke', [12, 0.6, 1.8, 0.2, 0.5], '', { u: { Stück: 400 }, base: 'Gurke', s: [6, 7, 8, 9] })
add('Salbei', [50, 3.0, 7.0, 1.5, 4.0], '', { u: { Bund: 15 } })
add('Sauerkraut', [20, 1.5, 1.4, 0.2, 2.5])
add('Schnittlauch', [30, 3.3, 1.9, 0.7, 2.5], '', { u: { Bund: 25 } })
add('Spargel (weiß)', [18, 1.9, 2.0, 0.1, 1.5], '', { base: 'Spargel', s: [4, 5, 6] })
add('Spitzkohl', [25, 1.3, 3.5, 0.1, 2.5], '', { u: { Stück: 800 }, s: [5, 6, 7, 8, 9, 10, 11] })
add('Süßkartoffel', [86, 1.6, 17.1, 0.1, 3.0], '', { u: { Stück: 300 }, base: 'Süßkartoffeln' })
add('Tomate', [18, 0.9, 2.6, 0.2, 1.2], '', { u: { Stück: 100 }, base: 'Tomaten', s: SOMMER })
add('Weintrauben', [69, 0.7, 16.5, 0.2, 0.9], '', { s: [8, 9, 10] })
add('Wirsing', [27, 2.0, 3.0, 0.1, 3.1], '', { u: { Stück: 800 }, s: [1, 2, 3, 6, 7, 8, 9, 10, 11, 12] })
add('Zitrone', [29, 1.1, 6.5, 0.3, 2.8], '', { u: { Stück: 80 }, base: 'Zitronen' })
add('Zitronensaft', [22, 0.4, 6.9, 0.2, 0.3], '', { u: { EL: 15, TL: 5 }, base: 'Zitronen' })
add('Zucchini', [17, 1.2, 2.1, 0.3, 1.0], '', { u: { Stück: 250 }, s: [6, 7, 8, 9] })
add('Zwiebel', [40, 1.1, 7.6, 0.1, 1.7], '', { u: { Stück: 80 }, base: 'Zwiebeln', basic: true })

// --- Milchprodukte & Eier --------------------------------------------------------------------------------
add('Eier', [140, 12.5, 0.7, 9.6, 0], 'E', { u: { Stück: 55 } })
add('Bergkäse', [400, 28, 0, 32, 0], 'D', { base: 'Käse' })
add('Butter', [741, 0.7, 0.6, 83, 0], 'D', { u: { EL: 12, TL: 5 } })
add('Feta', [265, 17, 0.7, 21.5, 0], 'D')
add('Frischkäse (leicht)', [150, 7.5, 4.0, 11.5, 0], 'D', { base: 'Frischkäse' })
add('Gouda', [355, 25, 0, 28.5, 0], 'D', { u: { Scheibe: 20 }, base: 'Käse' })
add('Griechischer Joghurt 2 %', [73, 10, 3.2, 2.0, 0], 'D', { base: 'Joghurt' })
add('Haferdrink', [46, 1.0, 6.7, 1.5, 0.8], 'G')
add('Halloumi', [315, 22, 2.0, 24.5, 0], 'D')
add('Hüttenkäse', [98, 12.6, 2.6, 4.3, 0], 'D')
add('Kochsahne 15 %', [160, 3.0, 4.0, 15, 0], 'D', { base: 'Sahne' })
add('Magerquark', [67, 12, 4.0, 0.3, 0], 'D', { base: 'Quark' })
add('Milch 1,5 %', [47, 3.4, 4.9, 1.5, 0], 'D', { base: 'Milch' })
add('Mozzarella (light)', [160, 19, 1.0, 9.0, 0], 'D', { u: { Stück: 125 }, base: 'Mozzarella' })
add('Naturjoghurt 1,5 %', [47, 3.4, 4.1, 1.5, 0], 'D', { base: 'Joghurt' })
add('Parmesan', [390, 34, 0, 28, 0], 'DL', { base: 'Parmesan' })
add('Sahne', [290, 2.4, 3.2, 30, 0], 'D')
add('saure Sahne (10 %)', [115, 3.0, 4.0, 10, 0], 'D', { base: 'saure Sahne' })
add('Skyr', [63, 11, 4.0, 0.2, 0], 'D')
add('Ziegenkäse', [270, 18, 1.0, 21, 0], 'D')

// --- Fleisch & Fisch -------------------------------------------------------------------------------------
add('Garnelen', [85, 20, 0.2, 0.6, 0], 'F')
add('Hähnchenbrust', [110, 23.5, 0, 1.5, 0], 'M', { base: 'Hähnchen' })
add('Hähnchenschenkelfilet', [120, 19, 0, 5.0, 0], 'M', { base: 'Hähnchen' })
add('Kabeljaufilet', [80, 18, 0, 0.7, 0], 'F', { base: 'Fischfilet' })
add('Kochschinken (mager)', [110, 19, 1.0, 3.5, 0], 'M', { u: { Scheibe: 20 }, base: 'Schinken' })
add('Lachsfilet', [200, 20, 0, 13.5, 0], 'F', { u: { Stück: 125 }, base: 'Lachs' })
add('Putenbrust', [105, 24, 0, 1.0, 0], 'M', { base: 'Pute' })
add('Putenbrust-Aufschnitt', [105, 21, 1.0, 1.5, 0], 'M', { u: { Scheibe: 15 }, base: 'Aufschnitt' })
add('Putenhackfleisch', [150, 20, 0, 7.5, 0], 'M', { base: 'Hackfleisch' })
add('Putenschnitzel', [105, 24, 0, 1.0, 0], 'M', { base: 'Pute' })
add('Räucherlachs', [165, 21, 0, 9.0, 0], 'F')
add('Rindergulasch', [130, 21, 0, 5.0, 0], 'M', { base: 'Rindfleisch' })
add('Rinderhack (mager)', [135, 21, 0, 5.5, 0], 'M', { base: 'Hackfleisch' })
add('Seelachsfilet', [80, 18, 0, 0.9, 0], 'F', { base: 'Fischfilet' })
add('Thunfisch (naturell)', [110, 25, 0, 1.0, 0], 'F', { u: { Dose: 150 }, base: 'Thunfisch' })

// --- Getreide, Brot, Nudeln --------------------------------------------------------------------------------
add('Bandnudeln', [365, 13, 70, 3.2, 3.0], 'GE', { base: 'Nudeln' })
add('Bulgur', [342, 12.3, 63.4, 1.3, 12.5], 'G')
add('Couscous', [357, 12.5, 70, 1.5, 5.0], 'G')
add('Dinkelvollkornmehl', [335, 12, 62, 2.5, 9.5], 'G', { u: { EL: 10 }, base: 'Mehl' })
add('Gnocchi', [150, 3.6, 32, 0.6, 2.0], 'G')
add('Grieß', [345, 10.5, 70, 1.0, 3.9], 'G', { u: { EL: 12 } })
add('Haferflocken', [372, 13.5, 58.7, 7.0, 10], 'G', { u: { EL: 10 } })
add('Lasagneplatten', [350, 12.5, 70, 1.5, 3.0], 'G')
add('Mehl', [348, 10, 72, 1.0, 4.0], 'G', { u: { EL: 10 }, staple: true })
add('Mie-Nudeln', [360, 12, 70, 2.5, 3.0], 'GE', { base: 'Asia-Nudeln' })
add('Milchreis', [350, 7.0, 78, 0.6, 1.4], '', { base: 'Reis' })
add('Popcornmais', [375, 12, 62, 4.5, 13])
add('Quinoa', [368, 14.1, 57.2, 6.1, 7.0])
add('Reis', [349, 7.0, 77.5, 0.6, 1.4])
add('Reisnudeln', [360, 6.0, 81, 0.6, 1.5], '', { base: 'Asia-Nudeln' })
add('Reiswaffeln', [380, 8.5, 78, 3.0, 4.0], '', { u: { Stück: 8 } })
add('Risottoreis', [350, 7.0, 77, 0.6, 1.4], '', { base: 'Reis' })
add('Schupfnudeln', [165, 4.0, 34, 1.2, 2.5], 'GE')
add('Spaghetti', [355, 12.5, 70.5, 1.5, 3.0], 'G', { base: 'Nudeln' })
add('Spätzle (frisch)', [230, 8.5, 43, 2.5, 2.0], 'GE', { base: 'Spätzle' })
add('Suppennudeln', [355, 12.5, 70.5, 2.0, 3.0], 'GE', { base: 'Nudeln' })
add('Tortillas (Mais)', [220, 5.7, 42, 2.9, 6.3], '', { u: { Stück: 25 }, base: 'Tortillas' })
add('Vollkorn-Fladenbrot', [265, 10, 47, 2.5, 7.0], 'G', { u: { Stück: 70 }, base: 'Fladenbrot' })
add('Vollkorn-Knäckebrot', [330, 9.5, 61, 1.8, 15], 'G', { u: { Scheibe: 10 }, base: 'Knäckebrot' })
add('Vollkorn-Paniermehl', [360, 12, 68, 3.0, 8.0], 'G', { base: 'Paniermehl' })
add('Vollkorn-Penne', [350, 13.4, 62.5, 2.5, 8.0], 'G', { base: 'Nudeln' })
add('Vollkorn-Wraps', [290, 9.0, 45, 6.0, 6.5], 'G', { u: { Stück: 64 }, base: 'Wraps' })
add('Vollkornbrot', [210, 7.0, 39, 1.5, 7.5], 'G', { u: { Scheibe: 50 }, base: 'Brot' })
add('Vollkornbrötchen', [240, 9.0, 41, 2.5, 6.5], 'G', { u: { Stück: 70 }, base: 'Brötchen' })
add('Vollkornreis', [350, 7.5, 72, 2.7, 3.5], '', { base: 'Reis' })
add('Vollkornspaghetti', [350, 13.4, 62.5, 2.5, 8.0], 'G', { base: 'Nudeln' })
add('Vollkorntoast', [250, 9.0, 41, 4.0, 6.5], 'G', { u: { Scheibe: 28 }, base: 'Toast' })

// --- Hülsenfrüchte, Konserven, Tofu --------------------------------------------------------------------------
add('Ajvar', [75, 1.5, 7.5, 4.5, 2.0], '', { u: { EL: 15, TL: 5 } })
add('Gemüsebrühe', [5, 0.2, 0.6, 0.2, 0], '', { staple: true })
add('Kapern', [23, 2.4, 1.7, 0.9, 3.2], '', { u: { EL: 10, TL: 4 } })
add('Kichererbsen', [135, 7.0, 15, 2.8, 7.5], '', { u: { Dose: 240 } })
add('Kidneybohnen', [105, 7.0, 13.5, 0.6, 6.5], '', { u: { Dose: 250 }, base: 'Bohnen (Dose)' })
add('Kokosmilch (light)', [80, 0.8, 1.8, 7.7, 0], '', { u: { Dose: 400 }, base: 'Kokosmilch' })
add('Mais', [80, 2.8, 14, 1.2, 3.0], '', { u: { Dose: 285 } })
add('passierte Tomaten', [33, 1.4, 5.3, 0.2, 1.2], '', { base: 'Dosentomaten' })
add('Räuchertofu', [165, 16.5, 2.0, 10, 1.0], 'Y', { base: 'Tofu' })
add('rote Linsen', [340, 25, 50, 1.5, 11], '', { base: 'Linsen' })
add('Schälerbsen (getrocknet)', [320, 23, 41, 1.4, 17], '', { base: 'Schälerbsen' })
add('Tellerlinsen', [315, 24, 41, 1.5, 17], '', { base: 'Linsen' })
add('Tofu (natur)', [125, 13, 1.5, 7.5, 1.0], 'Y', { base: 'Tofu' })
add('Tomaten (stückig)', [21, 1.0, 3.0, 0.2, 1.0], '', { u: { Dose: 400 }, base: 'Dosentomaten' })
add('Tomatenmark', [85, 4.3, 14, 0.5, 4.0], '', { u: { EL: 15, TL: 5 }, staple: true })
add('weiße Bohnen', [100, 7.0, 13, 0.5, 6.0], '', { u: { Dose: 250 }, base: 'Bohnen (Dose)' })

// --- Nüsse, Saaten, Süßes ----------------------------------------------------------------------------------------
add('Ahornsirup', [260, 0, 67, 0.1, 0], '', { u: { EL: 20, TL: 7 } })
add('Backpulver', [120, 0, 30, 0, 0], '', { u: { TL: 3 }, staple: true })
add('Speisestärke', [350, 0.3, 86, 0.1, 0], '', { u: { TL: 3, EL: 10 }, staple: true })
add('Cashewkerne', [575, 18, 27, 46, 3.3], 'N')
add('Chiasamen', [486, 16.5, 7.7, 30.7, 34.4], '', { u: { EL: 10, TL: 4 } })
add('Erdnussbutter', [600, 25, 13, 50, 6.0], 'N', { u: { EL: 16, TL: 6 } })
add('Erdnüsse (geröstet, ungesalzen)', [590, 25, 13, 50, 8.0], 'N', { base: 'Erdnüsse' })
add('Haselnüsse', [640, 15, 7.0, 61, 8.0], 'N')
add('Honig', [304, 0.3, 82, 0, 0], 'H', { u: { EL: 20, TL: 7 }, staple: true })
add('Kakaopulver', [360, 20, 11, 11, 30], '', { u: { EL: 6, TL: 2 } })
add('Kokosraspeln', [660, 6.9, 7.0, 64, 16], '', { u: { EL: 6 } })
add('Kürbiskerne', [575, 30, 5.0, 49, 6.0], '', { u: { EL: 10 } })
add('Leinsamen (geschrotet)', [534, 18, 1.6, 42, 27], '', { u: { EL: 10 }, base: 'Leinsamen' })
add('Mandeln', [590, 21, 5.7, 52, 11], 'N')
add('Rosinen', [300, 3.0, 66, 0.5, 3.7])
add('Sesam', [575, 18, 11.5, 50, 12], 'X', { u: { TL: 3, EL: 8 } })
add('Sonnenblumenkerne', [585, 21, 11, 51, 8.6], '', { u: { EL: 10 } })
add('Tahin', [595, 17, 10, 54, 9.0], 'X', { u: { EL: 15, TL: 5 } })
add('Walnüsse', [660, 15, 7.0, 65, 6.5], 'N')
// Kann Milchbestandteile enthalten – vorsichtshalber nicht als vegan gewertet
add('Zartbitterschokolade (70 %)', [575, 8.0, 33, 42, 11], 'D', { base: 'Zartbitterschokolade' })

// --- Öle, Würzsaucen, Gewürze ---------------------------------------------------------------------------------
oil('Olivenöl')
oil('Rapsöl')
oil('Leinöl')
add('Sesamöl', OIL, 'X', { u: { EL: 10, TL: 4 }, base: 'Öl', staple: true })
add('Balsamico', [88, 0.5, 17, 0, 0], '', { u: { EL: 15, TL: 5 }, staple: true })
add('Currypaste', [120, 2.5, 12, 6.5, 4.0], '', { u: { EL: 15, TL: 5 } })
add('Essig', [20, 0, 0.6, 0, 0], '', { u: { EL: 15, TL: 5 }, staple: true })
add('Senf', [80, 5.5, 5.0, 4.5, 2.0], '', { u: { EL: 15, TL: 5 }, staple: true })
add('Sojasauce', [60, 8.0, 4.9, 0.6, 0.8], 'GY', { u: { EL: 15, TL: 5 }, staple: true })
add('Salz', [0, 0, 0, 0, 0], '', { staple: true })
add('Meersalz', [0, 0, 0, 0, 0], '', { staple: true, base: 'Salz' })
add('Salz und Pfeffer', [0, 0, 0, 0, 0], '', { staple: true })
spice('Pfeffer', [251, 10, 38, 3.3, 25])
spice('Paprikapulver', [290, 14, 19, 13, 35])
spice('Paprikapulver (geräuchert)', [290, 14, 19, 13, 35])
spice('Kreuzkümmel', [375, 18, 34, 22, 10.5])
spice('Zimt', [247, 4.0, 27, 1.2, 53])
spice('Oregano', [265, 9.0, 26, 4.3, 42], { TL: 1 })
spice('Thymian', [276, 9.0, 27, 7.4, 37], { TL: 1 })
spice('Majoran', [271, 12.7, 20, 7.0, 40], { TL: 1 })
spice('Kümmel', [333, 20, 12, 15, 38])
spice('Muskatnuss', [525, 6.0, 28, 36, 21])
spice('Chiliflocken', [318, 12, 30, 17, 27])
spice('Knoblauchpulver', [331, 17, 62, 0.7, 9.0])
spice('Currypulver', [325, 14, 25, 14, 33])
spice('Lorbeerblätter', [313, 7.6, 48, 8.4, 26], { Stück: 0.2 })

// --- Ergänzungen für den Kochbuch-Ausbau ---------------------------------------------------------------------
add('Hirse', [355, 10.6, 69, 3.9, 3.8])
add('Kirschen (TK)', [63, 1.0, 14, 0.2, 2.0], '', { base: 'Kirschen' })
add('Pflaumen', [47, 0.6, 10.2, 0.2, 1.6], '', { u: { Stück: 40 }, s: [8, 9, 10] })
add('Kiwi', [61, 1.1, 10.5, 0.5, 3.0], '', { u: { Stück: 75 } })
add('Meerrettich', [48, 1.2, 8.0, 0.7, 3.3], '', { u: { TL: 5, EL: 15 } })
add('Camembert', [290, 20, 0.1, 23.5, 0], 'D', { u: { Stück: 125 }, base: 'Käse' })
add('Geflügelwürstchen', [200, 14, 1.0, 15.5, 0], 'M', { u: { Stück: 50 }, base: 'Würstchen' })
add('Weißkohl', [25, 1.3, 3.3, 0.1, 2.5], '', { u: { Stück: 1000 }, s: [1, 2, 3, 4, 8, 9, 10, 11, 12] })
add('Rucola', [25, 2.6, 2.1, 0.7, 1.6], '', { s: [5, 6, 7, 8, 9, 10] })
add('Ananas', [50, 0.5, 11.8, 0.1, 1.4], '', { u: { Stück: 900 } })
add('Kopfsalat', [13, 1.3, 1.1, 0.2, 1.1], '', { u: { Stück: 250 }, base: 'Salat', s: [5, 6, 7, 8, 9, 10] })
add('Ricotta', [135, 9.0, 3.5, 9.5, 0], 'D')
add('Makkaroni', [355, 12.5, 70, 1.5, 3.0], 'G', { base: 'Nudeln' })
add('Cannelloni', [350, 12.5, 70, 1.5, 3.0], 'G', { u: { Stück: 9 } })
add('Tortellini (frisch)', [265, 10, 38, 7.5, 2.5], 'GEDL', { base: 'Tortellini' })
add('Polenta', [355, 8.5, 75, 1.2, 3.5], '', { base: 'Polenta' })
add('Perlgraupen', [345, 9.9, 70, 1.4, 7.5], 'G', { base: 'Graupen' })
spice('Kurkuma', [312, 9.7, 44, 3.3, 22.7])
spice('Garam Masala', [375, 12, 42, 15, 29])
add('Zucker', [400, 0, 100, 0, 0], '', { u: { EL: 15, TL: 5 }, staple: true })
add('Rinderbrühe', [5, 0.6, 0.3, 0.2, 0], 'M', { base: 'Brühe' })
add('Rinderrouladen', [120, 22, 0, 3.5, 0], 'M', { u: { Stück: 160 }, base: 'Rindfleisch' })
add('Rinderhüftsteak', [115, 22, 0, 3.0, 0], 'M', { u: { Stück: 180 }, base: 'Rindfleisch' })
add('Frühstücksspeck', [340, 14, 0.5, 31, 0], 'M', { u: { Scheibe: 8 }, base: 'Speck' })
add('Rohschinken', [240, 26, 0, 15, 0], 'M', { u: { Scheibe: 15 }, base: 'Schinken' })
add('Schweinefilet', [110, 21, 0, 2.5, 0], 'M', { base: 'Schweinefleisch' })
add('Schweineschnitzel', [105, 22.5, 0, 1.9, 0], 'M', { u: { Stück: 150 }, base: 'Schweinefleisch' })
add('Kasseler', [125, 20, 0.5, 5.0, 0], 'M')
add('Bratwurst (Geflügel)', [190, 16, 1.0, 13.5, 0], 'M', { u: { Stück: 100 }, base: 'Bratwurst' })
add('Lammhackfleisch', [230, 17, 0, 18, 0], 'M', { base: 'Hackfleisch' })
add('Preiselbeeren (Glas)', [180, 0.3, 43, 0.3, 2.0], '', { u: { EL: 20, TL: 7 }, base: 'Preiselbeeren' })
spice('Piment', [330, 6.1, 50, 8.7, 21.6])
add('Forellenfilet', [105, 20, 0, 2.7, 0], 'F', { u: { Stück: 80 }, base: 'Forelle' })
add('Zanderfilet', [85, 19, 0, 0.7, 0], 'F', { base: 'Fischfilet' })
add('Rotbarschfilet', [105, 18, 0, 3.6, 0], 'F', { base: 'Fischfilet' })
add('Doradenfilet', [120, 20, 0, 4.5, 0], 'F', { u: { Stück: 75 }, base: 'Fischfilet' })
add('Matjesfilet', [260, 16, 0, 22, 0], 'F', { u: { Stück: 50 }, base: 'Hering' })
add('Makrele (geräuchert)', [230, 20.7, 0, 16.5, 0], 'F', { base: 'Makrele' })
add('Thunfischsteak', [110, 24, 0, 1.0, 0], 'F', { u: { Stück: 150 }, base: 'Thunfisch' })
add('Tintenfischringe', [80, 16, 1.0, 1.3, 0], 'F', { base: 'Tintenfisch' })
add('Miesmuscheln (mit Schale)', [25, 3.4, 1.0, 0.6, 0], 'F', { base: 'Muscheln', s: [1, 2, 3, 4, 9, 10, 11, 12] })
add('Nordseekrabben', [90, 19, 0, 1.4, 0], 'F', { base: 'Krabben' })
add('Baguette', [260, 8.5, 52, 1.5, 3.0], 'G', { u: { Stück: 250, Scheibe: 20 } })
add('Trockenhefe', [325, 40, 13, 7.6, 27], '', { u: { Päckchen: 7, TL: 3 }, base: 'Hefe' })
add('Blätterteig', [380, 6.0, 38, 22, 1.5], 'G', { u: { Rolle: 275 } })
add('Yufka-Teigblätter', [290, 9.0, 60, 1.5, 2.5], 'G', { base: 'Yufka' })
add('Reispapier', [340, 0.5, 83, 0.5, 1.0], '', { u: { Blatt: 9 } })
add('Vanillezucker', [400, 0, 100, 0, 0], '', { u: { Päckchen: 8, TL: 4 }, staple: true })
add('Puderzucker', [400, 0, 100, 0, 0], '', { u: { EL: 8, TL: 3 }, staple: true })
add('Eiweiß', [48, 11, 0.7, 0.2, 0], 'E', { u: { Stück: 33 }, base: 'Eier' })
add('Löffelbiskuits', [390, 8.0, 80, 4.0, 1.0], 'GE', { u: { Stück: 6 } })
add('Espresso', [2, 0.1, 0.3, 0, 0], '', { base: 'Kaffee' })
add('Rhabarber', [21, 0.6, 1.4, 0.1, 3.2], '', { u: { Stück: 100 }, s: [4, 5, 6] })
add('Heidelbeeren', [42, 0.6, 7.4, 0.6, 4.9], '', { s: [7, 8, 9] })
add('Pinienkerne', [675, 14, 4.0, 68, 4.0], '')
add('Eigelb', [330, 16, 0.3, 29, 0], 'E', { u: { Stück: 18 }, base: 'Eier' })
add('Schwarzer Tee', [1, 0, 0.3, 0, 0], '', { u: { Beutel: 2 }, base: 'Tee' })
spice('Kardamom', [311, 11, 40, 6.7, 28])

export const INGREDIENTS: ReadonlyMap<string, IngredientInfo> = new Map(LIST.map((i) => [i.name, i]))
export const INGREDIENT_LIST: readonly IngredientInfo[] = LIST
