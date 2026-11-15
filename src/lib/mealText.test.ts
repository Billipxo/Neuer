import { describe, expect, it } from 'vitest'
import type { Dish, Food } from '../types'
import type { CookbookEntry } from './cookbookIndex'
import { searchCookbook } from './cookbookIndex'
import { parseMealText, pluralMeasure, withAmount } from './mealText'

const dal: CookbookEntry = {
  id: 'dal',
  title: 'Dal mit roten Linsen und Spinat',
  nutrition: { kcal: 420, protein: 20, carbs: 55, fat: 12 },
  veggies: ['Spinat'],
  own: false,
}
const bolognese: CookbookEntry = {
  id: 'spaghetti-bolognese',
  title: 'Spaghetti Bolognese',
  nutrition: { kcal: 545, protein: 38, carbs: 62, fat: 13 },
  veggies: [],
  own: false,
}
const mine: CookbookEntry = {
  id: 'v1',
  title: 'Meine Linsen-Bolognese',
  nutrition: { kcal: 480, protein: 30, carbs: 60, fat: 10 },
  veggies: [],
  own: true,
}
const book = [dal, bolognese, mine]
const withBook = (text: string) => parseMealText(text, [], [], {}, book)?.parts.map((p) => `${p.name} | ${p.amountLabel} | ${p.kcal}`)

/** Kurzfassung: „Name | Menge | kcal“ je erkanntem Eintrag */
const summary = (text: string, own?: Food[], dishes?: Dish[]) =>
  parseMealText(text, own, dishes)?.parts.map((p) => `${p.name} | ${p.amountLabel} | ${p.kcal}`)

/** Eigenes Gericht: 4 Portionen, zusammen 2.285 kcal und 1.550 g */
const lasagne: Dish = {
  id: 'd1',
  name: 'Omas Lasagne',
  servings: 4,
  is_favorite: false,
  last_used_at: null,
  ingredients: [
    { food_id: null, name: 'Lasagneplatten', grams: 250, kcal_100: 350, protein_100: 12.5, carbs_100: 70, fat_100: 1.5 },
    { food_id: null, name: 'Rinderhack', grams: 500, kcal_100: 250, protein_100: 18, carbs_100: 0, fat_100: 20 },
    { food_id: null, name: 'Tomaten', grams: 800, kcal_100: 20, protein_100: 1, carbs_100: 3, fat_100: 0.2 },
  ],
}
/** Gericht mit einer Zutat „als Portion“ – Gramm sind dann unbekannt */
const muesli: Dish = {
  id: 'd2',
  name: 'Mein Müsli',
  servings: 1,
  is_favorite: true,
  last_used_at: null,
  ingredients: [
    { food_id: null, name: 'Haferflocken', grams: 50, kcal_100: 372, protein_100: 13.5, carbs_100: 58.7, fat_100: 7 },
    { food_id: null, name: 'Schnell-Eintrag', grams: 100, portion: true, kcal_100: 120, protein_100: 3, carbs_100: 10, fat_100: 5 },
  ],
}

describe('Mehreres auf einmal eintragen', () => {
  it('trennt bei Komma und „und“ und versteht Zahlwörter', () => {
    expect(summary('2 Brötchen, 1 Cappuccino und eine Banane')).toEqual([
      'Brötchen | 2 Stück · 120 g | 324',
      'Cappuccino | 1 Tasse · 200 ml | 80',
      'Bananen | 1 Stück · 120 g | 107',
    ])
    expect(summary('zwei Brötchen und einen Kaffee')).toEqual(['Brötchen | 2 Stück · 120 g | 324', 'Kaffee (schwarz) | 1 Tasse · 200 ml | 4'])
    expect(summary('Currywurst + Pommes')).toEqual(['Currywurst | 1 Portion · 200 g | 400', 'Pommes frites | 1 Portion · 150 g | 435'])
  })

  it('versteht Gramm, Liter, Löffel und Gefäße', () => {
    expect(summary('150g Reis')).toEqual(['Reis (gekocht) | 150 g | 195'])
    expect(summary('150 Reis')).toEqual(['Reis (gekocht) | 150 g | 195'])
    expect(summary('0,5 l Bier')).toEqual(['Bier | 1 Flasche · 500 ml | 210'])
    expect(summary('Cola 0,5 l')).toEqual(['Cola | 500 ml | 210'])
    expect(summary('1 Glas Cola')).toEqual(['Cola | 1 Glas · 200 ml | 84'])
    expect(summary('eine Flasche Rotwein')).toEqual(['Rotwein | 1 Flasche · 750 ml | 525'])
    expect(summary('eine Maß Bier')).toEqual(['Bier | 1 Maß · 1.000 ml | 420'])
    expect(summary('1 EL Olivenöl')).toEqual(['Olivenöl | 1 EL · 10 g | 90'])
    expect(summary('2 TL Zucker')).toEqual(['Zucker | 2 TL · 10 g | 40'])
  })

  it('wählt bei einer Mengenangabe das Lebensmittel, zu dem sie passt', () => {
    expect(summary('2 Scheiben Käse')?.[0]).toMatch(/ \| 2 Scheiben · \d+ g \| \d+$/)
    expect(summary('zwei Kugeln Eis')).toEqual(['Speiseeis | 2 Kugeln · 100 g | 210'])
    expect(summary('ein Glas Wasser')).toEqual(['Wasser | 1 Glas · 250 ml | 0'])
    expect(summary('1 Tasse Tee')).toEqual(['Tee (ungesüßt) | 1 Tasse · 250 ml | 3'])
  })

  it('kennt Halbe, Brüche und Mengen hinter dem Namen', () => {
    for (const t of ['1/2 Pizza', '½ Pizza', 'eine halbe Pizza']) {
      expect(summary(t)).toEqual(['Pizza Margherita | 0,5 Pizza · 190 g | 466'])
    }
    expect(summary('Döner x2')).toEqual(['Döner Kebab | 2 Döner · 700 g | 1505'])
    expect(summary('2x Döner')).toEqual(['Döner Kebab | 2 Döner · 700 g | 1505'])
    expect(summary('Apfel 150 g')).toEqual(['Apfel | 1 Stück · 150 g | 81'])
    expect(summary('4 Chicken Nuggets')).toEqual(['Chicken Nuggets | 4 Nuggets · 68 g | 177'])
  })

  it('„mit“: Beilage je Stück, bei Gramm einmal', () => {
    expect(summary('2 Brötchen mit Butter')).toEqual(['Brötchen | 2 Stück · 120 g | 324', 'Butter | 2 EL · 24 g | 178'])
    expect(summary('200 g Nudeln mit Pesto')).toEqual(['Nudeln (gekocht) | 200 g | 300', 'Pesto | 1 EL · 15 g | 68'])
    expect(summary('Kaffee mit Milch und Zucker')).toEqual(['Kaffee mit Milch | 1 Tasse · 200 ml | 30', 'Zucker | 1 EL · 15 g | 60'])
    // Ein bekanntes Gericht mit „mit“ bleibt eins
    expect(summary('2 Scheiben Brot mit Butter')).toEqual(['Butterbrot | 2 Scheiben · 120 g | 378'])
  })

  it('überlässt Einzelnes ohne Menge der normalen Suche', () => {
    expect(parseMealText('Döner')).toBeNull()
    expect(parseMealText('Hähnchen mit Reis und Gemüse')).toBeNull()
    expect(parseMealText('Pizza vom Italiener')).toBeNull()
    // Zahlen, die zum Namen gehören, sind keine Mengen
    expect(parseMealText('Milch 3,5 %')).toBeNull()
    expect(parseMealText('Milch 1,5')).toBeNull()
    expect(parseMealText('7up')).toBeNull()
    expect(parseMealText('Activia 4x125g')).toBeNull()
  })

  it('nennt Unbekanntes und überliest Mahlzeit und Füllwörter', () => {
    const p = parseMealText('2 Brötchen, Blablubb')!
    expect(p.parts.map((x) => x.name)).toEqual(['Brötchen'])
    expect(p.unknown).toEqual(['Blablubb'])
    expect(summary('Frühstück: 2 Brötchen, Kaffee')).toEqual(['Brötchen | 2 Stück · 120 g | 324', 'Kaffee (schwarz) | 1 Tasse · 200 ml | 4'])
    expect(summary('zum Frühstück 2 Brötchen')).toEqual(['Brötchen | 2 Stück · 120 g | 324'])
    expect(summary('Pizza vom Italiener und noch eine Cola')).toEqual(['Pizza Margherita | 1 Pizza · 380 g | 931', 'Cola | 1 Dose · 330 ml | 139'])
  })

  it('nimmt eigene Lebensmittel vor Richtwerten', () => {
    const own: Food = {
      id: 'f1',
      name: 'Omas Gulasch',
      brand: null,
      barcode: null,
      source: 'custom',
      kcal_100: 150,
      protein_100: 10,
      carbs_100: 5,
      fat_100: 9,
      serving_g: 300,
      piece_g: null,
      tbsp_g: null,
      tsp_g: null,
      image_url: null,
      is_favorite: false,
      last_used_at: null,
      use_count: 0,
    }
    const p = parseMealText('Omas Gulasch, 2 Brötchen', [own])!
    expect(p.parts[0]).toMatchObject({ name: 'Omas Gulasch', stored: true, amount: 1, unit: 'serving', grams: 300, kcal: 450, amountLabel: '1 Portion · 300 g' })
    expect(p.parts[1]).toMatchObject({ name: 'Brötchen', stored: false })
  })

  it('rechnet geänderte Mengen neu', () => {
    const [part] = parseMealText('2 Döner')!.parts
    expect(withAmount(part, 1, 'serving')).toMatchObject({ grams: 350, kcal: 753, amountLabel: '1 Portion · 350 g' })
    expect(withAmount(part, 200, 'g')).toMatchObject({ grams: 200, kcal: 430, amountLabel: '200 g' })
    expect(withAmount(part, 1, 'tbsp')).toBeNull()
  })

  it('versteht Größen', () => {
    expect(summary('große Pommes')).toEqual(['Pommes frites | 1 Portion, groß · 225 g | 653'])
    expect(summary('kleine Pommes und eine große Cola')).toEqual([
      'Pommes frites | 1 Portion, klein · 105 g | 305',
      'Cola | 1 Dose, groß · 495 ml | 208',
    ])
    expect(summary('ein kleines Bier')).toEqual(['Bier | 1 Flasche, klein · 350 ml | 147'])
    expect(summary('XXL-Döner')).toEqual(['Döner Kebab | 1 Döner, XXL · 700 g | 1505'])
    expect(summary('2 große Brötchen')).toEqual(['Brötchen | 2 Stück, groß · 180 g | 486'])
    expect(summary('ein großes Glas Cola')).toEqual(['Cola | 1 Glas, groß · 300 ml | 126'])
    expect(summary('doppelter Espresso')).toEqual(['Espresso | 1 Tasse, doppelt · 60 ml | 1'])
    expect(summary('mittlere Pommes')).toEqual(['Pommes frites | 1 Portion · 150 g | 435'])
    // Gramm bleiben Gramm, und ein Name mit Größe bleibt ein Name
    expect(summary('200 g große Kartoffeln')).toEqual(['Kartoffeln | 200 g | 144'])
    expect(parseMealText('Großer Burger')).toBeNull()
  })

  it('erkennt eigene Gerichte und trägt sie in Portionen ein', () => {
    expect(summary('Omas Lasagne und ein Glas Rotwein', [], [lasagne])).toEqual([
      'Omas Lasagne | 1 Portion · 388 g | 571',
      'Rotwein | 1 Glas · 200 ml | 140',
    ])
    expect(summary('große Portion Omas Lasagne', [], [lasagne])).toEqual(['Omas Lasagne | 1,5 Portionen · 581 g | 857'])
    expect(summary('Mein Müsli, Kaffee', [], [muesli])).toEqual(['Mein Müsli | 1 Portion | 306', 'Kaffee (schwarz) | 1 Tasse · 200 ml | 4'])
    const [part] = parseMealText('2 Portionen Omas Lasagne', [], [lasagne])!.parts
    expect(part).toMatchObject({ dish: lasagne, stored: true, amount: 2, unit: 'serving', kcal: 1143, amountLabel: '2 Portionen · 775 g' })
    expect(withAmount(part, 1, 'serving')).toMatchObject({ amount: 1, kcal: 571, amountLabel: '1 Portion · 388 g' })
    expect(withAmount(part, 100, 'g')).toBeNull()
  })

  it('bietet andere Treffer mit derselben Menge an', () => {
    const [kaese] = parseMealText('2 Scheiben Käse, Kaffee')!.parts
    expect(kaese.query).toBe('Käse')
    expect(kaese.alternatives.length).toBeGreaterThanOrEqual(3)
    expect(kaese.alternatives.map((a) => a.name)).not.toContain(kaese.name)
    // gleiche Menge: zwei Scheiben
    expect(kaese.alternatives.filter((a) => a.amountLabel.startsWith('2 Scheiben')).length).toBeGreaterThanOrEqual(2)
    const [wein] = parseMealText('Wein, Brot')!.parts
    expect(wein.alternatives.slice(0, 2).map((a) => a.name)).toEqual(['Weißwein', 'Roséwein'])
    // Nährwerte je Eintrag
    expect(kaese.nutrients.protein).toBeGreaterThan(10)
    expect(Object.keys(kaese.nutrients).sort()).toEqual(['carbs', 'fat', 'kcal', 'protein'])
  })

  it('nimmt eine gemerkte Wahl zuerst – aus Richtwerten, eigenen Lebensmitteln und Gerichten', () => {
    expect(summary('2 Scheiben Käse, Kaffee', [], [])?.[0]).toMatch(/^Emmentaler/)
    const remembered = parseMealText('2 Scheiben Käse, Kaffee', [], [], { kase: 'Gouda' })!.parts
    expect(remembered[0]).toMatchObject({ name: 'Gouda', amountLabel: '2 Scheiben · 40 g', kcal: 142 })
    expect(remembered[0].alternatives.map((a) => a.name)).toContain('Emmentaler')
    const lasagneFor = parseMealText('Nudeln, Kaffee', [], [lasagne], { nudeln: 'Omas Lasagne' })!.parts
    expect(lasagneFor[0]).toMatchObject({ name: 'Omas Lasagne', dish: lasagne, amountLabel: '1 Portion · 388 g' })
    // Unbekannt gewordene Wahl (Lebensmittel gelöscht) stört nicht
    expect(parseMealText('Käse, Kaffee', [], [], { kase: 'Gibt es nicht' })!.parts[0].name).toBe('Emmentaler')
  })

  it('teilt einen ganzen Tag nach Mahlzeiten auf', () => {
    const day = parseMealText('Frühstück: Müsli mit Milch; Mittag: Döner und Cola; abends 2 Scheiben Brot mit Käse')!
    expect(day.parts.map((x) => `${x.meal}: ${x.name}`)).toEqual([
      'breakfast: Müsli',
      'breakfast: Milch 3,5 %',
      'lunch: Döner Kebab',
      'lunch: Cola',
      'dinner: Mischbrot',
      'dinner: Emmentaler',
    ])
    // Die Mahlzeit darf auch hinten stehen
    expect(parseMealText('2 Brötchen und Kaffee zum Frühstück, Döner zum Mittagessen')!.parts.map((x) => x.meal)).toEqual([
      'breakfast',
      'breakfast',
      'lunch',
    ])
    expect(parseMealText('morgens Kaffee, mittags Pizza und nachmittags ein Stück Kuchen')!.parts.map((x) => x.meal)).toEqual([
      'breakfast',
      'lunch',
      'snack',
    ])
    // Eine genannte Mahlzeit reicht für die Karte; die anderen Treffer gehören zur selben Mahlzeit
    const coffee = parseMealText('Kaffee zum Frühstück')!.parts
    expect(coffee).toMatchObject([{ name: 'Kaffee (schwarz)', meal: 'breakfast' }])
    expect(coffee[0].alternatives.every((a) => a.meal === 'breakfast')).toBe(true)
    // Ohne Mahlzeit gilt die gewählte; „Frühstücksei“ und „Montag:“ sind keine Mahlzeiten
    expect(parseMealText('Montag: 2 Brötchen, Kaffee')!.parts.map((x) => x.meal)).toEqual([undefined, undefined])
    expect(parseMealText('Frühstücksei und Toast')!.parts.map((x) => x.meal)).toEqual([undefined, undefined])
  })

  it('kennt Rezepte aus dem Kochbuch und eigene Rezepte – in Portionen', () => {
    expect(withBook('Dal mit roten Linsen und Spinat, ein Glas Wasser')).toEqual([
      'Dal mit roten Linsen und Spinat | 1 Portion · aus dem Kochbuch | 420',
      'Wasser | 1 Glas · 250 ml | 0',
    ])
    // Ein „und“ im Namen trennt nicht – auch ohne Komma
    expect(withBook('Dal mit roten Linsen und Spinat und ein Glas Wasser')).toEqual(withBook('Dal mit roten Linsen und Spinat, ein Glas Wasser'))
    expect(withBook('2 Portionen Meine Linsen-Bolognese')).toEqual(['Meine Linsen-Bolognese | 2 Portionen · dein Rezept | 960'])
    // Gleicher Name wie ein Alltags-Gericht: das Alltägliche zuerst, das Rezept als anderer Treffer
    const [spaghetti] = parseMealText('Spaghetti Bolognese, Cola', [], [], {}, book)!.parts
    expect(spaghetti).toMatchObject({ name: 'Spaghetti Bolognese', amountLabel: '1 Teller · 400 g' })
    expect(spaghetti.alternatives.find((a) => a.recipe)).toMatchObject({ recipe: bolognese, amountLabel: '1 Portion · aus dem Kochbuch', kcal: 545 })
    const [part] = parseMealText('Dal mit roten Linsen und Spinat, Kaffee', [], [], {}, book)!.parts
    expect(withAmount(part, 1.5, 'serving')).toMatchObject({ kcal: 630, amountLabel: '1,5 Portionen · aus dem Kochbuch' })
    expect(withAmount(part, 100, 'g')).toBeNull()
    // Beim Tippen eines Titels mit „mit“ entsteht keine Liste
    expect(parseMealText('Dal mit roten', [], [], {}, book)).toBeNull()
  })

  it('hält bekannte Namen mit „und“ zusammen', () => {
    expect(summary('Hähnchen mit Reis und Gemüse und eine Cola')).toEqual([
      'Hähnchen mit Reis und Gemüse | 1 Teller · 450 g | 495',
      'Cola | 1 Dose · 330 ml | 139',
    ])
  })

  it('sucht im Kochbuch nach Titeln, eigene Rezepte bei Gleichstand zuerst', () => {
    expect(searchCookbook(book, 'Linsen').map((r) => r.id)).toEqual(['v1', 'dal'])
    expect(searchCookbook(book, 'Spaghetti').map((r) => r.id)).toEqual(['spaghetti-bolognese'])
    expect(searchCookbook(book, 'xy')).toEqual([])
  })

  it('bildet die Mehrzahl der Mengen', () => {
    expect(['Kugel', 'Scheibe', 'Glas', 'Döner', 'Portion', 'Wrap', 'Packung', 'Stück', 'Becher', 'Ei'].map(pluralMeasure)).toEqual([
      'Kugeln',
      'Scheiben',
      'Gläser',
      'Döner',
      'Portionen',
      'Wraps',
      'Packungen',
      'Stück',
      'Becher',
      'Eier',
    ])
  })
})
