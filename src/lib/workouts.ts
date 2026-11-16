/**
 * Trainingsvorschläge: aus der Übungsbibliothek ein ausgewogenes Training zusammenstellen – nach Ort (zu Hause ohne
 * Geräte, mit Kurzhanteln, Fitnessstudio), Dauer, Schwerpunkt und Level. Aufbau: Aufwärmen, Hauptteil (Zirkel, Sätze,
 * Intervalle oder Beweglichkeits-Folge), Abkühlen. Mit gleichem „seed“ entsteht dasselbe Training.
 */
import { EXERCISES, type Equipment, type Exercise, type Muscle } from '../data/exercises'
import { mulberry32 } from './planner'

export type Place = 'zuhause' | 'hanteln' | 'studio'
export type Focus = 'ganzkoerper' | 'beine-po' | 'oberkoerper' | 'rumpf' | 'ausdauer' | 'beweglichkeit'
export type Level = 'einsteiger' | 'fortgeschritten'

export const DURATIONS = [15, 20, 30, 45, 60] as const

export const PLACE_LABELS: Record<Place, string> = {
  zuhause: 'Zuhause',
  hanteln: 'Mit Kurzhanteln',
  studio: 'Fitnessstudio',
}
const PLACE_TITLE: Record<Place, string> = { zuhause: 'zu Hause', hanteln: 'mit Kurzhanteln', studio: 'im Studio' }

export const FOCUS_LABELS: Record<Focus, string> = {
  ganzkoerper: 'Ganzkörper',
  'beine-po': 'Beine & Po',
  oberkoerper: 'Oberkörper',
  rumpf: 'Bauch & Rücken',
  ausdauer: 'Ausdauer',
  beweglichkeit: 'Beweglichkeit',
}

export const LEVEL_LABELS: Record<Level, string> = { einsteiger: 'Einsteiger', fortgeschritten: 'Fortgeschritten' }

export interface WorkoutOptions {
  place: Place
  minutes: number
  focus: Focus
  level: Level
  /** Zufallszahl für „Neuer Vorschlag“ */
  seed: number
}

export interface WorkoutItem {
  exercise: Exercise
  /** Sätze bzw. Intervalle */
  sets?: number
  /** Wiederholungen, z. B. „10–12“ */
  reps?: string
  /** Arbeitszeit in Sekunden (je Seite bei Übungen für beide Seiten) */
  seconds?: number
  /** Pause danach in Sekunden (bei Intervallen: lockere Phase) */
  rest?: number
}

export type BlockKind = 'warmup' | 'circuit' | 'sets' | 'intervals' | 'flow' | 'cooldown'

export interface WorkoutBlock {
  kind: BlockKind
  title: string
  /** Kurz erklärt, z. B. „3 Runden: je 40 s Übung, 20 s Pause“ */
  note: string
  /** Runden (Zirkel); sonst 1 */
  rounds: number
  items: WorkoutItem[]
}

export interface Workout {
  title: string
  options: WorkoutOptions
  blocks: WorkoutBlock[]
  /** Sportart fürs Eintragen (Schlüssel aus dem Sport-Katalog) */
  activityKind: string
  /** Geplante Dauer in Minuten (aus den Blöcken berechnet) */
  minutes: number
}

const PLACE_EQUIPMENT: Record<Place, readonly Equipment[]> = {
  zuhause: ['koerper', 'matte', 'stuhl'],
  hanteln: ['koerper', 'matte', 'stuhl', 'kurzhanteln'],
  studio: ['koerper', 'matte', 'kurzhanteln', 'langhantel', 'maschine', 'kabelzug', 'bank', 'kettlebell', 'cardio'],
}

/** Reihenfolge der Muskelgruppen je Schwerpunkt – abwechselnd, damit sich Muskeln zwischendurch erholen */
const SLOTS: Record<Exclude<Focus, 'beweglichkeit'>, Muscle[]> = {
  ganzkoerper: ['beine', 'brust', 'ruecken', 'po', 'schultern', 'rumpf', 'arme', 'beine'],
  'beine-po': ['beine', 'po', 'rumpf', 'beine', 'po', 'beine', 'po', 'rumpf'],
  oberkoerper: ['brust', 'ruecken', 'schultern', 'arme', 'rumpf', 'brust', 'ruecken', 'arme'],
  rumpf: ['rumpf', 'ruecken', 'po', 'rumpf', 'ruecken', 'rumpf', 'po', 'rumpf'],
  ausdauer: ['ausdauer', 'beine', 'ausdauer', 'rumpf', 'ausdauer', 'po', 'ausdauer', 'brust'],
}

/** Geschätzte Dauer einer Wiederholungs-Serie in Sekunden */
const SET_SECONDS = 45
const ROUND_BREAK = 60
const TRANSITION = 10

const sideFactor = (e: Exercise) => (e.perSide ? 2 : 1)

/** Dauer eines Blocks in Sekunden */
export function blockSeconds(b: WorkoutBlock): number {
  switch (b.kind) {
    case 'circuit': {
      const round = b.items.reduce((s, i) => s + (i.seconds ?? 0) * sideFactor(i.exercise) + (i.rest ?? 0), 0)
      return b.rounds * round + (b.rounds - 1) * ROUND_BREAK - (b.items.at(-1)?.rest ?? 0)
    }
    case 'sets':
      return b.items.reduce((s, i) => s + (i.sets ?? 1) * (SET_SECONDS * sideFactor(i.exercise) + (i.rest ?? 0)), 0) - (b.items.at(-1)?.rest ?? 0)
    case 'intervals':
      return b.items.reduce((s, i) => s + (i.sets ?? 1) * ((i.seconds ?? 0) + (i.rest ?? 0)), 0)
    default:
      return b.rounds * b.items.reduce((s, i) => s + (i.seconds ?? 0) * sideFactor(i.exercise) + TRANSITION, 0)
  }
}

export function workoutMinutes(blocks: WorkoutBlock[]): number {
  return Math.round(blocks.reduce((s, b) => s + blockSeconds(b), 0) / 60)
}

interface Picker {
  /** Zufällige, noch nicht verwendete Übung – Gewichtung bevorzugt passende Geräte und Schwierigkeit */
  pick: (pool: readonly Exercise[]) => Exercise | null
}

function picker(o: WorkoutOptions, rng: () => number): Picker {
  const used = new Set<string>()
  const weight = (e: Exercise) => {
    let w = 1
    // Im Studio und mit Hanteln die Geräte nutzen, statt nur Körpergewicht
    if (o.place === 'studio' && e.equipment.some((q) => q !== 'koerper' && q !== 'matte')) w *= 3
    if (o.place === 'hanteln' && e.equipment.includes('kurzhanteln')) w *= 3
    if (o.level === 'einsteiger' ? e.level === 1 : e.level >= 2) w *= 2
    return w
  }
  return {
    pick(pool) {
      const free = pool.filter((e) => !used.has(e.key))
      if (!free.length) return null
      const total = free.reduce((s, e) => s + weight(e), 0)
      let r = rng() * total
      for (const e of free) {
        r -= weight(e)
        if (r <= 0) {
          used.add(e.key)
          return e
        }
      }
      const last = free[free.length - 1]
      used.add(last.key)
      return last
    },
  }
}

/** Erzeugt ein Training. Alle Übungen passen zum Ort (Geräte) und zum Level. */
export function generateWorkout(o: WorkoutOptions): Workout {
  const rng = mulberry32(o.seed)
  const allowed = PLACE_EQUIPMENT[o.place]
  const maxLevel = o.level === 'einsteiger' ? 2 : 3
  const usable = EXERCISES.filter((e) => e.equipment.every((q) => allowed.includes(q)) && e.level <= maxLevel)
  const p = picker(o, rng)
  const beginner = o.level === 'einsteiger'
  const short = o.minutes <= 20

  // Aufwärmen: im Studio locker auf einem Ausdauergerät, sonst Bewegungen ohne Geräte
  const warmup: WorkoutItem[] = []
  const warmPool = usable.filter((e) => e.warmup)
  if (o.place === 'studio') {
    const machine = p.pick(warmPool.filter((e) => e.equipment.includes('cardio')))
    if (machine) warmup.push({ exercise: machine, seconds: short ? 120 : 240 })
    for (let i = 0; i < 2; i++) {
      const m = p.pick(warmPool.filter((e) => e.kind === 'mobil'))
      if (m) warmup.push({ exercise: m, seconds: 30 })
    }
  } else {
    const n = short ? 3 : 4
    for (let i = 0; i < n; i++) {
      // abwechselnd lockere Ausdauer und Mobilisation
      const pool = warmPool.filter((e) => !e.equipment.includes('cardio') && (i % 2 === 0 ? e.kind === 'cardio' : e.kind === 'mobil'))
      const m = p.pick(pool.length ? pool : warmPool.filter((e) => !e.equipment.includes('cardio')))
      if (m) warmup.push({ exercise: m, seconds: 40 })
    }
  }
  const warmBlock: WorkoutBlock = { kind: 'warmup', title: 'Aufwärmen', note: 'Locker beginnen, Tempo langsam steigern.', rounds: 1, items: warmup }

  // Abkühlen: Dehnungen
  const coolPool = usable.filter((e) => e.cooldown)
  const cool: WorkoutItem[] = []
  for (let i = 0; i < (short ? 2 : 3); i++) {
    const m = p.pick(coolPool)
    if (m) cool.push({ exercise: m, seconds: 30 })
  }
  const coolBlock: WorkoutBlock = { kind: 'cooldown', title: 'Abkühlen', note: 'Ruhig dehnen – ziehen ja, schmerzen nein.', rounds: 1, items: cool }

  const mainSeconds = Math.max(5 * 60, o.minutes * 60 - blockSeconds(warmBlock) - blockSeconds(coolBlock))
  const main = mainBlock(o, usable, p, mainSeconds, beginner)

  const machine = main.kind === 'intervals' ? main.items[0]?.exercise.key : undefined
  const activityKind =
    o.focus === 'beweglichkeit'
      ? 'dehnen'
      : machine
        ? ({ ergometer: 'indoor-cycling', laufband: 'joggen', rudergeraet: 'rudern', crosstrainer: 'crosstrainer' } as Record<string, string>)[machine] ?? 'hiit'
        : o.focus === 'ausdauer'
          ? 'hiit'
          : 'krafttraining'
  const blocks = [warmBlock, main, coolBlock].filter((b) => b.items.length)
  return {
    title: `${FOCUS_LABELS[o.focus]} ${PLACE_TITLE[o.place]}`,
    options: o,
    blocks,
    activityKind,
    minutes: workoutMinutes(blocks),
  }
}

function mainBlock(o: WorkoutOptions, usable: readonly Exercise[], p: Picker, seconds: number, beginner: boolean): WorkoutBlock {
  // Beweglichkeit: eine ruhige Folge, jede Übung gehalten
  if (o.focus === 'beweglichkeit') {
    const pool = usable.filter((e) => e.kind === 'mobil')
    const base = beginner ? 40 : 60
    const chosen: Exercise[] = []
    let used = 0
    while (used < seconds) {
      const e = p.pick(pool)
      if (!e) break
      chosen.push(e)
      used += base * sideFactor(e) + TRANSITION
    }
    // Reichen die Übungen nicht, wird jede länger gehalten (höchstens 90 Sekunden) – bei viel Zeit in mehreren Durchgängen
    const sides = chosen.reduce((sum, e) => sum + sideFactor(e), 0) || 1
    const oneRound = (h: number) => sides * h + chosen.length * TRANSITION
    const rounds = Math.min(3, Math.max(1, Math.round(seconds / oneRound(90))))
    const hold = Math.min(90, Math.max(base, Math.floor((seconds / rounds - chosen.length * TRANSITION) / sides / 5) * 5))
    return {
      kind: 'flow',
      title: 'Beweglichkeit',
      note: `Jede Übung ${hold} Sekunden halten bzw. ruhig bewegen, tief atmen${rounds > 1 ? ` – ${rounds} Durchgänge` : ''}.`,
      rounds,
      items: chosen.map((e) => ({ exercise: e, seconds: hold })),
    }
  }

  // Ausdauer im Studio: Intervalle auf einem Gerät
  if (o.focus === 'ausdauer' && o.place === 'studio') {
    const machine = p.pick(usable.filter((e) => e.equipment.includes('cardio')))
    if (machine) {
      const work = beginner ? 60 : 90
      const easy = 60
      const sets = Math.max(3, Math.floor(seconds / (work + easy)))
      return {
        kind: 'intervals',
        title: 'Intervalle',
        note: `${sets} × ${work} s zügig, dazwischen ${easy} s locker weiter.`,
        rounds: 1,
        items: [{ exercise: machine, sets, seconds: work, rest: easy }],
      }
    }
  }

  const slots = SLOTS[o.focus]
  // Je Platz zuerst Übungen, deren Haupt-Muskelgruppe passt; nur wenn es keine gibt, auch Nebenmuskeln.
  // Es kommen so lange Übungen dazu, bis die Zeit (je Übung `cost`) gefüllt ist – mindestens drei.
  const chooseUntil = (budget: number, cost: (e: Exercise) => number, filter: (e: Exercise) => boolean, max = 8) => {
    const out: Exercise[] = []
    let used = 0
    for (let i = 0; out.length < max && i < slots.length * 3; i++) {
      const slot = slots[i % slots.length]
      const fits = (x: Exercise) => filter(x) && (slot !== 'ausdauer' || x.kind === 'cardio')
      const e = p.pick(usable.filter((x) => fits(x) && x.muscles[0] === slot)) ?? p.pick(usable.filter((x) => fits(x) && x.muscles.includes(slot)))
      if (!e) continue
      // etwas Spielraum, damit die Zeit nicht deutlich unterschritten wird
      // Passt diese nicht mehr, vielleicht eine kürzere (z. B. ohne Seitenwechsel)
      if (out.length >= 3 && used + cost(e) > budget + Math.min(budget * 0.15, 120)) continue
      out.push(e)
      used += cost(e)
    }
    return out
  }

  // Zirkel: zu Hause ohne Geräte und für Ausdauer – je Übung eine feste Zeit, mehrere Runden
  if (o.place === 'zuhause' || o.focus === 'ausdauer') {
    const work = beginner ? 30 : 40
    const rest = beginner ? 30 : 20
    // Erst die Runden, dann so viele Übungen, dass jede Runde ihren Anteil der Zeit füllt
    const target = o.minutes <= 20 ? 2 : o.minutes <= 30 ? 3 : o.minutes <= 45 ? 4 : 5
    const perRound = (seconds - (target - 1) * ROUND_BREAK + rest) / target
    const filter = (e: Exercise) => e.kind !== 'mobil'
    let chosen = chooseUntil(perRound, (e) => work * sideFactor(e) + rest, filter)
    const roundOf = (list: Exercise[]) => list.reduce((sum, e) => sum + work * sideFactor(e) + rest, 0)
    // Passen die gewünschten Runden nicht ganz, lieber eine Übung weniger als eine Runde weniger
    while (chosen.length > 3 && target * roundOf(chosen) + (target - 1) * ROUND_BREAK - rest > seconds + 90) chosen = chosen.slice(0, -1)
    const round = roundOf(chosen)
    // Rundenzahl, die der gewünschten Zeit am nächsten kommt (höchstens 1,5 Min. darüber)
    const total = (r: number) => r * round + (r - 1) * ROUND_BREAK - rest
    let rounds = 1
    for (let r = 1; r <= target + 1; r++) {
      if (total(r) <= seconds + 90 && Math.abs(total(r) - seconds) < Math.abs(total(rounds) - seconds)) rounds = r
    }
    const sideNote = chosen.some((e) => e.perSide) ? ` Bei Übungen für beide Seiten: ${work} s je Seite.` : ''
    return {
      kind: 'circuit',
      title: 'Zirkel',
      note: `${rounds} ${rounds === 1 ? 'Runde' : 'Runden'}: je ${work} s Übung, ${rest} s Pause${rounds > 1 ? ', 1 Min. Pause nach jeder Runde' : ''}.${sideNote}`,
      rounds,
      items: chosen.map((e) => ({ exercise: e, seconds: work, rest })),
    }
  }

  // Sätze: mit Kurzhanteln und im Studio
  const reps = beginner ? '12–15' : '8–12'
  // Kurze Trainings: kürzere Pausen und höchstens 2 Sätze, damit trotzdem mehrere Übungen hineinpassen
  const short = o.minutes <= 20
  const rest = short ? 45 : beginner ? 60 : 75
  const max = o.minutes >= 60 ? 10 : 8
  let sets = short ? 2 : beginner ? 2 : 3
  // Bei viel Zeit einen Satz mehr, wenn auch die Höchstzahl an Übungen die Zeit nicht füllt
  if (seconds > max * sets * (SET_SECONDS + rest) * 0.85) sets += 1
  const setCost = (e: Exercise) => sets * (SET_SECONDS * sideFactor(e) + rest)
  const chosen = chooseUntil(seconds + rest, setCost, (e) => e.kind !== 'mobil' && !e.equipment.includes('cardio') && !(e.kind === 'cardio' && !e.equipment.includes('kettlebell')), max)
  return {
    kind: 'sets',
    title: 'Krafttraining',
    note: `Je Übung ${sets} Sätze à ${reps} Wiederholungen, ${rest} s Pause. Gewicht so wählen, dass die letzten Wiederholungen fordernd, aber sauber sind.`,
    rounds: 1,
    items: chosen.map((e) =>
      e.timed ? { exercise: e, sets, seconds: beginner ? 30 : 45, rest } : { exercise: e, sets, reps: e.perSide ? `${reps} je Seite` : reps, rest },
    ),
  }
}

// --- Schritt für Schritt (geführtes Training) -----------------------------------------------------------------

export interface WorkoutStep {
  block: string
  exercise: Exercise
  phase: 'work' | 'rest'
  /** Countdown in Sekunden; fehlt, wenn nach Wiederholungen weitergetippt wird */
  seconds?: number
  /** z. B. „Runde 2 von 3“, „Satz 1 von 3 · 8–12 Wdh.“, „Seite 2“ */
  detail: string
  /** In Pausen: was als Nächstes kommt */
  next?: Exercise
}

/** Das Training als Folge von Schritten – Übungen und Pausen, mit Countdowns */
export function workoutSteps(w: Workout): WorkoutStep[] {
  const steps: WorkoutStep[] = []
  const work = (block: string, exercise: Exercise, detail: string, seconds?: number) => {
    if (seconds && exercise.perSide) {
      steps.push({ block, exercise, phase: 'work', seconds, detail: `${detail ? `${detail} · ` : ''}Seite 1` })
      steps.push({ block, exercise, phase: 'work', seconds, detail: `${detail ? `${detail} · ` : ''}Seite 2` })
    } else steps.push({ block, exercise, phase: 'work', seconds, detail })
  }
  const rest = (block: string, seconds: number, next: Exercise | undefined, detail = 'Pause') => {
    if (seconds > 0) steps.push({ block, exercise: next ?? steps[steps.length - 1].exercise, phase: 'rest', seconds, detail, next })
  }
  for (const b of w.blocks) {
    if (b.kind === 'circuit') {
      for (let r = 1; r <= b.rounds; r++) {
        b.items.forEach((item, idx) => {
          work(b.title, item.exercise, `Runde ${r} von ${b.rounds}`, item.seconds)
          const last = idx === b.items.length - 1
          if (!last) rest(b.title, item.rest ?? 0, b.items[idx + 1].exercise)
          else if (r < b.rounds) rest(b.title, ROUND_BREAK, b.items[0].exercise, 'Rundenpause')
        })
      }
    } else if (b.kind === 'sets') {
      b.items.forEach((item, idx) => {
        const n = item.sets ?? 1
        for (let s = 1; s <= n; s++) {
          work(b.title, item.exercise, `Satz ${s} von ${n}${item.reps ? ` · ${item.reps} Wdh.` : ''}`, item.seconds)
          const lastSet = s === n
          const lastItem = idx === b.items.length - 1
          if (!(lastSet && lastItem)) rest(b.title, item.rest ?? 0, lastSet ? b.items[idx + 1].exercise : item.exercise)
        }
      })
    } else if (b.kind === 'intervals') {
      for (const item of b.items) {
        const n = item.sets ?? 1
        for (let s = 1; s <= n; s++) {
          steps.push({ block: b.title, exercise: item.exercise, phase: 'work', seconds: item.seconds, detail: `Intervall ${s} von ${n} · zügig` })
          steps.push({ block: b.title, exercise: item.exercise, phase: 'rest', seconds: item.rest, detail: `Intervall ${s} von ${n} · locker weiter`, next: item.exercise })
        }
      }
    } else {
      for (let r = 1; r <= b.rounds; r++) {
        for (const item of b.items) work(b.title, item.exercise, b.rounds > 1 ? `Durchgang ${r} von ${b.rounds}` : '', item.seconds)
      }
    }
  }
  return steps
}

/** Kurzform der Menge einer Übung, z. B. „40 s“, „3 × 8–12“, „30 s je Seite“ */
export function itemAmount(item: WorkoutItem): string {
  const side = item.exercise.perSide ? ' je Seite' : ''
  if (item.reps) return `${item.sets ?? 1} × ${item.reps}`
  if (item.sets && item.seconds) return `${item.sets} × ${item.seconds} s${side}`
  if (item.seconds) return item.seconds >= 120 ? `${Math.round(item.seconds / 60)} Min.` : `${item.seconds} s${side}`
  return ''
}
