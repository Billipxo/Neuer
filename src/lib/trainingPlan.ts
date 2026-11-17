/**
 * Training planen – abgestimmt aufs Essen. Das Essen bleibt die Hauptsache im Wochenplan; geplante Trainings kommen
 * dezent dazu und fließen in die Mahlzeiten-Vorschläge ein: An Trainingstagen passt der Vorschlag die Menge an (wenn
 * Sport aufs Tagesziel angerechnet wird) und bevorzugt an Krafttagen proteinreiche Rezepte.
 *
 * Ob ein geplantes Training erledigt ist, ergibt sich aus dem eingetragenen Sport des Tages – nichts muss doppelt
 * abgehakt werden.
 */
import type { ActivityLog, PlannedWorkout, TrainingDetails, TrainingPlan, TrainingPlanDetails } from '../types'
import { activityType } from '../data/activities'
import { estimateKcal } from './activity'
import { mulberry32 } from './random'
import { detailsFromWorkout, sanitizeDetails, templateFrom } from './trainingLog'
import { DURATIONS, FOCUS_LABELS, LEVEL_LABELS, PLACE_LABELS, generateWorkout, type Focus, type Level, type Place, type Workout } from './workouts'

export type NewTrainingPlan = Omit<TrainingPlan, 'id' | 'user_id' | 'created_at'>
type NewActivity = Omit<ActivityLog, 'id' | 'user_id' | 'created_at'>

// --- Sportarten zuordnen ---------------------------------------------------------------------------------------

/** Wofür eine Sportart steht – damit z. B. Laufen statt Radfahren ein geplantes Ausdauertraining erfüllt */
export type SportGroup = 'kraft' | 'ausdauer' | 'beweglichkeit' | 'spiel' | 'alltag' | 'eigene'

const GROUPS: Record<string, SportGroup> = {
  krafttraining: 'kraft',
  klettern: 'kraft',
  joggen: 'ausdauer',
  'laufen-schnell': 'ausdauer',
  walking: 'ausdauer',
  'nordic-walking': 'ausdauer',
  wandern: 'ausdauer',
  'rad-gemuetlich': 'ausdauer',
  'rad-zuegig': 'ausdauer',
  mountainbike: 'ausdauer',
  'indoor-cycling': 'ausdauer',
  schwimmen: 'ausdauer',
  aquafitness: 'ausdauer',
  hiit: 'ausdauer',
  crosstrainer: 'ausdauer',
  rudern: 'ausdauer',
  inlineskaten: 'ausdauer',
  skifahren: 'ausdauer',
  langlauf: 'ausdauer',
  seilspringen: 'ausdauer',
  treppen: 'ausdauer',
  sup: 'ausdauer',
  tanzen: 'ausdauer',
  kampfsport: 'ausdauer',
  yoga: 'beweglichkeit',
  pilates: 'beweglichkeit',
  dehnen: 'beweglichkeit',
  fussball: 'spiel',
  basketball: 'spiel',
  handball: 'spiel',
  volleyball: 'spiel',
  tennis: 'spiel',
  badminton: 'spiel',
  tischtennis: 'spiel',
  squash: 'spiel',
  golf: 'spiel',
  reiten: 'spiel',
  schritte: 'alltag',
  spazieren: 'alltag',
  garten: 'alltag',
  putzen: 'alltag',
}

export function sportGroup(kind: string): SportGroup {
  return GROUPS[kind] ?? 'eigene'
}

/** Krafttraining geplant? Dann bevorzugt der Wochenvorschlag an diesem Tag proteinreiche Rezepte. */
export function isStrengthPlan(p: Pick<TrainingPlan, 'kind'>): boolean {
  return sportGroup(p.kind) === 'kraft'
}

const byDateThenCreated = (a: Pick<TrainingPlan, 'date' | 'created_at'>, b: Pick<TrainingPlan, 'date' | 'created_at'>) =>
  a.date !== b.date ? (a.date < b.date ? -1 : 1) : (a.created_at ?? '').localeCompare(b.created_at ?? '')

/**
 * Welche geplanten Trainings sind erledigt? Je Tag zählt zuerst Sport derselben Art, dann ähnlicher Sport (Laufen statt
 * Radfahren – beides Ausdauer). Jede Sporteinheit erfüllt höchstens ein geplantes Training. Alltagsbewegung (Schritte,
 * Garten …) und eigene Aktivitäten zählen nur bei derselben Sportart.
 */
type PlanRef = Pick<TrainingPlan, 'id' | 'date' | 'kind' | 'created_at'>
type ActivityRef = Pick<ActivityLog, 'id' | 'date' | 'kind'>

export function matchPlans<A extends ActivityRef>(plans: readonly PlanRef[], activities: readonly A[]): Map<string, A> {
  const done = new Map<string, A>()
  const used = new Set<string>()
  const ordered = [...plans].sort(byDateThenCreated)
  const free = (date: string) => activities.filter((a) => a.date === date && !used.has(a.id))
  const take = (p: PlanRef, hit: A | undefined) => {
    if (!hit) return
    done.set(p.id, hit)
    used.add(hit.id)
  }
  // Erst dieselbe Sportart …
  for (const p of ordered) {
    const same = free(p.date).find((a) => a.kind === p.kind)
    take(p, same)
  }
  // … dann ähnlicher Sport
  for (const p of ordered) {
    if (done.has(p.id)) continue
    const group = sportGroup(p.kind)
    if (group === 'alltag' || group === 'eigene') continue
    const similar = free(p.date).find((a) => sportGroup(a.kind) === group)
    take(p, similar)
  }
  return done
}

/** Geplante Trainings eines Tages, die noch offen sind */
export function openPlansOn(date: string, plans: readonly TrainingPlan[], activities: readonly ActivityRef[]): TrainingPlan[] {
  const done = matchPlans(plans, activities)
  return plans.filter((p) => p.date === date && !done.has(p.id)).sort(byDateThenCreated)
}

// --- Verbrauch und Abstimmung aufs Essen ----------------------------------------------------------------------

/** Geschätzter zusätzlicher Verbrauch eines geplanten Trainings (wie beim Eintragen) */
export function planKcal(p: Pick<TrainingPlan, 'kind' | 'minutes'>, weightKg: number): number {
  const t = activityType(p.kind)
  if (!t || t.custom || t.steps) return 0
  return estimateKcal(t, { minutes: p.minutes }, weightKg)
}

export interface MealPlanHints {
  /** Zusätzliche kcal je Tag – nur, wenn Sport aufs Tagesziel angerechnet wird */
  extraKcal: Record<string, number>
  /** Tage mit Krafttraining: Dort bevorzugt der Wochenvorschlag proteinreiche Rezepte */
  proteinDays: string[]
  /** Tage mit geplantem Training */
  trainingDays: string[]
}

/** Was die geplanten Trainings einer Woche für die Mahlzeiten-Vorschläge bedeuten */
export function mealPlanHints(
  plans: readonly TrainingPlan[],
  days: readonly string[],
  { weightKg, inBudget }: { weightKg: number; inBudget: boolean },
): MealPlanHints {
  const extraKcal: Record<string, number> = {}
  const proteinDays: string[] = []
  const trainingDays: string[] = []
  for (const d of days) {
    const list = plans.filter((p) => p.date === d)
    if (!list.length) continue
    trainingDays.push(d)
    if (list.some(isStrengthPlan)) proteinDays.push(d)
    const kcal = list.reduce((s, p) => s + planKcal(p, weightKg), 0)
    if (inBudget && kcal > 0) extraKcal[d] = kcal
  }
  return { extraKcal, proteinDays, trainingDays }
}

// --- Training einplanen --------------------------------------------------------------------------------------

/** Einen Vorschlag der App einplanen: Mit derselben Zufallszahl entsteht später genau dieses Training wieder */
export function planFromSuggestion(date: string, o: { place: Place; duration: number; focus: Focus; level: Level; seed: number }): NewTrainingPlan {
  const w = generateWorkout({ place: o.place, minutes: o.duration, focus: o.focus, level: o.level, seed: o.seed })
  return {
    date,
    kind: w.activityKind,
    title: w.title.slice(0, 80),
    minutes: w.minutes > 0 ? w.minutes : o.duration,
    details: { source: 'vorschlag', place: o.place, focus: o.focus, level: o.level, duration: o.duration, seed: o.seed },
  }
}

/** Ein früheres eigenes Training noch einmal einplanen – mit denselben Übungen und Sätzen */
export function planFromTraining(date: string, a: Pick<ActivityLog, 'kind' | 'name' | 'minutes' | 'details'>): NewTrainingPlan {
  const exercises = a.details?.exercises?.length ? templateFrom(a.details).exercises : []
  return {
    date,
    kind: activityType(a.kind) ? a.kind : 'krafttraining',
    title: a.name.trim().slice(0, 80) || 'Training',
    minutes: a.minutes && a.minutes > 0 ? a.minutes : null,
    details: exercises.length ? { source: 'vorlage', exercises } : null,
  }
}

/** Einfach eine Sportart mit Dauer einplanen, z. B. „Joggen, 45 Min.“ */
export function planFromSport(date: string, kind: string, minutes: number | null, name = ''): NewTrainingPlan {
  const t = activityType(kind)
  return {
    date,
    kind: t ? kind : 'eigene',
    title: (name.trim() || t?.name || 'Training').slice(0, 80),
    minutes: minutes && minutes > 0 ? Math.min(1440, Math.round(minutes)) : null,
    details: null,
  }
}

/** Schwerpunkt-Wahl für eine ganze Trainingswoche */
export type FocusMode = 'abwechselnd' | Focus

/** Abwechselnde Schwerpunkte je nach Anzahl der Trainingstage */
export const ROTATION: Record<number, readonly Focus[]> = {
  1: ['ganzkoerper'],
  2: ['ganzkoerper', 'ausdauer'],
  3: ['ganzkoerper', 'ausdauer', 'ganzkoerper'],
  4: ['oberkoerper', 'beine-po', 'ausdauer', 'rumpf'],
  5: ['oberkoerper', 'beine-po', 'ausdauer', 'ganzkoerper', 'beweglichkeit'],
  6: ['oberkoerper', 'beine-po', 'ausdauer', 'rumpf', 'ganzkoerper', 'beweglichkeit'],
  7: ['oberkoerper', 'beine-po', 'ausdauer', 'rumpf', 'ganzkoerper', 'ausdauer', 'beweglichkeit'],
}

export interface WeekTrainingOptions {
  /** Gewählte Trainingstage */
  dates: readonly string[]
  place: Place
  duration: number
  level: Level
  focus: FocusMode
  /** Schon geplante Trainings – an diesen Tagen kommt nichts dazu */
  existing: readonly Pick<TrainingPlan, 'date'>[]
  seed: number
  /** Frühester Tag (meist heute) – vergangene Tage werden nicht mehr eingeplant */
  notBefore?: string
}

/** „Trainingstage planen“: an jedem gewählten Tag ohne Training ein Vorschlag, auf Wunsch mit wechselndem Schwerpunkt */
export function planTrainingWeek(o: WeekTrainingOptions): NewTrainingPlan[] {
  // Vergangene Tage fallen ganz weg – auch aus der Abfolge der Schwerpunkte
  const dates = [...new Set(o.dates)].filter((d) => !o.notBefore || d >= o.notBefore).sort()
  if (!dates.length) return []
  // Tage mit schon geplantem Training zählen für die Abfolge mit, bekommen aber nichts dazu
  const taken = new Set(o.existing.map((p) => p.date))
  const rotation = ROTATION[Math.min(7, dates.length)]
  const random = mulberry32(o.seed)
  const out: NewTrainingPlan[] = []
  dates.forEach((date, i) => {
    const seed = Math.floor(random() * 1_000_000_000)
    if (taken.has(date)) return
    const focus = o.focus === 'abwechselnd' ? rotation[i % rotation.length] : o.focus
    out.push(planFromSuggestion(date, { place: o.place, duration: o.duration, level: o.level, focus, seed }))
  })
  return out
}

// --- Geplantes Training durchführen -------------------------------------------------------------------------

function oneOf<T extends string>(value: unknown, labels: Record<T, string>): T | null {
  return typeof value === 'string' && Object.keys(labels).includes(value) ? (value as T) : null
}

/** Gespeicherte Angaben prüfen – Unbekanntes oder Beschädigtes fällt weg */
export function sanitizePlanDetails(raw: unknown): TrainingPlanDetails | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  if (r.source === 'vorschlag') {
    const place = oneOf<Place>(r.place, PLACE_LABELS)
    const focus = oneOf<Focus>(r.focus, FOCUS_LABELS)
    const level = oneOf<Level>(r.level, LEVEL_LABELS)
    const duration = (DURATIONS as readonly number[]).includes(r.duration as number) ? (r.duration as number) : null
    const seed = Number.isInteger(r.seed) && (r.seed as number) >= 0 && (r.seed as number) < 2 ** 32 ? (r.seed as number) : null
    if (!place || !focus || !level || duration === null || seed === null) return null
    const details: PlannedWorkout = { source: 'vorschlag', place, focus, level, duration, seed }
    return details
  }
  if (r.source === 'vorlage') {
    const d = sanitizeDetails({ exercises: r.exercises })
    return d?.exercises.length ? { source: 'vorlage', exercises: d.exercises } : null
  }
  return null
}

/** Das geplante Training, wenn es ein Vorschlag der App ist – genau so, wie es eingeplant wurde */
export function plannedWorkout(p: Pick<TrainingPlan, 'details'>): Workout | null {
  const d = sanitizePlanDetails(p.details)
  if (d?.source !== 'vorschlag') return null
  return generateWorkout({ place: d.place, minutes: d.duration, focus: d.focus, level: d.level, seed: d.seed })
}

/** Übungen einer geplanten Vorlage (früheres eigenes Training) */
export function plannedExercises(p: Pick<TrainingPlan, 'details'>): TrainingDetails | null {
  const d = sanitizePlanDetails(p.details)
  return d?.source === 'vorlage' ? { exercises: d.exercises } : null
}

/** Wohin „Starten“ führt: zum geführten Training (Vorschlag) oder ins Trainingstagebuch (Vorlage) */
export function startLink(p: Pick<TrainingPlan, 'id' | 'details' | 'date'>, today: string): string | null {
  const d = sanitizePlanDetails(p.details)
  if (d?.source === 'vorschlag') return `/training?plan=${encodeURIComponent(p.id)}`
  if (d?.source === 'vorlage') return `/training/eintragen?plan=${encodeURIComponent(p.id)}&datum=${p.date <= today ? p.date : today}`
  return null
}

/** „Erledigt“: das geplante Training als Sport eintragen – mit Übungen, soweit bekannt */
export function activityFromPlan(p: TrainingPlan, weightKg: number, date = p.date): NewActivity {
  const workout = plannedWorkout(p)
  const t = activityType(p.kind)
  const details: TrainingDetails | null = workout ? detailsFromWorkout(workout) : plannedExercises(p)
  return {
    date,
    kind: t ? p.kind : 'eigene',
    name: (workout ? `Training: ${p.title}` : p.title).slice(0, 80),
    minutes: p.minutes && p.minutes > 0 ? p.minutes : null,
    steps: null,
    kcal: planKcal(p, weightKg),
    ...(details?.exercises.length ? { details } : {}),
  }
}

// --- Überblick ---------------------------------------------------------------------------------------------

export interface TrainingWeekSummary {
  planned: number
  done: number
  /** Geplante Minuten */
  minutes: number
}

/** Geplant und erledigt in einem Zeitraum – ohne Wertung */
export function trainingWeekSummary(
  plans: readonly TrainingPlan[],
  activities: readonly ActivityRef[],
  days: readonly string[],
): TrainingWeekSummary {
  const inRange = plans.filter((p) => days.includes(p.date))
  const done = matchPlans(inRange, activities)
  return {
    planned: inRange.length,
    done: done.size,
    minutes: inRange.reduce((s, p) => s + (Number(p.minutes) || 0), 0),
  }
}

/** Kurzbeschreibung eines geplanten Trainings: „ca. 30 Min. · Krafttraining“ */
export function planDetail(p: Pick<TrainingPlan, 'kind' | 'minutes' | 'details'>): string {
  const d = sanitizePlanDetails(p.details)
  const parts: string[] = []
  if (p.minutes) parts.push(`${d?.source === 'vorschlag' ? 'ca. ' : ''}${p.minutes} Min.`)
  if (d?.source === 'vorschlag') parts.push(LEVEL_LABELS[d.level])
  else if (d?.source === 'vorlage') parts.push(`${d.exercises.length} ${d.exercises.length === 1 ? 'Übung' : 'Übungen'}`)
  return parts.join(' · ')
}
