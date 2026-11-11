import type { LogEntry, MacroPercents, PlanItem, WaterLog } from '../types'
import { totalsByDate } from './log'
import { isBalancedDay, isWithinTarget } from './nutrition'
import { shiftISO, weekStartISO } from './dates'
import { waterByDate } from './stats'

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
}

export interface AchievementProgress {
  current: number
  goal: number
}

export interface AchievementDef {
  key: string
  emoji: string
  title: string
  description: string
  /** Lobende Nachricht beim Freischalten */
  praise: string
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

function maxPerWeek(dates: Iterable<string>): number {
  const counts = new Map<string, number>()
  for (const d of dates) counts.set(weekStartISO(d), (counts.get(weekStartISO(d)) ?? 0) + 1)
  return Math.max(0, ...counts.values())
}

export function derive(input: AchievementInput): Derived {
  const totals = totalsByDate(input.log)
  const loggedDates = [...totals.keys()]
  const balanced = loggedDates.filter((d) => isBalancedDay(totals.get(d)!, input.kcalTarget, input.macros))

  const veggiesPerWeek = new Map<string, Set<string>>()
  for (const e of input.log) {
    const w = weekStartISO(e.date)
    const set = veggiesPerWeek.get(w) ?? new Set<string>()
    for (const v of e.veggies ?? []) set.add(v)
    veggiesPerWeek.set(w, set)
  }

  const water = waterByDate(input.water)
  return {
    loggedDates,
    daysInTarget: loggedDates.filter((d) => isWithinTarget(totals.get(d)!.kcal, input.kcalTarget)).length,
    longestStreak: longestStreak(loggedDates),
    maxBalancedDaysInWeek: maxPerWeek(balanced),
    maxVeggiesInWeek: Math.max(0, ...[...veggiesPerWeek.values()].map((s) => s.size)),
    recipesLogged: input.log.filter((e) => e.recipe_id).length,
    maxPlannedDaysInWeek: maxPerWeek(new Set(input.plan.map((p) => p.date))),
    waterGoalDays: input.waterTarget > 0 ? [...water.values()].filter((ml) => ml >= input.waterTarget).length : 0,
    ownRecipes: input.ownRecipes ?? 0,
  }
}

const cap = (current: number, goal: number): AchievementProgress => ({ current: Math.min(current, goal), goal })

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: 'first_entry',
    emoji: '🌱',
    title: 'Der Anfang ist gemacht',
    description: 'Den ersten Tag protokolliert',
    praise: 'Dein erster Eintrag! Schön, dass du dabei bist.',
    progress: (d) => cap(d.loggedDates.length, 1),
  },
  {
    key: 'first_in_target',
    emoji: '🎯',
    title: 'Erster Tag im Ziel',
    description: 'Tagesziel ±10 % eingehalten',
    praise: 'Volltreffer – ein Tag genau in deinem Zielbereich.',
    progress: (d) => cap(d.daysInTarget, 1),
  },
  {
    key: 'streak_3',
    emoji: '🔥',
    title: '3 Tage in Folge',
    description: 'An drei Tagen hintereinander protokolliert',
    praise: 'Drei Tage am Stück – du bleibst gut dran.',
    progress: (d) => cap(d.longestStreak, 3),
  },
  {
    key: 'streak_7',
    emoji: '🗓️',
    title: 'Eine ganze Woche',
    description: 'Sieben Tage hintereinander protokolliert',
    praise: 'Eine volle Woche protokolliert – richtig stark!',
    progress: (d) => cap(d.longestStreak, 7),
  },
  {
    key: 'balanced_week',
    emoji: '⚖️',
    title: 'Ausgewogene Woche',
    description: 'Mindestens 5 ausgewogene Tage in einer Woche',
    praise: 'Fünf ausgewogene Tage in einer Woche – toll ausbalanciert.',
    progress: (d) => cap(d.maxBalancedDaysInWeek, 5),
  },
  {
    key: 'veggies_10',
    emoji: '🥦',
    title: 'Gemüse-Vielfalt',
    description: '10 verschiedene Gemüsesorten in einer Woche',
    praise: 'Zehn Gemüsesorten in einer Woche – bunter geht’s kaum.',
    progress: (d) => cap(d.maxVeggiesInWeek, 10),
  },
  {
    key: 'first_recipe',
    emoji: '👩‍🍳',
    title: 'Erstes Rezept gekocht',
    description: 'Ein Rezept als gegessen eingetragen',
    praise: 'Dein erstes Rezept aus der App – guten Appetit!',
    progress: (d) => cap(d.recipesLogged, 1),
  },
  {
    key: 'first_variant',
    emoji: '🪄',
    title: 'Rezept-Tüftler',
    description: 'Ein Rezept abgewandelt oder ein eigenes angelegt',
    praise: 'Dein erstes eigenes Rezept – so wird das Kochbuch zu deinem.',
    progress: (d) => cap(d.ownRecipes, 1),
  },
  {
    key: 'first_week_planned',
    emoji: '📅',
    title: 'Erste Woche geplant',
    description: 'Für alle 7 Tage einer Woche etwas geplant',
    praise: 'Eine komplette Woche geplant – das spart Zeit und Nerven.',
    progress: (d) => cap(d.maxPlannedDaysInWeek, 7),
  },
  {
    key: 'water_5',
    emoji: '💧',
    title: 'Gut versorgt',
    description: 'Wasserziel an 5 Tagen erreicht',
    praise: 'Fünfmal dein Wasserziel erreicht – prima!',
    progress: (d) => cap(d.waterGoalDays, 5),
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
