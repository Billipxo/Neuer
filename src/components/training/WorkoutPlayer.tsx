import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import type { Workout } from '../../lib/workouts'
import { workoutSteps } from '../../lib/workouts'
import { beep, unlockAudio, vibrate } from '../../lib/sound'
import { useWakeLock } from '../../hooks/useWakeLock'
import { Button } from '../ui/Button'

function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Geführtes Training: eine Übung bzw. Pause nach der anderen, mit Countdown. Zeitangaben laufen von selbst weiter
 * (mit kurzem Ton und Vibration), Wiederholungen werden mit „Weiter“ abgeschlossen.
 */
export function WorkoutPlayer({
  workout,
  onClose,
  onFinish,
  canLog,
}: {
  workout: Workout
  onClose: () => void
  /** „Als Sport eintragen“ mit der tatsächlichen Dauer in Minuten */
  onFinish: (minutes: number) => void
  /** Sport-Tagebuch eingerichtet? */
  canLog: boolean
}) {
  const steps = useMemo(() => workoutSteps(workout), [workout])
  const titleId = useId()
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [paused, setPaused] = useState(false)
  // Ende des laufenden Countdowns als Zeitpunkt – so stimmt die Zeit auch, wenn der Browser kurz bremst
  const [endsAt, setEndsAt] = useState<number | null>(() => (steps[0]?.seconds ? Date.now() + steps[0].seconds * 1000 : null))
  const [pausedLeft, setPausedLeft] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const startedAt = useRef(Date.now())
  const warned = useRef(-1)
  useWakeLock(!done)

  const step = steps[index]
  const remaining = paused ? pausedLeft : endsAt !== null ? (endsAt - now) / 1000 : null

  const go = useCallback(
    (i: number) => {
      if (i >= steps.length) {
        setDone(true)
        beep(2, 660, 0.4)
        vibrate([200, 100, 200])
        return
      }
      const next = steps[Math.max(0, i)]
      setIndex(Math.max(0, i))
      setPaused(false)
      setPausedLeft(null)
      warned.current = -1
      setNow(Date.now())
      setEndsAt(next.seconds ? Date.now() + next.seconds * 1000 : null)
    },
    [steps],
  )

  // Countdown: viermal pro Sekunde prüfen; in den letzten 3 Sekunden kurz piepen, am Ende weiter
  useEffect(() => {
    if (done || paused || endsAt === null) return
    const t = setInterval(() => {
      const left = (endsAt - Date.now()) / 1000
      setNow(Date.now())
      const whole = Math.ceil(left)
      if (whole <= 3 && whole >= 1 && warned.current !== whole) {
        warned.current = whole
        beep(1, 880, 0.12)
      }
      if (left <= 0) {
        vibrate(150)
        go(index + 1)
      }
    }, 250)
    return () => clearInterval(t)
  }, [done, paused, endsAt, index, go])

  function togglePause() {
    if (endsAt === null) return
    if (paused) {
      setEndsAt(Date.now() + (pausedLeft ?? 0) * 1000)
      setPaused(false)
    } else {
      setPausedLeft(Math.max(0, (endsAt - Date.now()) / 1000))
      setPaused(true)
    }
  }

  function close() {
    if (!done && index > 0 && !window.confirm('Training beenden?')) return
    onClose()
  }

  const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000))
  const progress = done ? 100 : Math.round((index / steps.length) * 100)

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="fixed inset-0 z-50 flex flex-col bg-bg safe-top">
      <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 pt-3">
        <button
          type="button"
          onClick={close}
          aria-label="Training schließen"
          className="flex size-11 items-center justify-center rounded-full bg-surface ring-1 ring-line"
        >
          <X className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <p id={titleId} className="truncate text-sm font-semibold">
            {workout.title}
          </p>
          <p className="text-xs text-muted">{done ? 'Fertig' : `${step.block} · Schritt ${index + 1} von ${steps.length}`}</p>
        </div>
      </div>
      <div className="mx-auto mt-3 h-1.5 w-full max-w-lg px-4">
        <div className="h-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Fortschritt">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {done ? (
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-5xl" aria-hidden>
            💪
          </p>
          <h2 className="text-2xl font-bold">Geschafft!</h2>
          <p className="text-muted">{minutes} Minuten trainiert.</p>
          {canLog ? (
            <Button size="lg" block onClick={() => onFinish(minutes)}>
              Als Sport eintragen
            </Button>
          ) : (
            <p className="text-sm text-muted">Zum Eintragen fehlt noch das Datenbank-Update für Sport (setup-teil-4.sql).</p>
          )}
          <Button variant="secondary" block onClick={onClose}>
            Schließen
          </Button>
        </div>
      ) : (
        <>
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-2 overflow-y-auto px-6 text-center">
            <p className={`text-sm font-semibold uppercase tracking-wide ${step.phase === 'rest' ? 'text-muted' : 'text-brand'}`}>
              {step.phase === 'rest' ? (step.detail.includes('locker') ? 'Locker weiter' : 'Pause') : 'Los geht’s'}
            </p>
            <h2 className="text-3xl font-bold leading-tight" aria-live="polite">
              {step.phase === 'rest' && step.next ? `Gleich: ${step.next.name}` : step.exercise.name}
            </h2>
            {step.detail && <p className="text-muted">{step.detail}</p>}
            {remaining !== null ? (
              <p className="my-4 text-7xl font-bold tabular-nums" aria-label={`Noch ${Math.ceil(remaining)} Sekunden`}>
                {clock(remaining)}
              </p>
            ) : (
              <p className="my-4 rounded-2xl bg-surface-2 px-4 py-3 text-sm">Wiederholungen machen – dann auf „Weiter“ tippen.</p>
            )}
            {step.phase === 'work' && (
              <ul className="space-y-1 text-left text-sm text-muted">
                {step.exercise.cues.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="safe-bottom mx-auto grid w-full max-w-lg grid-cols-3 gap-2 px-4 pb-4">
            <Button variant="secondary" size="lg" disabled={index === 0} icon={<ChevronLeft className="size-5" aria-hidden />} onClick={() => go(index - 1)}>
              Zurück
            </Button>
            <Button
              variant="secondary"
              size="lg"
              disabled={endsAt === null}
              icon={paused ? <Play className="size-5" aria-hidden /> : <Pause className="size-5" aria-hidden />}
              onClick={togglePause}
            >
              {paused ? 'Fortsetzen' : 'Pause'}
            </Button>
            <Button
              size="lg"
              icon={<ChevronRight className="size-5" aria-hidden />}
              onClick={() => {
                unlockAudio()
                go(index + 1)
              }}
            >
              Weiter
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
