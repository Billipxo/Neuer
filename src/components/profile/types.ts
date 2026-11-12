import type { Profile } from '../../types'
import { DEFAULT_MACRO_PERCENTS, GOAL_DEFAULT_ADJUSTMENT } from '../../lib/nutrition'

export type ProfileDraft = Omit<Profile, 'id' | 'created_at'>

export function defaultDraft(existing?: Profile | null): ProfileDraft {
  if (existing) {
    const { id: _id, created_at: _c, ...rest } = existing
    // Felder älterer Profile ergänzen
    return { ...rest, has_airfryer: rest.has_airfryer ?? true, favorite_recipes: rest.favorite_recipes ?? [], diet: rest.diet ?? 'all', avoid: rest.avoid ?? [] }
  }
  return {
    name: '',
    age: null,
    sex: null,
    height_cm: null,
    weight_kg: null,
    activity_level: 'light',
    goal: 'maintain',
    kcal_target: 2000,
    kcal_adjustment: GOAL_DEFAULT_ADJUSTMENT.maintain,
    protein_pct: DEFAULT_MACRO_PERCENTS.protein,
    carbs_pct: DEFAULT_MACRO_PERCENTS.carbs,
    fat_pct: DEFAULT_MACRO_PERCENTS.fat,
    water_target_ml: 2000,
    has_airfryer: true,
    favorite_recipes: [],
    diet: 'all',
    avoid: [],
    onboarded: false,
  }
}
