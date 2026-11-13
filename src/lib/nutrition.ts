import type {
  ActivityLevel,
  AmountUnit,
  DishIngredient,
  Dish,
  Food,
  GoalType,
  MacroPercents,
  Nutrients,
  Sex,
} from '../types'

export const ZERO: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

/** kcal pro Gramm Makronährstoff */
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Kaum Bewegung (Büro, wenig Sport)',
  light: 'Leicht aktiv (1–3× Sport/Woche)',
  moderate: 'Mäßig aktiv (3–5× Sport/Woche)',
  active: 'Sehr aktiv (6–7× Sport/Woche)',
  very_active: 'Extrem aktiv (körperliche Arbeit + Sport)',
}

/** Standard-Zu-/Abschlag je Ziel (nur Vorschlag, frei änderbar) */
export const GOAL_DEFAULT_ADJUSTMENT: Record<GoalType, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
  custom: 0,
}

export const DEFAULT_MACRO_PERCENTS: MacroPercents = { protein: 25, carbs: 45, fat: 30 }

export interface BodyData {
  sex: Sex
  age: number
  height_cm: number
  weight_kg: number
}

/** Grundumsatz nach Mifflin-St Jeor (kcal/Tag) */
export function mifflinStJeor({ sex, age, height_cm, weight_kg }: BodyData): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

/** Gesamtumsatz = Grundumsatz × Aktivitätsfaktor */
export function totalEnergyExpenditure(body: BodyData, activity: ActivityLevel): number {
  return mifflinStJeor(body) * ACTIVITY_FACTORS[activity]
}

/**
 * Vorschlag für das Tagesziel. Gerundet auf 10 kcal, mindestens 0.
 * Ist nur ein Vorschlag – der Nutzer kann jederzeit eine eigene Zahl setzen.
 */
export function suggestKcalTarget(body: BodyData, activity: ActivityLevel, adjustment: number): number {
  const value = totalEnergyExpenditure(body, activity) + adjustment
  return Math.max(0, Math.round(value / 10) * 10)
}

export function isCompleteBody(b: Partial<BodyData>): b is BodyData {
  return (
    (b.sex === 'male' || b.sex === 'female') &&
    isPositive(b.age) &&
    isPositive(b.height_cm) &&
    isPositive(b.weight_kg)
  )
}

function isPositive(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

/** Makroziele in Gramm aus Tagesziel und Prozentverteilung */
export function macroGrams(kcalTarget: number, pct: MacroPercents): Omit<Nutrients, 'kcal'> {
  return {
    protein: Math.round((kcalTarget * pct.protein) / 100 / KCAL_PER_GRAM.protein),
    carbs: Math.round((kcalTarget * pct.carbs) / 100 / KCAL_PER_GRAM.carbs),
    fat: Math.round((kcalTarget * pct.fat) / 100 / KCAL_PER_GRAM.fat),
  }
}

export function sumPercents(p: MacroPercents): number {
  return p.protein + p.carbs + p.fat
}

/** Nährwerte pro 100 g auf eine Grammzahl umrechnen */
export function nutrientsForGrams(per100: Nutrients, grams: number): Nutrients {
  const f = Math.max(0, grams) / 100
  return {
    kcal: per100.kcal * f,
    protein: per100.protein * f,
    carbs: per100.carbs * f,
    fat: per100.fat * f,
  }
}

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  return {
    kcal: n.kcal * factor,
    protein: n.protein * factor,
    carbs: n.carbs * factor,
    fat: n.fat * factor,
  }
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return { kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat }
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  return items.reduce<Nutrients>((acc, n) => addNutrients(acc, n), { ...ZERO })
}

export function roundNutrients(n: Nutrients): Nutrients {
  return {
    kcal: Math.round(n.kcal),
    protein: Math.round(n.protein * 10) / 10,
    carbs: Math.round(n.carbs * 10) / 10,
    fat: Math.round(n.fat * 10) / 10,
  }
}

export function foodPer100(f: Pick<Food, 'kcal_100' | 'protein_100' | 'carbs_100' | 'fat_100'>): Nutrients {
  return { kcal: f.kcal_100, protein: f.protein_100, carbs: f.carbs_100, fat: f.fat_100 }
}

/**
 * Menge in Gramm umrechnen. Gibt null zurück, wenn für die Einheit keine Grammangabe hinterlegt ist.
 */
export function amountToGrams(
  amount: number,
  unit: AmountUnit,
  food: Pick<Food, 'serving_g' | 'piece_g' | 'tbsp_g' | 'tsp_g'>,
): number | null {
  if (!(amount > 0)) return 0
  switch (unit) {
    case 'g':
      return amount
    case 'piece':
      return food.piece_g ? amount * food.piece_g : null
    case 'serving':
      return food.serving_g ? amount * food.serving_g : null
    case 'tbsp':
      return food.tbsp_g ? amount * food.tbsp_g : null
    case 'tsp':
      return food.tsp_g ? amount * food.tsp_g : null
  }
}

export function nutrientsForFoodAmount(food: Food, amount: number, unit: AmountUnit): Nutrients | null {
  const grams = amountToGrams(amount, unit, food)
  if (grams === null) return null
  return nutrientsForGrams(foodPer100(food), grams)
}

export function dishTotals(ingredients: DishIngredient[]): Nutrients {
  return sumNutrients(
    ingredients.map((i) =>
      nutrientsForGrams({ kcal: i.kcal_100, protein: i.protein_100, carbs: i.carbs_100, fat: i.fat_100 }, i.grams),
    ),
  )
}

export function dishPerServing(dish: Pick<Dish, 'ingredients' | 'servings'>): Nutrients {
  const s = dish.servings > 0 ? dish.servings : 1
  return scaleNutrients(dishTotals(dish.ingredients), 1 / s)
}

export interface Progress {
  consumed: number
  target: number
  remaining: number
  /** 0..1+ (kann über 1 liegen) */
  ratio: number
}

export function progress(consumed: number, target: number): Progress {
  const ratio = target > 0 ? consumed / target : 0
  return { consumed, target, remaining: target - consumed, ratio }
}

/** Liegt der Tag im Ziel? Standard: ±10 % um das Tagesziel */
export function isWithinTarget(kcal: number, target: number, tolerance = 0.1): boolean {
  if (target <= 0) return false
  return Math.abs(kcal - target) <= target * tolerance
}

/** Anteil der Makros an der Energie (in %) */
export function macroShares(n: Nutrients): MacroPercents {
  const p = n.protein * KCAL_PER_GRAM.protein
  const c = n.carbs * KCAL_PER_GRAM.carbs
  const f = n.fat * KCAL_PER_GRAM.fat
  const total = p + c + f
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 }
  return { protein: (p / total) * 100, carbs: (c / total) * 100, fat: (f / total) * 100 }
}

/**
 * „Ausgewogener Tag“ (eigene, neutrale Definition – siehe README):
 * kcal innerhalb ±15 % des Ziels und jede Makro-Verteilung höchstens 10 Prozentpunkte vom Wunsch entfernt.
 */
export function isBalancedDay(n: Nutrients, target: number, pct: MacroPercents): boolean {
  if (!isWithinTarget(n.kcal, target, 0.15)) return false
  const s = macroShares(n)
  return (
    Math.abs(s.protein - pct.protein) <= 10 &&
    Math.abs(s.carbs - pct.carbs) <= 10 &&
    Math.abs(s.fat - pct.fat) <= 10
  )
}

/** Sachliche, nicht wertende Motivationszeile je nach Fortschritt */
export function motivationLine(p: Progress, entries: number): string {
  if (p.target <= 0) return 'Lege in den Einstellungen ein Tagesziel fest, dann siehst du hier deinen Stand.'
  if (entries === 0) return 'Ein neuer Tag – trag deine erste Mahlzeit ein, wenn du so weit bist.'
  if (p.ratio < 0.25) return 'Guter Start. Der Tag hat noch viel Platz.'
  if (p.ratio < 0.6) return 'Du bist gut unterwegs – knapp die Hälfte ist geschafft.'
  if (p.ratio < 0.9) return 'Schon ein großer Teil deines Tagesziels ist erreicht.'
  if (p.ratio <= 1.1) return 'Du bist genau im Bereich deines Tagesziels. Stark!'
  return 'Heute etwas über dem Ziel – völlig okay, morgen ist ein neuer Tag.'
}
