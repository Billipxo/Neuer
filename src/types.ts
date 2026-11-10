export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export type Sex = 'female' | 'male'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type GoalType = 'lose' | 'maintain' | 'gain' | 'custom'
/** Ernährungsweise für Rezeptvorschläge */
export type DietPreference = 'all' | 'vegetarian' | 'vegan'
export type AmountUnit = 'g' | 'piece' | 'serving'

export interface Nutrients {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface MacroPercents {
  protein: number
  carbs: number
  fat: number
}

export interface Profile {
  id: string
  name: string
  age: number | null
  sex: Sex | null
  height_cm: number | null
  weight_kg: number | null
  activity_level: ActivityLevel | null
  goal: GoalType
  kcal_target: number
  /** Tagesbedarf-Anpassung in kcal (negativ = Defizit), nur für den Vorschlag */
  kcal_adjustment: number
  protein_pct: number
  carbs_pct: number
  fat_pct: number
  water_target_ml: number
  /** Heißluftfritteuse vorhanden → Rezepte zeigen deren Zubereitung zuerst */
  has_airfryer: boolean
  /** IDs der Lieblingsrezepte */
  favorite_recipes: string[]
  /** Ernährungsweise – Vorschläge und Galerie zeigen dann passende Rezepte */
  diet: DietPreference
  onboarded: boolean
  created_at?: string
}

/** Ein Lebensmittel aus der eigenen Bibliothek (selbst angelegt oder aus Open Food Facts übernommen). */
export interface Food {
  id: string
  user_id?: string
  name: string
  brand: string | null
  barcode: string | null
  source: 'custom' | 'off'
  /** Nährwerte pro 100 g */
  kcal_100: number
  protein_100: number
  carbs_100: number
  fat_100: number
  /** Gramm pro Portion (optional) */
  serving_g: number | null
  /** Gramm pro Stück (optional) */
  piece_g: number | null
  image_url: string | null
  is_favorite: boolean
  last_used_at: string | null
  use_count: number
  created_at?: string
}

export interface DishIngredient {
  food_id: string | null
  name: string
  grams: number
  kcal_100: number
  protein_100: number
  carbs_100: number
  fat_100: number
}

/** Eigenes Gericht aus mehreren Zutaten */
export interface Dish {
  id: string
  user_id?: string
  name: string
  servings: number
  ingredients: DishIngredient[]
  is_favorite: boolean
  last_used_at: string | null
  created_at?: string
}

export interface LogEntry extends Nutrients {
  id: string
  user_id?: string
  date: string // yyyy-MM-dd
  meal: MealType
  name: string
  amount: number
  unit: AmountUnit
  grams: number | null
  food_id: string | null
  dish_id: string | null
  recipe_id: string | null
  veggies: string[]
  created_at?: string
}

export interface WaterLog {
  id: string
  user_id?: string
  date: string
  ml: number
  created_at?: string
}

export interface WeightLog {
  id: string
  user_id?: string
  date: string
  kg: number
  created_at?: string
}

export type PlanKind = 'recipe' | 'dish' | 'text'

export interface PlanItem extends Nutrients {
  id: string
  user_id?: string
  date: string
  meal: MealType
  kind: PlanKind
  recipe_id: string | null
  dish_id: string | null
  title: string
  servings: number
  created_at?: string
}

export type ShoppingCategory = 'obst_gemuese' | 'milch' | 'fleisch_fisch' | 'vorrat' | 'sonstiges'

export interface ShoppingItem {
  id: string
  user_id?: string
  name: string
  amount: number | null
  unit: string | null
  category: ShoppingCategory
  checked: boolean
  in_stock: boolean
  source: 'plan' | 'manual'
  created_at?: string
}

export interface AchievementRow {
  id: string
  user_id?: string
  key: string
  unlocked_at: string
}

export interface RecipeIngredient {
  name: string
  amount: number | null
  unit: string
  category: ShoppingCategory
  /** Hinweis zur Vorbereitung, z. B. „fein gewürfelt“ */
  note?: string
}

export interface DietInfo {
  vegetarian: boolean
  vegan: boolean
  /** Ohne glutenhaltige Zutaten (bei Zöliakie trotzdem Packungsangaben prüfen) */
  glutenFree: boolean
  /** Enthält Käse mit tierischem Lab (z. B. Parmesan) */
  animalRennet: boolean
}

export interface AirfryerInfo {
  temp_c: number
  time_min: number
  /** Eigene Schritte, wenn das Rezept eigentlich für den Backofen ist. Fehlen sie, sind die normalen Schritte schon für die Heißluftfritteuse. */
  steps?: string[]
}

export interface Recipe {
  id: string
  title: string
  /** Kapitel im Kochbuch */
  chapter: import('./data/chapters').ChapterId
  meal: MealType[]
  /** Aktive Zubereitungszeit in Minuten */
  time_min: number
  /** Zusätzliche Wartezeit (Quellen, Kühlen, Einfrieren) in Minuten */
  rest_min?: number
  servings: number
  tags: string[]
  ingredients: RecipeIngredient[]
  steps: string[]
  /** pro Portion – aus den Zutaten berechnet */
  nutrition: Nutrients
  /** Ballaststoffe pro Portion in Gramm – aus den Zutaten berechnet */
  fiber: number
  /** aus den Zutaten abgeleitet */
  diet: DietInfo
  airfryer?: AirfryerInfo
  /** Tipps, Varianten, Aufbewahrung */
  tips?: string[]
}

/** Rezept, wie es in recipes.json steht (ohne berechnete Felder) */
export type RawRecipe = Omit<Recipe, 'nutrition' | 'fiber' | 'diet'>
