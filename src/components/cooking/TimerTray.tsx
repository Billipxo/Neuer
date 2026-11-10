import { Link } from 'react-router-dom'
import { BellRing, Timer, X } from 'lucide-react'
import { useTimers } from '../../app/timers'
import { fmtCountdown } from '../../lib/cooking'

/** Laufende und abgelaufene Küchen-Timer – auf allen Seiten sichtbar */
export function TimerTray() {
  const { timers, now, cancel, extend, dismiss } = useTimers()
  if (!timers.length) return null
  const sorted = [...timers].sort((a, b) => Number(b.done) - Number(a.done) || a.endsAt - b.endsAt)
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex flex-col items-center gap-2 px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
      aria-label="Küchen-Timer"
    >
      {sorted.map((t) => {
        const left = t.endsAt - now
        const pct = t.durationMs > 0 ? Math.min(100, Math.max(0, (1 - left / t.durationMs) * 100)) : 100
        return (
          <div
            key={t.id}
            role={t.done ? 'alert' : 'status'}
            className={`pointer-events-auto relative flex w-full max-w-lg items-center gap-2 overflow-hidden rounded-2xl py-1.5 pl-3 pr-1.5 shadow-lg animate-fade-up ${
              t.done ? 'bg-over text-white' : 'bg-ink text-bg'
            }`}
          >
            {!t.done && (
              <span aria-hidden className="absolute inset-y-0 left-0 bg-white/10 transition-[width] duration-1000" style={{ width: `${pct}%` }} />
            )}
            {t.done ? (
              <BellRing className="relative size-5 shrink-0 animate-[pop_0.6s_ease-in-out_infinite_alternate]" aria-hidden />
            ) : (
              <Timer className="relative size-5 shrink-0" aria-hidden />
            )}
            <span className="relative min-w-0 flex-1">
              {t.recipeId ? (
                <Link to={`/rezepte/${t.recipeId}/kochen`} className="block truncate text-sm font-medium underline-offset-2 hover:underline">
                  {t.label}
                </Link>
              ) : (
                <span className="block truncate text-sm font-medium">{t.label}</span>
              )}
            </span>
            {t.done ? (
              <>
                <span className="relative text-sm font-bold">Fertig!</span>
                <button
                  type="button"
                  onClick={() => extend(t.id, 60)}
                  className="relative min-h-9 rounded-xl px-2 text-sm font-semibold hover:bg-white/15"
                  aria-label={`${t.label}: eine Minute verlängern`}
                >
                  +1 Min.
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="relative min-h-9 rounded-xl bg-white/20 px-3 text-sm font-bold hover:bg-white/30"
                >
                  OK
                </button>
              </>
            ) : (
              <>
                <span className="relative text-base font-bold tabular" aria-label={`noch ${fmtCountdown(left)}`}>
                  {fmtCountdown(left)}
                </span>
                <button
                  type="button"
                  onClick={() => extend(t.id, 60)}
                  className="relative min-h-9 rounded-xl px-2 text-sm font-semibold hover:bg-white/10"
                  aria-label={`${t.label}: eine Minute verlängern`}
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => cancel(t.id)}
                  className="relative flex size-9 items-center justify-center rounded-xl hover:bg-white/10"
                  aria-label={`${t.label}: Timer abbrechen`}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
