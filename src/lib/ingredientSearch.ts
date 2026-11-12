import { INGREDIENT_LIST, type IngredientInfo } from '../data/ingredients'

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Zutaten der Nährwerttabelle suchen – Treffer am Wortanfang zuerst, Umlaute und Akzente egal */
export function searchIngredientTable(query: string, limit = 25): IngredientInfo[] {
  const q = norm(query.trim())
  if (!q) return []
  return INGREDIENT_LIST.map((i) => {
    const name = norm(i.name)
    const base = norm(i.base)
    const score = name.startsWith(q) ? 0 : base.startsWith(q) ? 1 : name.includes(q) ? 2 : base.includes(q) ? 3 : -1
    return { i, score }
  })
    .filter((x) => x.score >= 0)
    .sort((a, b) => a.score - b.score || a.i.name.localeCompare(b.i.name, 'de'))
    .slice(0, limit)
    .map((x) => x.i)
}
