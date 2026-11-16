import { describe, expect, it } from 'vitest'
import { getRecipe, RECIPES } from './recipes'
import { draftFromRecipe, variantToRecipe } from './variants'
import { addToTitle, applyMeatIdea, meatIdeas, replaceInTitle } from './meatIdeas'
import { ingredientInfo } from './recipeNutrition'

const draft = (id: string) => draftFromRecipe(getRecipe(id)!)
const words = (word: string, hyphen = word, stem = hyphen, match = [word]) => ({ word, hyphen, stem, match })

describe('Mit Fleisch: vegetarische Eiweißquelle tauschen', () => {
  it('Tofu → Hähnchen: Zutat an gleicher Stelle, Titel, zusätzlicher Schritt und neue Nährwerte', () => {
    const d = draft('tofu-brokkoli-pfanne')
    const [idea] = meatIdeas(d)
    expect(idea.key).toBe('swap:Tofu (natur):Hähnchenbrust')
    expect(idea.label).toBe('Hähnchen statt Tofu')
    const tofuAt = d.ingredients.findIndex((i) => i.name === 'Tofu (natur)')
    expect(idea.ingredients[tofuAt]).toMatchObject({ name: 'Hähnchenbrust', unit: 'g', category: 'fleisch_fisch' })
    expect(idea.ingredients[tofuAt].amount).toBeGreaterThanOrEqual(100 * d.servings)
    expect(idea.ingredients.some((i) => i.name === 'Tofu (natur)')).toBe(false)
    expect(idea.title).toBe('Hähnchen-Brokkoli-Pfanne mit Reis')
    expect(idea.steps[0]).toMatch(/^Hähnchen statt Tofu: Die Hähnchenbrust .* anstelle von Tofu verwenden\.$/)
    expect(idea.steps.slice(1)).toEqual(d.steps)
    expect(idea.proteinDelta).toBeGreaterThan(0)

    const v = variantToRecipe({ ...applyMeatIdea(d, idea), id: 'x' })
    expect(v.diet.vegetarian).toBe(false)
    expect(v.title).toBe('Hähnchen-Brokkoli-Pfanne mit Reis')
  })

  it('Linsen → Hack nur in Bolognese, Chili, Lasagne & Co. – nicht in der Linsensuppe', () => {
    const bolo = draft('linsen-bolognese')
    const swap = meatIdeas(bolo).find((i) => i.kind === 'swap')!
    expect(swap.label).toBe('Hackfleisch statt Linsen')
    expect(swap.title).toBe('Hackfleisch-Bolognese mit Vollkornspaghetti')
    const lentils = bolo.ingredients.find((i) => i.name === 'rote Linsen')!
    expect(swap.ingredient.amount).toBe(Math.max(lentils.amount! * 2.5, 100 * bolo.servings))
    expect(swap.steps[0]).toContain('Die Kochzeit der Linsen entfällt')

    const soup = meatIdeas(draft('linsensuppe'))
    expect(soup.some((i) => i.kind === 'swap')).toBe(false)
    expect(soup[0].label).toBe('Mit Würstchen')
    expect(soup[0].title).toBe('Linsensuppe mit Gemüse und Würstchen')
    expect(soup[0].ingredient).toMatchObject({ name: 'Wiener Würstchen', amount: 4, unit: 'Stück' })
  })

  it('kein Hähnchen statt Kichererbsen im Hummus, aber im Curry', () => {
    expect(meatIdeas(draft('kichererbsen-gemuese-curry'))[0].title).toBe('Gemüse-Curry mit Hähnchen')
    for (const r of RECIPES.filter((x) => /hummus|falafel/i.test(x.title))) {
      expect(meatIdeas(draftFromRecipe(r)).some((i) => i.key.startsWith('swap:Kichererbsen')), r.title).toBe(false)
    }
  })

  it('neben einem Tausch nur noch Speck, Schinken & Co. dazu – nicht Tofu und Schweinefilet zusammen', () => {
    for (const id of ['tofu-brokkoli-pfanne', 'kichererbsen-gemuese-curry', 'linsen-bolognese']) {
      const ideas = meatIdeas(draft(id), 6)
      const adds = ideas.filter((i) => i.kind === 'add').map((i) => i.ingredient.name)
      for (const a of adds) expect(['Frühstücksspeck', 'Kochschinken (mager)', 'Rohschinken', 'Wiener Würstchen', 'Kasseler'], `${id}: ${a}`).toContain(a)
    }
  })
})

describe('Mit Fleisch: ergänzen', () => {
  it('Chili sin Carne wird mit Hack zum Chili con Carne', () => {
    const [idea] = meatIdeas(draft('chili-sin-carne'))
    expect(idea.ingredient.name).toBe('Rinderhack (mager)')
    expect(idea.title).toBe('Chili con Carne mit Reis')
    expect(idea.ingredients[0].name).toBe('Rinderhack (mager)')
    expect(idea.steps[0]).toMatch(/^Hackfleisch dazu: /)
  })

  it('Pasta mit Tomatensauce: Hack zuerst, Mengen pro Portion', () => {
    const d = draft('spaghetti-tomatensauce')
    const ideas = meatIdeas(d)
    expect(ideas.map((i) => i.label)).toEqual(['Mit Hackfleisch', 'Mit Hähnchen', 'Mit Speck'])
    expect(ideas[0].ingredient.amount).toBe(100 * d.servings)
    expect(ideas[0].title).toBe('Spaghetti mit Tomatensauce, Basilikum und Hackfleisch')
  })

  it('herzhaftes Frühstück bekommt Speck oder Schinken, Süßes, Getränke und Grundrezepte nichts', () => {
    expect(meatIdeas(draft('ruehrei-wrap-spinat-feta')).map((i) => i.label)).toEqual(['Mit Speck', 'Mit Schinken'])
    for (const r of RECIPES.filter((x) => ['suesses', 'getraenke', 'grundrezepte'].includes(x.chapter) || x.tags.includes('suess'))) {
      expect(meatIdeas(draftFromRecipe(r)), r.title).toHaveLength(0)
    }
  })

  it('Fischgerichte bleiben, wie sie sind', () => {
    for (const r of RECIPES.filter((x) => x.chapter === 'fisch')) {
      const fishOnly = !r.ingredients.some((i) => (ingredientInfo(i.name)?.flags ?? '').includes('M'))
      if (fishOnly) expect(meatIdeas(draftFromRecipe(r)), r.title).toHaveLength(0)
    }
  })
})

describe('Mit Fleisch: Fleischgerichte abwandeln', () => {
  it('anderes Stück mit passendem Titel und mehr Fleisch', () => {
    const d = draft('putengeschnetzeltes-paprika-rahm-reis')
    const ideas = meatIdeas(d)
    expect(ideas.map((i) => i.title)).toEqual([
      'Schweinegeschnetzeltes in Paprika-Rahm mit Reis',
      'Kalbsgeschnetzeltes in Paprika-Rahm mit Reis',
      'Putengeschnetzeltes in Paprika-Rahm mit Reis',
    ])
    const more = ideas[2]
    expect(more.kind).toBe('more')
    const before = d.ingredients.find((i) => i.name === more.ingredient.name)!
    expect(more.ingredient.amount).toBe(before.amount! * 1.5)
    expect(more.steps).toEqual(d.steps)
  })

  it('gleiches Wort: genaue Namen statt „Hackfleisch statt Hackfleisch“, Titel bleibt', () => {
    const ideas = meatIdeas(draft('spaghetti-bolognese'))
    expect(ideas[0].label).toBe('Hackfleisch (gemischt) statt Rinderhack (mager)')
    expect(ideas[0].title).toBe('Spaghetti Bolognese')
    expect(ideas[1].title).toBe('Spaghetti Bolognese (Lammhack statt Hackfleisch)')
  })

  it('jede Idee ist eindeutig und über ihren Schlüssel wiederzufinden', () => {
    for (const r of RECIPES.slice(0, 200)) {
      const ideas = meatIdeas(draftFromRecipe(r), 10)
      expect(new Set(ideas.map((i) => i.key)).size, r.title).toBe(ideas.length)
      for (const i of ideas) {
        expect(i.ingredients.every((x) => x.amount === null || x.amount > 0), r.title).toBe(true)
        expect(ingredientInfo(i.ingredient.name), i.ingredient.name).toBeDefined()
      }
    }
  })
})

describe('Titel anpassen', () => {
  const tofu = words('Tofu')
  const chicken = words('Hähnchen')
  const turkey = words('Pute', 'Puten', 'Puten', ['Putenbrust', 'Puten', 'Pute'])
  it('ersetzt allein stehend, mit Bindestrich und zusammengeschrieben', () => {
    expect(replaceInTitle('Pad Thai mit Tofu', tofu, chicken)).toBe('Pad Thai mit Hähnchen')
    expect(replaceInTitle('Knusper-Tofu mit Erdnusssauce', tofu, chicken)).toBe('Knusper-Hähnchen mit Erdnusssauce')
    expect(replaceInTitle('Hähnchen-Curry mit Reis', chicken, turkey)).toBe('Puten-Curry mit Reis')
    expect(replaceInTitle('Orientalischer Kichererbsensalat', words('Kichererbsen'), chicken)).toBe('Orientalischer Hähnchensalat')
  })
  it('lässt Stellen aus, an denen Artikel oder Adjektiv nicht mehr passen würden', () => {
    expect(replaceInTitle('Scharfer Tofu mit Pilzen', tofu, chicken)).toBeNull()
    expect(replaceInTitle('Räuchertofu-Pfanne', tofu, chicken)).toBeNull()
  })
  it('hängt Ergänzungen lesbar an', () => {
    expect(addToTitle('Gemüse-Risotto', 'Speck')).toBe('Gemüse-Risotto mit Speck')
    expect(addToTitle('Penne mit Tomatensauce', 'Speck')).toBe('Penne mit Tomatensauce und Speck')
    expect(addToTitle('Mujaddara – Reis mit Linsen und Röstzwiebeln', 'Hähnchen')).toBe('Mujaddara – Reis mit Linsen, Röstzwiebeln und Hähnchen')
    expect(addToTitle('Chili sin Carne mit Reis', 'Speck')).toBe('Chili con Carne mit Reis und Speck')
  })
})
