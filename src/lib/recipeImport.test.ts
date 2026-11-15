import { describe, expect, it } from 'vitest'
import { matchTableIngredient, parseIngredientLine, parseIngredientList, parseSteps } from './recipeImport'

const line = (t: string) => {
  const i = parseIngredientLine(t)
  return i ? `${i.amount ?? '–'} ${i.unit} ${i.name}${i.note ? ` (${i.note})` : ''}` : null
}

describe('Rezept aus Text: Zutaten', () => {
  it('erkennt Mengen, Einheiten und Hinweise', () => {
    expect(line('200 g Mehl (Type 405)')).toBe('200 g Mehl (Type 405)')
    expect(line('2 EL Olivenöl')).toBe('2 EL Olivenöl')
    expect(line('1 Zwiebel, fein gewürfelt')).toBe('1 Stück Zwiebel (fein gewürfelt)')
    expect(line('3 Eier')).toBe('3 Stück Eier')
    expect(line('1 Bund Petersilie')).toBe('1 Bund Petersilie')
    expect(line('0,5 l Milch')).toMatch(/^500 (ml|g) Milch/)
    expect(line('1/2 TL Salz')).toBe('0.5 TL Salz')
    expect(line('½ Zitrone')).toBe('0.5 Stück Zitrone')
    expect(line('2-3 Paprika')).toBe('2.5 Stück Paprika')
    expect(line('1 kg Kartoffeln')).toBe('1000 g Kartoffeln')
  })

  it('ordnet Namen der Nährwerttabelle zu – Mehrzahl, Wortanfang, allgemeine Namen', () => {
    expect(matchTableIngredient('Zwiebeln')?.name).toBe('Zwiebel')
    expect(matchTableIngredient('Hähnchenbrustfilets')?.name).toBe('Hähnchenbrust')
    expect(matchTableIngredient('frische Champignons')?.name).toBe('Champignons')
    expect(matchTableIngredient('Öl')?.name).toBe('Rapsöl')
    expect(line('1 Dose Tomaten (stückig)')).toBe('1 Dose Tomaten (stückig)')
    expect(line('2 Knoblauchzehen')).toBe('2 Zehe Knoblauch')
  })

  it('rechnet Prisen in Gramm um und lässt unbekannte Stückgewichte offen', () => {
    expect(line('1 Prise Zucker')).toBe('0.5 g Zucker (1 Prise)')
    expect(line('2 Hähnchenbrustfilets')).toBe('– g Hähnchenbrust (2 Stück)')
    expect(line('Salz')).toBe('– g Salz')
  })

  it('übernimmt eine ganze Liste – Überschriften fallen weg, Unbekanntes wird genannt', () => {
    const r = parseIngredientList('Zutaten für 4 Portionen:\n- 200 g Mehl\n• 2 EL Olivenöl\n\nFür die Soße:\n1 Becher Schmand\nSalz und Pfeffer\n1. 3 Eier')
    expect(r.ingredients.map((i) => i.name)).toEqual(['Mehl', 'Olivenöl', 'Salz und Pfeffer', 'Eier'])
    expect(r.ingredients.at(-1)).toMatchObject({ amount: 3, unit: 'Stück' })
    expect(r.unknown).toEqual(['1 Becher Schmand'])
    expect(r.ingredients.every((i) => i.category)).toBe(true)
  })
})

describe('Rezept aus Text: Zubereitung', () => {
  it('teilt nummerierte Schritte auf und hängt Fortsetzungszeilen an', () => {
    expect(
      parseSteps('Zubereitung:\n1. Zwiebel fein hacken.\n2. Öl erhitzen und die Zwiebel\nglasig dünsten.\n3) Tomaten zugeben und 20 Minuten köcheln lassen.'),
    ).toEqual(['Zwiebel fein hacken.', 'Öl erhitzen und die Zwiebel glasig dünsten.', 'Tomaten zugeben und 20 Minuten köcheln lassen.'])
  })

  it('nimmt sonst Absätze als Schritte', () => {
    expect(parseSteps('Den Ofen vorheizen.\nBackblech fetten.\n\nAlles mischen und 30 Minuten backen.')).toEqual([
      'Den Ofen vorheizen. Backblech fetten.',
      'Alles mischen und 30 Minuten backen.',
    ])
    expect(parseSteps('  \n ')).toEqual([])
  })
})
