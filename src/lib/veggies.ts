/**
 * Erkennung von Gemüsesorten anhand des Namens (für das Abzeichen „10 Gemüsesorten“).
 * Bewusst einfach gehalten: eine Liste gängiger Gemüse mit Stichwörtern.
 */
const VEGGIES: Record<string, string[]> = {
  Tomate: ['tomate', 'tomaten', 'cherrytomate', 'passata'],
  Gurke: ['gurke'],
  Paprika: ['paprika'],
  Zucchini: ['zucchini'],
  Aubergine: ['aubergine'],
  Karotte: ['karotte', 'möhre', 'moehre', 'mohrrübe'],
  Brokkoli: ['brokkoli', 'broccoli'],
  Blumenkohl: ['blumenkohl'],
  Spinat: ['spinat', 'blattspinat'],
  Salat: ['salat', 'rucola', 'feldsalat', 'eisberg', 'romana', 'kopfsalat'],
  Zwiebel: ['zwiebel', 'lauchzwiebel', 'frühlingszwiebel', 'schalotte'],
  Lauch: ['lauch', 'porree'],
  Knoblauch: ['knoblauch'],
  Kartoffel: ['kartoffel', 'süßkartoffel'],
  Kürbis: ['kürbis', 'hokkaido'],
  Pilze: ['champignon', 'pilz', 'pfifferling', 'kräuterseitling'],
  Erbsen: ['erbse'],
  Bohnen: ['bohne', 'kidneybohne'],
  Linsen: ['linse'],
  Kichererbsen: ['kichererbse'],
  Mais: ['mais'],
  Sellerie: ['sellerie', 'staudensellerie'],
  Kohlrabi: ['kohlrabi'],
  Rotkohl: ['rotkohl', 'blaukraut'],
  Weißkohl: ['weißkohl', 'sauerkraut', 'spitzkohl'],
  Grünkohl: ['grünkohl'],
  Rosenkohl: ['rosenkohl'],
  Spargel: ['spargel'],
  'Rote Bete': ['rote bete', 'rote beete', 'rote rübe'],
  Radieschen: ['radieschen', 'rettich'],
  Fenchel: ['fenchel'],
  Pastinake: ['pastinake'],
  Avocado: ['avocado'],
  Mangold: ['mangold'],
  Edamame: ['edamame'],
}

const ENTRIES = Object.entries(VEGGIES)

/** Liefert die erkannten Gemüsesorten (kanonische Namen) für einen oder mehrere Texte. */
export function detectVeggies(...texts: string[]): string[] {
  const found = new Set<string>()
  for (const t of texts) {
    const lower = t.toLowerCase()
    for (const [canon, keys] of ENTRIES) {
      if (keys.some((k) => lower.includes(k))) found.add(canon)
    }
  }
  return [...found].sort()
}
