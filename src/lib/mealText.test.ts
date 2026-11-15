import { describe, expect, it } from 'vitest'
import type { Food } from '../types'
import { parseMealText, pluralMeasure, withAmount } from './mealText'

/** Kurzfassung: „Name | Menge | kcal“ je erkanntem Eintrag */
const summary = (text: string, own?: Food[]) => parseMealText(text, own)?.parts.map((p) => `${p.name} | ${p.amountLabel} | ${p.kcal}`)

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
