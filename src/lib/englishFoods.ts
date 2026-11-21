/**
 * Englische Suchbegriffe für die eingebauten (deutschen) Lebensmittel: „grilled chicken breast“ findet so die
 * Hähnchenbrust, „scrambled eggs“ das Rührei. Zuerst werden Mehrwort-Begriffe übersetzt, dann einzelne Wörter;
 * Zubereitungs- und Füllwörter („grilled“, „a“, „with“ …) fallen weg. Unbekannte Wörter bleiben, wie sie sind.
 *
 * Das ist bewusst ein kleines Wörterbuch für Alltägliches – keine vollständige englische Oberfläche.
 */

/** Mehrwort-Begriffe (klein geschrieben) → deutscher Suchbegriff */
const PHRASES: Record<string, string> = {
  'chicken breast': 'Hähnchenbrust',
  'chicken breasts': 'Hähnchenbrust',
  'chicken thigh': 'Hähnchenschenkel',
  'chicken thighs': 'Hähnchenschenkel',
  'chicken leg': 'Hähnchenkeule',
  'chicken legs': 'Hähnchenkeule',
  'ground beef': 'Rinderhackfleisch',
  'minced beef': 'Rinderhackfleisch',
  'ground turkey': 'Putenhackfleisch',
  'turkey breast': 'Putenbrust',
  'pork tenderloin': 'Schweinefilet',
  'smoked salmon': 'Räucherlachs',
  'peanut butter': 'Erdnussbutter',
  'olive oil': 'Olivenöl',
  'sweet potato': 'Süßkartoffel',
  'sweet potatoes': 'Süßkartoffel',
  'greek yogurt': 'Griechischer Joghurt',
  'greek yoghurt': 'Griechischer Joghurt',
  'cottage cheese': 'Hüttenkäse',
  'cream cheese': 'Frischkäse',
  'sour cream': 'saure Sahne',
  'orange juice': 'Orangensaft',
  'apple juice': 'Apfelsaft',
  'whole wheat bread': 'Vollkornbrot',
  'wholemeal bread': 'Vollkornbrot',
  'whole grain bread': 'Vollkornbrot',
  'bread roll': 'Brötchen',
  'french fries': 'Pommes',
  'potato chips': 'Kartoffelchips',
  'potato salad': 'Kartoffelsalat',
  'ice cream': 'Eis am Stiel',
  'protein shake': 'Proteinshake',
  'protein bar': 'Proteinriegel',
  'scrambled eggs': 'Rührei',
  'scrambled egg': 'Rührei',
  'fried egg': 'Spiegelei',
  'fried eggs': 'Spiegelei',
  'boiled egg': 'Ei (gekocht)',
  'boiled eggs': 'Ei (gekocht)',
  'oat milk': 'Haferdrink',
  'almond milk': 'Mandeldrink',
  'soy milk': 'Sojadrink',
  'dark chocolate': 'Zartbitterschokolade',
  'milk chocolate': 'Vollmilchschokolade',
  'green beans': 'grüne Bohnen',
  'kidney beans': 'Kidneybohnen',
  'bell pepper': 'Paprika',
  'spring onion': 'Frühlingszwiebel',
  'spring onions': 'Frühlingszwiebel',
  'cherry tomatoes': 'Cherrytomaten',
  'iced coffee': 'Eiskaffee',
  'iced tea': 'Eistee',
  'energy drink': 'Energydrink',
  'apple pie': 'Apfelkuchen',
  'hot dog': 'Hot Dog',
}

/** Einzelne Wörter (klein geschrieben) → deutscher Suchbegriff */
const WORDS: Record<string, string> = {
  chicken: 'Hähnchen',
  beef: 'Rind',
  pork: 'Schwein',
  turkey: 'Pute',
  lamb: 'Lamm',
  ham: 'Schinken',
  bacon: 'Speck',
  sausage: 'Wurst',
  sausages: 'Wurst',
  salmon: 'Lachs',
  tuna: 'Thunfisch',
  fish: 'Fisch',
  shrimp: 'Garnelen',
  shrimps: 'Garnelen',
  prawns: 'Garnelen',
  egg: 'Ei',
  eggs: 'Eier',
  milk: 'Milch',
  bread: 'Brot',
  roll: 'Brötchen',
  rolls: 'Brötchen',
  bun: 'Brötchen',
  rice: 'Reis',
  pasta: 'Nudeln',
  noodles: 'Nudeln',
  potato: 'Kartoffeln',
  potatoes: 'Kartoffeln',
  fries: 'Pommes',
  apple: 'Apfel',
  apples: 'Apfel',
  banana: 'Banane',
  bananas: 'Banane',
  orange: 'Orange',
  oranges: 'Orange',
  strawberry: 'Erdbeeren',
  strawberries: 'Erdbeeren',
  blueberries: 'Heidelbeeren',
  raspberries: 'Himbeeren',
  grapes: 'Weintrauben',
  pear: 'Birne',
  peach: 'Pfirsich',
  cherries: 'Kirschen',
  pineapple: 'Ananas',
  lemon: 'Zitrone',
  watermelon: 'Wassermelone',
  tomato: 'Tomate',
  tomatoes: 'Tomate',
  cucumber: 'Gurke',
  spinach: 'Spinat',
  carrot: 'Karotten',
  carrots: 'Karotten',
  onion: 'Zwiebel',
  onions: 'Zwiebel',
  garlic: 'Knoblauch',
  mushrooms: 'Champignons',
  corn: 'Mais',
  peas: 'Erbsen',
  beans: 'Bohnen',
  lentils: 'Linsen',
  chickpeas: 'Kichererbsen',
  lettuce: 'Salat',
  salad: 'Salat',
  oats: 'Haferflocken',
  oatmeal: 'Haferflocken',
  cereal: 'Müsli',
  muesli: 'Müsli',
  cheese: 'Käse',
  yogurt: 'Joghurt',
  yoghurt: 'Joghurt',
  cream: 'Sahne',
  coffee: 'Kaffee',
  tea: 'Tee',
  water: 'Wasser',
  beer: 'Bier',
  wine: 'Wein',
  juice: 'Saft',
  coke: 'Cola',
  soda: 'Cola',
  lemonade: 'Limonade',
  sugar: 'Zucker',
  honey: 'Honig',
  flour: 'Mehl',
  oil: 'Öl',
  nuts: 'Nüsse',
  almonds: 'Mandeln',
  walnuts: 'Walnüsse',
  peanuts: 'Erdnüsse',
  chocolate: 'Schokolade',
  cookie: 'Cookies',
  cake: 'Kuchen',
  cheesecake: 'Käsekuchen',
  soup: 'Suppe',
  pretzel: 'Brezel',
  mustard: 'Senf',
  mayo: 'Mayonnaise',
  kebab: 'Döner',
}

/** Zubereitungs-, Mengen- und Füllwörter, die für die Suche nichts bedeuten */
const SKIP = new Set([
  'grilled',
  'fried',
  'baked',
  'roasted',
  'roast',
  'boiled',
  'steamed',
  'raw',
  'fresh',
  'cooked',
  'plain',
  'homemade',
  'sliced',
  'smoked',
  'poached',
  'pan',
  'stir',
  'a',
  'an',
  'the',
  'of',
  'with',
  'and',
  'or',
  'some',
  'slice',
  'slices',
  'piece',
  'pieces',
  'cup',
  'cups',
  'bowl',
  'glass',
  'serving',
  'portion',
  'large',
  'small',
  'medium',
  'big',
  'lean',
  'skinless',
  'boneless',
  'organic',
  'whole',
  'my',
])

/** Wörter der Suche – klein, ohne Satzzeichen */
function tokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,;.!?()/+&-]+/)
    .filter(Boolean)
}

/**
 * Übersetzt eine englische Suche in einen deutschen Suchbegriff. null, wenn kein englisches Wort erkannt wurde –
 * dann bleibt die Suche, wie sie ist.
 */
export function englishToGerman(query: string): string | null {
  const t = tokens(query)
  const out: string[] = []
  let found = false
  for (let i = 0; i < t.length; ) {
    let phrase: string | null = null
    for (let len = Math.min(3, t.length - i); len >= 2 && !phrase; len--) {
      const key = t.slice(i, i + len).join(' ')
      if (PHRASES[key]) {
        phrase = PHRASES[key]
        i += len
      }
    }
    if (phrase) {
      out.push(phrase)
      found = true
      continue
    }
    const word = t[i]
    if (WORDS[word]) {
      out.push(WORDS[word])
      found = true
    } else if (!SKIP.has(word)) out.push(word)
    i++
  }
  return found ? out.join(' ') : null
}

/** Alle Übersetzungen – für den Test, dass jede auch wirklich etwas findet */
export const ENGLISH_TARGETS: readonly string[] = [...new Set([...Object.values(PHRASES), ...Object.values(WORDS)])]
