import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAchievementInput, useAchievementRows, useSaveAchievements, newlyUnlocked } from '../../hooks/achievements'
import type { AchievementDef } from '../../lib/achievements'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'

/** Prüft im Hintergrund, ob neue Erfolge erreicht wurden, speichert sie und zeigt eine kurze Feier. */
export function AchievementWatcher() {
  const { input } = useAchievementInput()
  const { data: rows, isSuccess } = useAchievementRows()
  const save = useSaveAchievements()
  const [queue, setQueue] = useState<AchievementDef[]>([])
  const busy = useRef(false)
  const { pathname } = useLocation()
  // Während man Lebensmittel erfasst, nicht unterbrechen – die Feier folgt danach
  const quiet = pathname.startsWith('/hinzufuegen') || pathname.startsWith('/gerichte')

  useEffect(() => {
    if (!input || !isSuccess || !rows || busy.current) return
    const fresh = newlyUnlocked(input, rows.map((r) => r.key))
    if (!fresh.length) return
    busy.current = true
    save
      .mutateAsync(fresh.map((f) => f.key))
      .then(() => setQueue((q) => [...q, ...fresh]))
      .catch(() => {})
      .finally(() => {
        busy.current = false
      })
  }, [input, rows, isSuccess, save])

  const current = quiet ? undefined : queue[0]
  return (
    <Sheet open={!!current} onClose={() => setQueue((q) => q.slice(1))} title="Neues Abzeichen">
      {current && (
        <div className="relative pb-2 text-center" role="status">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex justify-center gap-16 text-xl">
            {['✨', '🎉', '✨'].map((s, i) => (
              <span key={i} className="animate-fade-up" style={{ animationDelay: `${i * 120}ms` }}>
                {s}
              </span>
            ))}
          </div>
          <div
            key={current.key}
            aria-hidden
            className="mx-auto mt-6 flex size-28 items-center justify-center rounded-full bg-brand-soft text-6xl shadow-inner animate-pop"
          >
            {current.emoji}
          </div>
          <h3 className="mt-4 text-xl font-bold">{current.title}</h3>
          <p className="mt-1 text-muted">{current.praise}</p>
          <Button className="mt-6" size="lg" block onClick={() => setQueue((q) => q.slice(1))}>
            {queue.length > 1 ? 'Weiter' : 'Danke!'}
          </Button>
        </div>
      )}
    </Sheet>
  )
}
