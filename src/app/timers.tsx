import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export interface KitchenTimer {
  id: string
  label: string
  /** Rezept, zu dem der Timer gehört (für den Link zurück) */
  recipeId?: string
  endsAt: number
  durationMs: number
  /** Abgelaufen und noch nicht bestätigt */
  done: boolean
}

interface TimerApi {
  timers: KitchenTimer[]
  now: number
  start: (label: string, seconds: number, recipeId?: string) => void
  cancel: (id: string) => void
  extend: (id: string, seconds: number) => void
  dismiss: (id: string) => void
}

const KEY = 'teller-timers'
const TimerCtx = createContext<TimerApi | null>(null)

function load(): KitchenTimer[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as KitchenTimer[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

let audioCtx: AudioContext | null = null

/** Audio muss durch eine Nutzeraktion freigeschaltet werden – beim Start eines Timers aufrufen */
function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    audioCtx ??= new AC()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
  } catch {
    /* kein Ton möglich */
  }
}

/** Drei kurze Pieptöne */
function beep() {
  try {
    if (!audioCtx) return
    const t0 = audioCtx.currentTime
    for (let i = 0; i < 3; i++) {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      const start = t0 + i * 0.35
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25)
      osc.connect(gain).connect(audioCtx.destination)
      osc.start(start)
      osc.stop(start + 0.3)
    }
  } catch {
    /* ignorieren */
  }
}

function notify(label: string) {
  // Vibration ist nur nach einer Nutzeraktion erlaubt
  const activated = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true
  if (activated) navigator.vibrate?.([300, 150, 300, 150, 300])
  beep()
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      new Notification('Timer abgelaufen', { body: label, icon: '/pwa-192x192.png', tag: `timer-${label}` })
    }
  } catch {
    /* Benachrichtigungen nicht verfügbar */
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<KitchenTimer[]>(load)
  const [now, setNow] = useState(() => Date.now())
  const timersRef = useRef(timers)
  timersRef.current = timers

  // Speichern
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(timers))
    } catch {
      /* egal */
    }
  }, [timers])

  // Takt nur, solange ein Timer läuft
  const running = timers.some((t) => !t.done)
  useEffect(() => {
    if (!running) return
    const tick = () => {
      const n = Date.now()
      setNow(n)
      const finished = timersRef.current.filter((t) => !t.done && t.endsAt <= n)
      if (finished.length) {
        finished.forEach((t) => notify(t.label))
        setTimers((list) => list.map((t) => (finished.some((f) => f.id === t.id) ? { ...t, done: true } : t)))
      }
    }
    tick()
    const id = window.setInterval(tick, 1000)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [running])

  const start = useCallback((label: string, seconds: number, recipeId?: string) => {
    unlockAudio()
    // Einmalig fragen, ob bei abgelaufenem Timer benachrichtigt werden darf
    try {
      if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
    } catch {
      /* egal */
    }
    const ms = seconds * 1000
    setNow(Date.now())
    setTimers((list) => [
      ...list,
      { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, label, recipeId, endsAt: Date.now() + ms, durationMs: ms, done: false },
    ])
  }, [])

  const cancel = useCallback((id: string) => setTimers((list) => list.filter((t) => t.id !== id)), [])
  const dismiss = cancel
  const extend = useCallback(
    (id: string, seconds: number) =>
      setTimers((list) =>
        list.map((t) =>
          t.id === id
            ? { ...t, endsAt: Math.max(t.endsAt, Date.now()) + seconds * 1000, durationMs: t.durationMs + seconds * 1000, done: false }
            : t,
        ),
      ),
    [],
  )

  const value = useMemo(() => ({ timers, now, start, cancel, extend, dismiss }), [timers, now, start, cancel, extend, dismiss])
  return <TimerCtx.Provider value={value}>{children}</TimerCtx.Provider>
}

export function useTimers(): TimerApi {
  const ctx = useContext(TimerCtx)
  if (!ctx) throw new Error('useTimers außerhalb des TimerProvider')
  return ctx
}
