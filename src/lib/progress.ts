/**
 * Fortschritt und Wochenrückblick – bewusst neutral formuliert: Trends sind Hochrechnungen aus den eigenen
 * Einträgen, keine Versprechen und keine Bewertung.
 */
import type { LogEntry, MacroPercents, WaterLog, WeightLog } from '../types'
import { totalsByDate } from './log'
import { isWithinTarget, macroGrams } from './nutrition'
import { waterByDate } from './stats'
import { fmt1, fmtInt } from './format'

export interface WeightPoint {
  date: string
  kg: number
}

/** Ein Wert pro Tag (der letzte gewinnt), aufsteigend nach Datum */
export function weightPoints(weights: WeightLog[]): WeightPoint[] {
  const m = new Map<string, number>()
  for (const w of [...weights].sort((a, b) => (a.date < b.date ? -1 : 1))) m.set(w.date, Number(w.kg))
  return [...m].map(([date, kg]) => ({ date, kg }))
}

function dayNumber(iso: string): number {
  return Math.round(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000)
}

export interface WeightTrend {
  first: WeightPoint | null
  latest: WeightPoint | null
  /** Mittel der Einträge aus den 7 Tagen bis zum letzten Eintrag – glättet Tagesschwankungen */
  smoothed: number | null
  /** Veränderung pro Woche aus einer Ausgleichsgeraden über die letzten 28 Tage (mind. 3 Einträge über mind. 7 Tage) */
  weeklyChange: number | null
  /** Veränderung seit dem ersten Eintrag */
  totalChange: number | null
}

export function weightTrend(weights: WeightLog[]): WeightTrend {
  const pts = weightPoints(weights)
  if (!pts.length) return { first: null, latest: null, smoothed: null, weeklyChange: null, totalChange: null }
  const first = pts[0]
  const latest = pts[pts.length - 1]
  const end = dayNumber(latest.date)
  const recent = pts.filter((p) => end - dayNumber(p.date) < 7)
  const smoothed = recent.reduce((s, p) => s + p.kg, 0) / recent.length
  const window = pts.filter((p) => end - dayNumber(p.date) < 28)
  let weeklyChange: number | null = null
  if (window.length >= 3 && end - dayNumber(window[0].date) >= 7) {
    const xs = window.map((p) => dayNumber(p.date))
    const ys = window.map((p) => p.kg)
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length
    const my = ys.reduce((a, b) => a + b, 0) / ys.length
    const sxx = xs.reduce((s, x) => s + (x - mx) * (x - mx), 0)
    const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
    weeklyChange = sxx ? (sxy / sxx) * 7 : null
  }
  return { first, latest, smoothed, weeklyChange, totalChange: latest.kg - first.kg }
}

export interface GoalProgress {
  target: number
  /** Noch zu gehen: positiv = abnehmen, negativ = zunehmen (vom geglätteten Wert aus) */
  remaining: number
  /** Anteil des Weges vom ersten Eintrag zum Ziel (0–1); null, wenn Start und Ziel fast gleich sind */
  share: number | null
  /** Wochen beim aktuellen Trend; null ohne Trend oder wenn er vom Ziel wegführt */
  weeksAtTrend: number | null
  reached: boolean
}

export function goalProgress(trend: WeightTrend, target: number | null | undefined): GoalProgress | null {
  if (!target || !trend.latest || !trend.first) return null
  const current = trend.smoothed ?? trend.latest.kg
  const remaining = current - target
  const reached = Math.abs(remaining) < 0.5
  const span = trend.first.kg - target
  const share = Math.abs(span) >= 0.5 ? Math.max(0, Math.min(1, (trend.first.kg - current) / span)) : null
  let weeksAtTrend: number | null = null
  if (!reached && trend.weeklyChange !== null && Math.abs(trend.weeklyChange) >= 0.05 && Math.sign(trend.weeklyChange) === -Math.sign(remaining)) {
    weeksAtTrend = Math.max(1, Math.round(Math.abs(remaining) / Math.abs(trend.weeklyChange)))
  }
  return { target, remaining, share, weeksAtTrend, reached }
}

/** „+0,4 kg“, „−1,2 kg“, „±0 kg“ – mit echtem Minuszeichen */
export function fmtSignedKg(n: number): string {
  const r = Math.round(n * 10) / 10
  return `${r > 0 ? '+' : r < 0 ? '−' : '±'}${fmt1(Math.abs(r))} kg`
}

export interface WeekReviewInput {
  /** Die 7 Tage der Woche (Mo–So) */
  days: string[]
  /** Einträge dieser Woche */
  log: LogEntry[]
  /** Wasser dieser Woche */
  water: WaterLog[]
  /** Alle Gewichtseinträge (für den Vergleich mit der Vorwoche) */
  weights: WeightLog[]
  kcalTarget: number
  waterTarget: number
  macros: MacroPercents
}

export interface WeekReview {
  days: number
  loggedDays: number
  kcalTarget: number
  avgKcal: number | null
  avgProtein: number | null
  proteinGoal: number
  daysInTarget: number
  waterLogged: boolean
  waterDays: number
  veggieKinds: number
  /** Letzter Wert der Woche gegenüber dem letzten Wert davor */
  weightChange: number | null
  topRecipe: { name: string; count: number } | null
}

export function weekReview(i: WeekReviewInput): WeekReview {
  const totals = totalsByDate(i.log)
  const loggedDays = i.days.filter((d) => totals.has(d))
  const n = loggedDays.length
  const sum = loggedDays.reduce(
    (a, d) => {
      const t = totals.get(d)!
      return { kcal: a.kcal + t.kcal, protein: a.protein + t.protein }
    },
    { kcal: 0, protein: 0 },
  )
  const water = waterByDate(i.water)
  const waterDays = i.waterTarget > 0 ? i.days.filter((d) => (water.get(d) ?? 0) >= i.waterTarget).length : 0
  const veggies = new Set(i.log.flatMap((e) => e.veggies ?? []))
  const pts = weightPoints(i.weights)
  const last = i.days[i.days.length - 1]
  const inWeek = pts.filter((p) => p.date >= i.days[0] && p.date <= last)
  const before = pts.filter((p) => p.date < i.days[0])
  const weightChange = inWeek.length && before.length ? inWeek[inWeek.length - 1].kg - before[before.length - 1].kg : null
  const counts = new Map<string, { name: string; count: number }>()
  for (const e of i.log) {
    if (!e.recipe_id) continue
    const c = counts.get(e.recipe_id)
    counts.set(e.recipe_id, { name: e.name, count: (c?.count ?? 0) + 1 })
  }
  const topRecipe = [...counts.values()].sort((a, b) => b.count - a.count)[0] ?? null
  return {
    days: i.days.length,
    loggedDays: n,
    kcalTarget: i.kcalTarget,
    avgKcal: n ? sum.kcal / n : null,
    avgProtein: n ? sum.protein / n : null,
    proteinGoal: macroGrams(i.kcalTarget, i.macros).protein,
    daysInTarget: loggedDays.filter((d) => isWithinTarget(totals.get(d)!.kcal, i.kcalTarget)).length,
    waterLogged: water.size > 0,
    waterDays,
    veggieKinds: veggies.size,
    weightChange,
    topRecipe,
  }
}

/** Neutrale Sätze für den Wochenrückblick – Beobachtungen, keine Bewertung */
export function reviewLines(r: WeekReview): string[] {
  if (!r.loggedDays) return ['In dieser Woche ist noch nichts protokolliert – auch ein unvollständiger Tag zählt.']
  const out = [`An ${r.loggedDays} von ${r.days} Tagen protokolliert.`]
  if (r.avgKcal !== null) out.push(`Im Schnitt ${fmtInt(r.avgKcal)} kcal pro Tag – Ziel ${fmtInt(r.kcalTarget)}.`)
  if (r.avgProtein !== null) out.push(`Ø ${fmtInt(r.avgProtein)} g Eiweiß (Richtwert ${fmtInt(r.proteinGoal)} g).`)
  out.push(`${r.daysInTarget} ${r.daysInTarget === 1 ? 'Tag' : 'Tage'} im Zielbereich (±10 %).`)
  if (r.waterLogged) out.push(`Wasserziel an ${r.waterDays} ${r.waterDays === 1 ? 'Tag' : 'Tagen'} erreicht.`)
  if (r.veggieKinds > 0) out.push(`${r.veggieKinds} verschiedene Gemüsesorten.`)
  if (r.weightChange !== null) out.push(`Gewicht: ${fmtSignedKg(r.weightChange)} gegenüber der Vorwoche.`)
  if (r.topRecipe) out.push(`Meistgekocht: ${r.topRecipe.name} (${r.topRecipe.count}×).`)
  return out
}
