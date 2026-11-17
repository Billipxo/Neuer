import type { ActivityLog, LogEntry, MacroPercents, PlanItem, TrainingPlan, TrainingSet, WaterLog } from '../types'
import { totalsByDate } from './log'
import { isBalancedDay, isWithinTarget, macroGrams } from './nutrition'
import { shiftISO, weekStartISO } from './dates'
import { waterByDate } from './stats'
import { isBetterSet, sameExercise, setLabel, trainingVolume, trainingsOf } from './trainingLog'

export interface AchievementInput {
  today: string
  kcalTarget: number
  macros: MacroPercents
  waterTarget: number
  log: LogEntry[]
  plan: PlanItem[]
  water: WaterLog[]
  /** Anzahl eigener Varianten und Rezepte */
  ownRecipes?: number
  /** Sport & Bewegung (fehlt, wenn die Datenbank Sport noch nicht kennt) */
  activities?: ActivityLog[]
  /** Geplantes Training (fehlt, solange die Datenbank den Trainingsplan nicht kennt) */
  trainingPlans?: Pick<TrainingPlan, 'date'>[]
}

export interface AchievementProgress {
  current: number
  goal: number
}

/** Bereiche, nach denen die Erfolge geordnet sind */
export type AchievementGroup = 'dabei' | 'ziel' | 'trinken' | 'vielfalt' | 'kochen' | 'sport'

export const GROUP_LABELS: Record<AchievementGroup, string> = {
  dabei: 'Dranbleiben',
  ziel: 'Ziele & Balance',
  trinken: 'Trinken',
  vielfalt: 'Vielfalt',
  kochen: 'Kochen & Planen',
  sport: 'Sport & Training',
}

export const GROUP_ORDER: AchievementGroup[] = ['dabei', 'ziel', 'trinken', 'vielfalt', 'kochen', 'sport']

export interface AchievementDef {
  key: string
  emoji: string
  title: string
  description: string
  /** Lobende Nachricht beim Freischalten */
  praise: string
  group: AchievementGroup
  progress: (ctx: Derived) => AchievementProgress
}

/** Vorberechnete Kennzahlen, damit jede Regel einfach bleibt */
export interface Derived {
  loggedDates: string[]
  daysInTarget: number
  longestStreak: number
  maxBalancedDaysInWeek: number
  maxVeggiesInWeek: number
  recipesLogged: number
  maxPlannedDaysInWeek: number
  waterGoalDays: number
  ownRecipes: number
  /** Tage mit Frühstück, Mittag- und Abendessen */
  completeDays: number
  balancedDays: number
  /** Tage, an denen das Eiweißziel (aus Tagesziel und Makro-Anteil) erreicht war */
  proteinDays: number
  longestWaterStreak: number
  distinctVeggies: number
  distinctFoods: number
  distinctRecipes: number
  /** Wochen mit mindestens fünf geplanten Tagen */
  wellPlannedWeeks: number
  activities: number
  /** Sporteinheiten mit Übungen (Trainingstagebuch) */
  trainings: number
  sportMinutes: number
  maxStepsDay: number
  longestSportWeeks: number
  /** Bewegtes Gewicht (Wiederholungen × kg) aller Trainings */
  volumeKg: number
  /** Wie oft ein Bestwert gesteigert wurde */
  personalBests: number
  /** Eingeplante Trainings */
  trainingPlans: number
  /** Wochen mit mindestens 5 Tagen Essensplan und mindestens einem eingeplanten Training */
  allInOneWeeks: number
}

/** Längste Folge aufeinanderfolgender Tage */
export function longestStreak(dates: string[]): number {
  const sorted = [...new Set(dates)].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    run = prev && shiftISO(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/**
 * Aktuelle Serie ohne Druck: zählt bis heute – ist heute noch nichts eingetragen, zählt die Serie bis gestern.
 * Ein verpasster Tag setzt die Serie einfach auf 0 zurück.
 */
export function currentStreak(dates: string[], today: string): number {
  const set = new Set(dates)
  let day = set.has(today) ? today : shiftISO(today, -1)
  let n = 0
  while (set.has(day)) {
    n++
    day = shiftISO(day, -1)
  }
  return n
}

/** Längste Folge aufeinanderfolgender Wochen (Montag bis Sonntag) mit mindestens einem Tag */
export function longestWeekStreak(dates: string[]): number {
  return longestStreakBy([...new Set(dates.map(weekStartISO))], 7)
}

/** Aktuelle Wochen-Serie: zählt die laufende Woche mit, sobald sie dabei ist – sonst bis zur letzten Woche */
export function currentWeekStreak(dates: string[], today: string): number {
  const weeks = new Set(dates.map(weekStartISO))
  let week = weekStartISO(today)
  if (!weeks.has(week)) week = shiftISO(week, -7)
  let n = 0
  while (weeks.has(week)) {
    n++
    week = shiftISO(week, -7)
  }
  return n
}

function longestStreakBy(sortedUnique: string[], step: number): number {
  const sorted = [...sortedUnique].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    run = prev && shiftISO(prev, step) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

function maxPerWeek(dates: Iterable<string>): number {
  const counts = new Map<string, number>()
  for (const d of dates) counts.set(weekStartISO(d), (counts.get(weekStartISO(d)) ?? 0) + 1)
  return Math.max(0, ...counts.values())
}

/** Tage, an denen das Wasserziel erreicht war */
function waterGoalDates(input: AchievementInput): string[] {
  if (input.waterTarget <= 0) return []
  return [...waterByDate(input.water)].filter(([, ml]) => ml >= input.waterTarget).map(([d]) => d)
}

/** Wie oft bei einer Übung der bisherige Bestwert übertroffen wurde (ältestes Training zuerst) */
function countPersonalBests(activities: readonly ActivityLog[]): number {
  const bests: { key: string | null; name: string; set: TrainingSet }[] = []
  let count = 0
  for (const t of [...trainingsOf(activities)].reverse()) {
    for (const e of t.details.exercises) {
      const top = e.sets.filter((s) => setLabel(s)).reduce<TrainingSet | null>((b, s) => (!b || isBetterSet(s, b) ? s : b), null)
      if (!top) continue
      const known = bests.find((b) => sameExercise(b, e))
      if (!known) bests.push({ key: e.key, name: e.name, set: top })
      else if (isBetterSet(top, known.set)) {
        known.set = top
        count++
      }
    }
  }
  return count
}

const norm = (s: string) => s.trim().toLowerCase()

export function derive(input: AchievementInput): Derived {
  const totals = totalsByDate(input.log)
  const loggedDates = [...totals.keys()]
  const balanced = loggedDates.filter((d) => isBalancedDay(totals.get(d)!, input.kcalTarget, input.macros))
  const proteinGoal = macroGrams(input.kcalTarget, input.macros).protein

  const veggiesPerWeek = new Map<string, Set<string>>()
  const allVeggies = new Set<string>()
  const mealsPerDay = new Map<string, Set<string>>()
  for (const e of input.log) {
    const w = weekStartISO(e.date)
    const set = veggiesPerWeek.get(w) ?? new Set<string>()
    for (const v of e.veggies ?? []) {
      set.add(v)
      allVeggies.add(v)
    }
    veggiesPerWeek.set(w, set)
    const meals = mealsPerDay.get(e.date) ?? new Set<string>()
    meals.add(e.meal)
    mealsPerDay.set(e.date, meals)
  }

  const plannedPerWeek = new Map<string, Set<string>>()
  for (const p of input.plan) {
    const w = weekStartISO(p.date)
    const set = plannedPerWeek.get(w) ?? new Set<string>()
    set.add(p.date)
    plannedPerWeek.set(w, set)
  }

  const activities = input.activities ?? []
  const stepsPerDay = new Map<string, number>()
  for (const a of activities) if (a.steps) stepsPerDay.set(a.date, (stepsPerDay.get(a.date) ?? 0) + Number(a.steps))
  const trainings = trainingsOf(activities)

  const trainingWeeks = new Set((input.trainingPlans ?? []).map((p) => weekStartISO(p.date)))

  const waterDates = waterGoalDates(input)
  return {
    loggedDates,
    daysInTarget: loggedDates.filter((d) => isWithinTarget(totals.get(d)!.kcal, input.kcalTarget)).length,
    longestStreak: longestStreak(loggedDates),
    maxBalancedDaysInWeek: maxPerWeek(balanced),
    maxVeggiesInWeek: Math.max(0, ...[...veggiesPerWeek.values()].map((s) => s.size)),
    recipesLogged: input.log.filter((e) => e.recipe_id).length,
    maxPlannedDaysInWeek: maxPerWeek(new Set(input.plan.map((p) => p.date))),
    waterGoalDays: waterDates.length,
    ownRecipes: input.ownRecipes ?? 0,
    completeDays: [...mealsPerDay.values()].filter((m) => m.has('breakfast') && m.has('lunch') && m.has('dinner')).length,
    balancedDays: balanced.length,
    proteinDays: proteinGoal > 0 ? loggedDates.filter((d) => totals.get(d)!.protein >= proteinGoal).length : 0,
    longestWaterStreak: longestStreak(waterDates),
    distinctVeggies: allVeggies.size,
    distinctFoods: new Set(input.log.map((e) => norm(e.name)).filter(Boolean)).size,
    distinctRecipes: new Set(input.log.map((e) => e.recipe_id).filter(Boolean)).size,
    wellPlannedWeeks: [...plannedPerWeek.values()].filter((s) => s.size >= 5).length,
    activities: activities.length,
    trainings: trainings.length,
    sportMinutes: activities.reduce((sum, a) => sum + (Number(a.minutes) || 0), 0),
    maxStepsDay: Math.max(0, ...stepsPerDay.values()),
    longestSportWeeks: longestWeekStreak(activities.map((a) => a.date)),
    volumeKg: trainings.reduce((sum, t) => sum + trainingVolume(t.details), 0),
    personalBests: countPersonalBests(activities),
    trainingPlans: input.trainingPlans?.length ?? 0,
    allInOneWeeks: [...plannedPerWeek].filter(([w, s]) => s.size >= 5 && trainingWeeks.has(w)).length,
  }
}

const cap = (current: number, goal: number): AchievementProgress => ({ current: Math.min(Math.floor(current), goal), goal })

export const ACHIEVEMENTS: AchievementDef[] = [
  // --- Dranbleiben ---------------------------------------------------------------------------------------------
  {
    key: 'first_entry',
    emoji: '🌱',
    title: 'Der Anfang ist gemacht',
    description: 'Den ersten Tag protokolliert',
    praise: 'Dein erster Eintrag! Schön, dass du dabei bist.',
    group: 'dabei',
    progress: (d) => cap(d.loggedDates.length, 1),
  },
  {
    key: 'streak_3',
    emoji: '🔥',
    title: '3 Tage in Folge',
    description: 'An drei Tagen hintereinander protokolliert',
    praise: 'Drei Tage am Stück – du bleibst gut dran.',
    group: 'dabei',
    progress: (d) => cap(d.longestStreak, 3),
  },
  {
    key: 'streak_7',
    emoji: '🗓️',
    title: 'Eine ganze Woche',
    description: 'Sieben Tage hintereinander protokolliert',
    praise: 'Eine volle Woche protokolliert – richtig stark!',
    group: 'dabei',
    progress: (d) => cap(d.longestStreak, 7),
  },
  {
    key: 'streak_14',
    emoji: '⚡',
    title: 'Zwei Wochen am Stück',
    description: '14 Tage hintereinander protokolliert',
    praise: 'Zwei Wochen ohne Lücke – das ist schon Routine.',
    group: 'dabei',
    progress: (d) => cap(d.longestStreak, 14),
  },
  {
    key: 'streak_30',
    emoji: '🌟',
    title: 'Ein Monat am Stück',
    description: '30 Tage hintereinander protokolliert',
    praise: '30 Tage in Folge – beeindruckend beständig.',
    group: 'dabei',
    progress: (d) => cap(d.longestStreak, 30),
  },
  {
    key: 'streak_100',
    emoji: '💯',
    title: '100 Tage am Stück',
    description: '100 Tage hintereinander protokolliert',
    praise: 'Hundert Tage in Folge – das ist echte Ausdauer.',
    group: 'dabei',
    progress: (d) => cap(d.longestStreak, 100),
  },
  {
    key: 'days_30',
    emoji: '📒',
    title: '30 Tage dabei',
    description: 'An 30 Tagen protokolliert – Lücken sind erlaubt',
    praise: '30 Tage mit Einträgen – Teller gehört zu deinem Alltag.',
    group: 'dabei',
    progress: (d) => cap(d.loggedDates.length, 30),
  },
  {
    key: 'days_100',
    emoji: '📚',
    title: '100 Tage dabei',
    description: 'An 100 Tagen protokolliert',
    praise: '100 Tage mit Einträgen – Hut ab!',
    group: 'dabei',
    progress: (d) => cap(d.loggedDates.length, 100),
  },
  {
    key: 'days_200',
    emoji: '🏆',
    title: '200 Tage dabei',
    description: 'An 200 Tagen protokolliert',
    praise: '200 Tage – du bist ein echter Teller-Profi.',
    group: 'dabei',
    progress: (d) => cap(d.loggedDates.length, 200),
  },
  {
    key: 'complete_days_10',
    emoji: '🍽️',
    title: 'Vollständige Tage',
    description: 'An 10 Tagen Frühstück, Mittag- und Abendessen eingetragen',
    praise: 'Zehn Tage komplett erfasst – so hast du den vollen Überblick.',
    group: 'dabei',
    progress: (d) => cap(d.completeDays, 10),
  },
  // --- Ziele & Balance -----------------------------------------------------------------------------------------
  {
    key: 'first_in_target',
    emoji: '🎯',
    title: 'Erster Tag im Ziel',
    description: 'Tagesziel ±10 % eingehalten',
    praise: 'Volltreffer – ein Tag genau in deinem Zielbereich.',
    group: 'ziel',
    progress: (d) => cap(d.daysInTarget, 1),
  },
  {
    key: 'target_10',
    emoji: '🏹',
    title: '10 Tage im Ziel',
    description: 'An 10 Tagen das Tagesziel ±10 % eingehalten',
    praise: 'Zehn Tage im Zielbereich – du hast ein gutes Gespür.',
    group: 'ziel',
    progress: (d) => cap(d.daysInTarget, 10),
  },
  {
    key: 'target_50',
    emoji: '🥇',
    title: '50 Tage im Ziel',
    description: 'An 50 Tagen das Tagesziel ±10 % eingehalten',
    praise: '50 Tage im Ziel – das ist richtig konstant.',
    group: 'ziel',
    progress: (d) => cap(d.daysInTarget, 50),
  },
  {
    key: 'balanced_week',
    emoji: '⚖️',
    title: 'Ausgewogene Woche',
    description: 'Mindestens 5 ausgewogene Tage in einer Woche',
    praise: 'Fünf ausgewogene Tage in einer Woche – toll ausbalanciert.',
    group: 'ziel',
    progress: (d) => cap(d.maxBalancedDaysInWeek, 5),
  },
  {
    key: 'balanced_20',
    emoji: '🧭',
    title: '20 ausgewogene Tage',
    description: 'An 20 Tagen Kalorien und Makros nah an deinen Zielen',
    praise: '20 ausgewogene Tage – schön im Gleichgewicht.',
    group: 'ziel',
    progress: (d) => cap(d.balancedDays, 20),
  },
  {
    key: 'protein_10',
    emoji: '💪',
    title: 'Eiweißziel erreicht',
    description: 'An 10 Tagen dein Eiweißziel erreicht',
    praise: 'Zehnmal dein Eiweißziel geschafft – stark!',
    group: 'ziel',
    progress: (d) => cap(d.proteinDays, 10),
  },
  {
    key: 'protein_50',
    emoji: '🦾',
    title: 'Eiweiß-Profi',
    description: 'An 50 Tagen dein Eiweißziel erreicht',
    praise: '50 Tage Eiweißziel – du weißt genau, was du tust.',
    group: 'ziel',
    progress: (d) => cap(d.proteinDays, 50),
  },
  // --- Trinken ------------------------------------------------------------------------------------------------
  {
    key: 'water_5',
    emoji: '💧',
    title: 'Gut versorgt',
    description: 'Wasserziel an 5 Tagen erreicht',
    praise: 'Fünfmal dein Wasserziel erreicht – prima!',
    group: 'trinken',
    progress: (d) => cap(d.waterGoalDays, 5),
  },
  {
    key: 'water_streak_7',
    emoji: '🌊',
    title: 'Eine Woche gut getrunken',
    description: 'Sieben Tage hintereinander das Wasserziel erreicht',
    praise: 'Eine ganze Woche dein Wasserziel – läuft wie geschmiert.',
    group: 'trinken',
    progress: (d) => cap(d.longestWaterStreak, 7),
  },
  {
    key: 'water_20',
    emoji: '🚰',
    title: '20 Tage gut getrunken',
    description: 'Wasserziel an 20 Tagen erreicht',
    praise: '20 Tage Wasserziel – eine richtig gute Gewohnheit.',
    group: 'trinken',
    progress: (d) => cap(d.waterGoalDays, 20),
  },
  {
    key: 'water_100',
    emoji: '🐳',
    title: '100 Tage gut getrunken',
    description: 'Wasserziel an 100 Tagen erreicht',
    praise: 'Hundertmal dein Wasserziel – Wal-würdig!',
    group: 'trinken',
    progress: (d) => cap(d.waterGoalDays, 100),
  },
  // --- Vielfalt -----------------------------------------------------------------------------------------------
  {
    key: 'veggies_10',
    emoji: '🥦',
    title: 'Gemüse-Vielfalt',
    description: '10 verschiedene Gemüsesorten in einer Woche',
    praise: 'Zehn Gemüsesorten in einer Woche – bunter geht’s kaum.',
    group: 'vielfalt',
    progress: (d) => cap(d.maxVeggiesInWeek, 10),
  },
  {
    key: 'veggies_total_30',
    emoji: '🧺',
    title: 'Gemüse-Entdecker',
    description: '30 verschiedene Gemüsesorten eingetragen',
    praise: '30 Gemüsesorten – du probierst dich durch den ganzen Markt.',
    group: 'vielfalt',
    progress: (d) => cap(d.distinctVeggies, 30),
  },
  {
    key: 'foods_50',
    emoji: '🛒',
    title: 'Abwechslung',
    description: '50 verschiedene Lebensmittel und Gerichte eingetragen',
    praise: '50 verschiedene Sachen auf dem Teller – schön abwechslungsreich.',
    group: 'vielfalt',
    progress: (d) => cap(d.distinctFoods, 50),
  },
  {
    key: 'foods_150',
    emoji: '🌍',
    title: 'Große Vielfalt',
    description: '150 verschiedene Lebensmittel und Gerichte eingetragen',
    praise: '150 verschiedene Lebensmittel – was für eine Vielfalt!',
    group: 'vielfalt',
    progress: (d) => cap(d.distinctFoods, 150),
  },
  // --- Kochen & Planen ----------------------------------------------------------------------------------------
  {
    key: 'first_recipe',
    emoji: '👩‍🍳',
    title: 'Erstes Rezept gekocht',
    description: 'Ein Rezept als gegessen eingetragen',
    praise: 'Dein erstes Rezept aus der App – guten Appetit!',
    group: 'kochen',
    progress: (d) => cap(d.recipesLogged, 1),
  },
  {
    key: 'recipes_10',
    emoji: '📖',
    title: 'Kochbuch-Entdecker',
    description: '10 verschiedene Rezepte gekocht und eingetragen',
    praise: 'Zehn verschiedene Rezepte – du kochst dich durchs Buch.',
    group: 'kochen',
    progress: (d) => cap(d.distinctRecipes, 10),
  },
  {
    key: 'recipes_25',
    emoji: '🧑‍🍳',
    title: 'Hobbykoch',
    description: '25 verschiedene Rezepte gekocht und eingetragen',
    praise: '25 Rezepte – in deiner Küche ist was los!',
    group: 'kochen',
    progress: (d) => cap(d.distinctRecipes, 25),
  },
  {
    key: 'first_variant',
    emoji: '🪄',
    title: 'Rezept-Tüftler',
    description: 'Ein Rezept abgewandelt oder ein eigenes angelegt',
    praise: 'Dein erstes eigenes Rezept – so wird das Kochbuch zu deinem.',
    group: 'kochen',
    progress: (d) => cap(d.ownRecipes, 1),
  },
  {
    key: 'own_recipes_5',
    emoji: '📝',
    title: 'Eigene Rezeptsammlung',
    description: '5 eigene Rezepte oder Varianten gespeichert',
    praise: 'Fünf eigene Rezepte – deine persönliche Sammlung wächst.',
    group: 'kochen',
    progress: (d) => cap(d.ownRecipes, 5),
  },
  {
    key: 'first_week_planned',
    emoji: '📅',
    title: 'Erste Woche geplant',
    description: 'Für alle 7 Tage einer Woche etwas geplant',
    praise: 'Eine komplette Woche geplant – das spart Zeit und Nerven.',
    group: 'kochen',
    progress: (d) => cap(d.maxPlannedDaysInWeek, 7),
  },
  {
    key: 'planned_weeks_4',
    emoji: '🗂️',
    title: 'Planungsprofi',
    description: '4 Wochen mit mindestens 5 geplanten Tagen',
    praise: 'Vier gut geplante Wochen – der Wochenplan sitzt.',
    group: 'kochen',
    progress: (d) => cap(d.wellPlannedWeeks, 4),
  },
  {
    key: 'all_in_one_week',
    emoji: '🧩',
    title: 'Alles im Blick',
    description: 'Eine Woche mit Essensplan (5 Tage) und Training geplant',
    praise: 'Essen und Training in einem Plan – deine Woche ist rundum vorbereitet.',
    group: 'kochen',
    progress: (d) => cap(d.allInOneWeeks, 1),
  },
  // --- Sport & Training ---------------------------------------------------------------------------------------
  {
    key: 'first_activity',
    emoji: '🏃',
    title: 'In Bewegung',
    description: 'Die erste Sporteinheit eingetragen',
    praise: 'Deine erste Sporteinheit im Tagebuch – weiter so!',
    group: 'sport',
    progress: (d) => cap(d.activities, 1),
  },
  {
    key: 'activities_10',
    emoji: '🚴',
    title: '10 Sporteinheiten',
    description: '10-mal Sport oder Bewegung eingetragen',
    praise: 'Zehn Sporteinheiten – du bleibst in Bewegung.',
    group: 'sport',
    progress: (d) => cap(d.activities, 10),
  },
  {
    key: 'activities_50',
    emoji: '🏅',
    title: '50 Sporteinheiten',
    description: '50-mal Sport oder Bewegung eingetragen',
    praise: '50 Sporteinheiten – das ist richtig sportlich!',
    group: 'sport',
    progress: (d) => cap(d.activities, 50),
  },
  {
    key: 'sport_weeks_4',
    emoji: '📈',
    title: 'Vier aktive Wochen',
    description: '4 Wochen hintereinander mindestens einmal Sport',
    praise: 'Vier Wochen am Stück aktiv – Sport gehört dazu.',
    group: 'sport',
    progress: (d) => cap(d.longestSportWeeks, 4),
  },
  {
    key: 'sport_weeks_12',
    emoji: '🗻',
    title: 'Ein Vierteljahr aktiv',
    description: '12 Wochen hintereinander mindestens einmal Sport',
    praise: 'Zwölf Wochen in Folge aktiv – große Klasse!',
    group: 'sport',
    progress: (d) => cap(d.longestSportWeeks, 12),
  },
  {
    key: 'sport_hours_10',
    emoji: '⏱️',
    title: '10 Stunden Sport',
    description: 'Insgesamt 10 Stunden Sport eingetragen',
    praise: 'Zehn Stunden in Bewegung – jede Minute zählt.',
    group: 'sport',
    progress: (d) => cap(d.sportMinutes / 60, 10),
  },
  {
    key: 'steps_10k',
    emoji: '👟',
    title: '10.000 Schritte',
    description: 'An einem Tag mindestens 10.000 Schritte eingetragen',
    praise: '10.000 Schritte an einem Tag – ganz schön viel unterwegs!',
    group: 'sport',
    progress: (d) => cap(d.maxStepsDay / 1000, 10),
  },
  {
    key: 'first_training_plan',
    emoji: '🗓️',
    title: 'Trainingsplaner',
    description: 'Das erste Training im Wochenplan eingeplant',
    praise: 'Dein erstes geplantes Training – Essen und Sport greifen jetzt ineinander.',
    group: 'sport',
    progress: (d) => cap(d.trainingPlans, 1),
  },
  {
    key: 'first_training',
    emoji: '📓',
    title: 'Trainingstagebuch',
    description: 'Das erste Training mit Übungen eingetragen',
    praise: 'Dein erstes Training mit Übungen – jetzt siehst du deine Fortschritte.',
    group: 'sport',
    progress: (d) => cap(d.trainings, 1),
  },
  {
    key: 'trainings_10',
    emoji: '🏋️',
    title: '10 Trainings',
    description: '10 Trainings mit Übungen eingetragen',
    praise: 'Zehn Trainings im Tagebuch – richtig dran geblieben.',
    group: 'sport',
    progress: (d) => cap(d.trainings, 10),
  },
  {
    key: 'personal_best',
    emoji: '🚀',
    title: 'Neuer Bestwert',
    description: 'Bei einer Übung den eigenen Bestwert gesteigert',
    praise: 'Neuer Bestwert! Dein Training zahlt sich aus.',
    group: 'sport',
    progress: (d) => cap(d.personalBests, 1),
  },
  {
    key: 'personal_best_10',
    emoji: '🌠',
    title: 'Rekordjäger',
    description: '10-mal einen Bestwert gesteigert',
    praise: 'Zehn neue Bestwerte – du wirst stetig stärker.',
    group: 'sport',
    progress: (d) => cap(d.personalBests, 10),
  },
  {
    key: 'volume_10t',
    emoji: '🪨',
    title: '10 Tonnen bewegt',
    description: 'Insgesamt 10.000 kg bewegt (Wiederholungen × Gewicht)',
    praise: 'Zehn Tonnen bewegt – Respekt!',
    group: 'sport',
    progress: (d) => cap(d.volumeKg / 1000, 10),
  },
  {
    key: 'volume_100t',
    emoji: '🏗️',
    title: '100 Tonnen bewegt',
    description: 'Insgesamt 100.000 kg bewegt (Wiederholungen × Gewicht)',
    praise: '100 Tonnen – das ist eine ganze Menge Eisen!',
    group: 'sport',
    progress: (d) => cap(d.volumeKg / 1000, 100),
  },
]

export function evaluate(input: AchievementInput): { def: AchievementDef; progress: AchievementProgress; reached: boolean }[] {
  const d = derive(input)
  return ACHIEVEMENTS.map((def) => {
    const progress = def.progress(d)
    return { def, progress, reached: progress.current >= progress.goal }
  })
}

/** Schlüssel, die erreicht, aber noch nicht gespeichert sind */
export function newlyUnlocked(input: AchievementInput, unlockedKeys: Iterable<string>): AchievementDef[] {
  const have = new Set(unlockedKeys)
  return evaluate(input)
    .filter((r) => r.reached && !have.has(r.def.key))
    .map((r) => r.def)
}

// --- Serien ----------------------------------------------------------------------------------------------------

export interface Streak {
  key: 'log' | 'water' | 'sport'
  emoji: string
  title: string
  /** Laufende Serie */
  current: number
  /** Längste Serie bisher */
  best: number
  unit: 'day' | 'week'
}

/** Serien ohne Druck: Einträge und Wasserziel in Tagen, Sport in Wochen (einmal pro Woche reicht) */
export function computeStreaks(input: AchievementInput): Streak[] {
  const logged = [...totalsByDate(input.log).keys()]
  const water = waterGoalDates(input)
  const sport = (input.activities ?? []).map((a) => a.date)
  return [
    { key: 'log', emoji: '🔥', title: 'Protokolliert', current: currentStreak(logged, input.today), best: longestStreak(logged), unit: 'day' },
    { key: 'water', emoji: '💧', title: 'Wasserziel erreicht', current: currentStreak(water, input.today), best: longestStreak(water), unit: 'day' },
    { key: 'sport', emoji: '🏃', title: 'Sport (einmal pro Woche)', current: currentWeekStreak(sport, input.today), best: longestWeekStreak(sport), unit: 'week' },
  ]
}

/** „5 Tage“, „1 Woche“ */
export function streakLength(n: number, unit: Streak['unit']): string {
  if (unit === 'week') return `${n} ${n === 1 ? 'Woche' : 'Wochen'}`
  return `${n} ${n === 1 ? 'Tag' : 'Tage'}`
}
