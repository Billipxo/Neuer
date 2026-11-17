/**
 * Zuletzt gewählte Trainings-Einstellungen – nur auf diesem Gerät. Training-Seite und Wochenplan nutzen dieselben,
 * damit ein eingeplanter Vorschlag zu dem passt, was man sonst wählt.
 */
import { DURATIONS, FOCUS_LABELS, LEVEL_LABELS, PLACE_LABELS, type Focus, type Level, type Place } from './workouts'

const SETTINGS_KEY = 'teller-training'
const WEEKDAYS_KEY = 'teller-trainingstage'

export interface TrainingSettings {
  place: Place
  minutes: number
  focus: Focus
  level: Level
}

export const DEFAULT_TRAINING_SETTINGS: TrainingSettings = { place: 'zuhause', minutes: 20, focus: 'ganzkoerper', level: 'einsteiger' }

const has = (labels: Record<string, string>, v: unknown): boolean => typeof v === 'string' && Object.keys(labels).includes(v)

/** Gespeicherte Werte prüfen – Unbekanntes fällt auf die Voreinstellung zurück */
export function parseTrainingSettings(raw: string | null): TrainingSettings {
  const d = DEFAULT_TRAINING_SETTINGS
  try {
    const v = raw ? (JSON.parse(raw) as Partial<Record<keyof TrainingSettings, unknown>>) : {}
    if (!v || typeof v !== 'object') return d
    return {
      place: has(PLACE_LABELS, v.place) ? (v.place as Place) : d.place,
      minutes: (DURATIONS as readonly number[]).includes(v.minutes as number) ? (v.minutes as number) : d.minutes,
      focus: has(FOCUS_LABELS, v.focus) ? (v.focus as Focus) : d.focus,
      level: has(LEVEL_LABELS, v.level) ? (v.level as Level) : d.level,
    }
  } catch {
    return d
  }
}

export function loadTrainingSettings(): TrainingSettings {
  try {
    return parseTrainingSettings(localStorage.getItem(SETTINGS_KEY))
  } catch {
    return DEFAULT_TRAINING_SETTINGS
  }
}

export function saveTrainingSettings(s: TrainingSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    // ohne Speicher gelten beim nächsten Mal wieder die Voreinstellungen
  }
}

/** Voreinstellung für „Trainingstage planen“: Montag, Mittwoch, Freitag (0 = Montag … 6 = Sonntag) */
export const DEFAULT_WEEKDAYS = [0, 2, 4]

export function parseWeekdays(raw: string | null): number[] {
  try {
    const v = raw ? (JSON.parse(raw) as unknown) : null
    if (!Array.isArray(v)) return DEFAULT_WEEKDAYS
    const days = [...new Set(v.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= 6))].sort()
    return days.length ? days : DEFAULT_WEEKDAYS
  } catch {
    return DEFAULT_WEEKDAYS
  }
}

export function loadTrainingWeekdays(): number[] {
  try {
    return parseWeekdays(localStorage.getItem(WEEKDAYS_KEY))
  } catch {
    return DEFAULT_WEEKDAYS
  }
}

export function saveTrainingWeekdays(days: number[]) {
  try {
    localStorage.setItem(WEEKDAYS_KEY, JSON.stringify(days))
  } catch {
    // nicht schlimm
  }
}
