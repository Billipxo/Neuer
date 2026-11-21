import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { useAchievementInput, useAchievementRows, useSaveAchievements, newlyUnlocked } from '../../hooks/achievements'
import type { AchievementDef } from '../../lib/achievements'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'

/** Eine Feier: ein einzelnes Abzeichen oder mehrere auf einmal (z. B. nach einem Update mit neuen Abzeichen) */
type Celebration = { kind: 'one'; def: AchievementDef } | { kind: 'many'; defs: AchievementDef[] }

/** Ab so vielen neuen Abzeichen auf einmal gibt es eine gemeinsame Feier statt vieler einzelner */
const BATCH_FROM = 3

/** Kurz warten, nachdem alles geladen ist – die Seite dahinter zeigt dann schon die neuen Werte */
const SETTLE_MS = 500

/** Prüft im Hintergrund, ob neue Erfolge erreicht wurden, speichert sie und zeigt eine kurze Feier. */
export function AchievementWatcher() {
  const { input } = useAchievementInput()
  const { data: rows, isSuccess } = useAchievementRows()
  const save = useSaveAchievements()
  const [queue, setQueue] = useState<Celebration[]>([])
  const busy = useRef(false)
  const { pathname } = useLocation()
  // Während man etwas erfasst, nicht unterbrechen – die Feier folgt danach
  const quiet =
    pathname.startsWith('/hinzufuegen') ||
    pathname.startsWith('/gerichte') ||
    pathname === '/rezepte/neu' ||
    pathname.endsWith('/abwandeln') ||
    pathname.startsWith('/training/eintragen')

  useEffect(() => {
    if (!input || !isSuccess || !rows || busy.current) return
    const fresh = newlyUnlocked(input, rows.map((r) => r.key))
    if (!fresh.length) return
    busy.current = true
    save
      .mutateAsync(fresh.map((f) => f.key))
      .then(() =>
        setQueue((q) => [...q, ...(fresh.length >= BATCH_FROM ? [{ kind: 'many' as const, defs: fresh }] : fresh.map((def) => ({ kind: 'one' as const, def })))]),
      )
      .catch(() => {})
      .finally(() => {
        busy.current = false
      })
  }, [input, rows, isSuccess, save])

  // Erst feiern, wenn die Seite fertig aktualisiert ist – sonst stünden dahinter noch die alten Werte (z. B. 0 kcal)
  const busyLoading = useIsFetching() + useIsMutating() > 0
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (visible || !queue.length || quiet || busyLoading) return
    const t = setTimeout(() => setVisible(true), SETTLE_MS)
    return () => clearTimeout(t)
  }, [visible, queue.length, quiet, busyLoading])
  useEffect(() => {
    if (quiet) setVisible(false)
  }, [quiet])

  const current = visible && !quiet ? queue[0] : undefined
  const next = () => {
    if (queue.length <= 1) setVisible(false)
    setQueue((q) => q.slice(1))
  }
  const more = queue.length > 1
  return (
    <Sheet open={!!current} onClose={next} title={current?.kind === 'many' ? 'Neue Abzeichen' : 'Neues Abzeichen'}>
      {current && (
        <div className="relative pb-2 text-center" role="status">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex justify-center gap-16 text-xl">
            {['✨', '🎉', '✨'].map((s, i) => (
              <span key={i} className="animate-fade-up" style={{ animationDelay: `${i * 120}ms` }}>
                {s}
              </span>
            ))}
          </div>
          {current.kind === 'one' ? (
            <>
              <div
                key={current.def.key}
                aria-hidden
                className="mx-auto mt-6 flex size-28 items-center justify-center rounded-full bg-brand-soft text-6xl shadow-inner animate-pop"
              >
                {current.def.emoji}
              </div>
              <h3 className="mt-4 text-xl font-bold">{current.def.title}</h3>
              <p className="mt-1 text-muted">{current.def.praise}</p>
            </>
          ) : (
            <>
              <h3 className="mt-8 text-xl font-bold">{current.defs.length} neue Abzeichen</h3>
              <p className="mt-1 text-muted">Schau mal, was du schon alles geschafft hast:</p>
              <ul className="mt-4 space-y-2 text-left" aria-label="Neu erreicht">
                {current.defs.slice(0, 8).map((d) => (
                  <li key={d.key} className="flex items-center gap-3 rounded-2xl bg-brand-soft/60 px-3 py-2">
                    <span aria-hidden className="text-2xl">
                      {d.emoji}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-tight">{d.title}</span>
                      <span className="block text-xs text-muted">{d.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {current.defs.length > 8 && <p className="mt-2 text-sm text-muted">und {current.defs.length - 8} weitere</p>}
              <Link to="/erfolge" onClick={next} className="mt-4 inline-block text-sm font-semibold text-brand">
                Alle Erfolge ansehen
              </Link>
            </>
          )}
          <Button className="mt-6" size="lg" block onClick={next}>
            {more ? 'Weiter' : 'Danke!'}
          </Button>
        </div>
      )}
    </Sheet>
  )
}
