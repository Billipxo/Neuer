import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, PartyPopper, Sun, Timer, X } from 'lucide-react'
import { getRecipe, hasAirfryerVariant, recipeEmoji, recipeSteps, scaleIngredients } from '../lib/recipes'
import { ingredientsInStep, parseTimers } from '../lib/cooking'
import { formatQuantity } from '../lib/shopping'
import { useTimers } from '../app/timers'
import { useWakeLock } from '../hooks/useWakeLock'
import { Button, IconButton } from '../components/ui/Button'
import { Sheet } from '../components/ui/Sheet'
import { NumberInput } from '../components/ui/NumberInput'
import { AirfryerIcon } from '../components/recipes/AirfryerIcon'
import { AddRecipeSheet } from '../components/recipes/AddRecipeSheet'
import { useToast } from '../components/ui/Toast'

const PRESETS = [1, 3, 5, 10, 15, 20, 30, 45]

export function CookModePage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const recipe = getRecipe(id)
  const servings = Math.max(1, Number(params.get('portionen')) || recipe?.servings || 1)
  const method: 'airfryer' | 'oven' = params.get('methode') === 'oven' ? 'oven' : 'airfryer'
  const storageKey = `teller-cook-${id}`

  const [idx, setIdx] = useState(() => {
    try {
      return Number(sessionStorage.getItem(storageKey)) || 0
    } catch {
      return 0
    }
  })
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [timerOpen, setTimerOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const { start, timers } = useTimers()
  const toast = useToast()
  const wake = useWakeLock(true)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const steps = useMemo(() => (recipe ? recipeSteps(recipe, hasAirfryerVariant(recipe) ? method : 'airfryer') : []), [recipe, method])
  const ingredients = useMemo(() => (recipe ? scaleIngredients(recipe, servings) : []), [recipe, servings])
  const last = steps.length + 1 // 0 = Zutaten, 1..n = Schritte, n+1 = Fertig
  const current = Math.min(idx, last)

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, String(current))
    } catch {
      /* egal */
    }
    headingRef.current?.focus()
  }, [current, storageKey])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(i + 1, last))
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last])

  if (!recipe) return <Navigate to="/rezepte" replace />

  const step = current >= 1 && current <= steps.length ? steps[current - 1] : null
  const stepTimers = step ? parseTimers(step) : []
  const stepIngredients = step ? ingredientsInStep(step, ingredients) : []
  const usesAirfryer = Boolean(recipe.airfryer) && (!hasAirfryerVariant(recipe) || method === 'airfryer')
  const exit = () => {
    try {
      sessionStorage.removeItem(storageKey)
    } catch {
      /* egal */
    }
    navigate(`/rezepte/${recipe.id}`)
  }
  const startTimer = (label: string, seconds: number, short: string) => {
    start(label, seconds, recipe.id)
    toast(`Timer läuft: ${short}`, '⏱️')
  }

  return (
    <div
      className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 safe-top"
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        if (!touch.current) return
        const dx = e.changedTouches[0].clientX - touch.current.x
        const dy = e.changedTouches[0].clientY - touch.current.y
        touch.current = null
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) setIdx((i) => Math.max(0, Math.min(last, i + (dx < 0 ? 1 : -1))))
      }}
    >
      <header className="sticky top-0 z-20 -mx-4 flex items-center gap-1 bg-bg/95 px-4 pb-2 pt-3 backdrop-blur safe-top">
        <IconButton label="Kochmodus beenden" onClick={exit} className="-ml-2">
          <X className="size-6" />
        </IconButton>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{recipe.title}</p>
          <p className="truncate text-xs text-muted">
            {servings} Portion{servings === 1 ? '' : 'en'}
            {wake.locked && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Sun className="size-3" aria-hidden /> Display bleibt an
              </span>
            )}
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={<Timer className="size-4" aria-hidden />} onClick={() => setTimerOpen(true)}>
          Timer
        </Button>
      </header>

      <div className="mt-1 flex gap-1" aria-hidden>
        {Array.from({ length: last + 1 }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= current ? 'bg-brand' : 'bg-surface-2'}`} />
        ))}
      </div>

      <main key={current} className="flex-1 animate-fade-up py-6" aria-live="polite">
        {current === 0 && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
              Zutaten bereitlegen
            </h1>
            <p className="mt-1 text-muted">Alles abwiegen und vorbereiten – dann geht das Kochen entspannt.</p>
            {usesAirfryer && recipe.airfryer && (
              <p className="mt-4 flex items-center gap-2 rounded-2xl bg-brand-soft/60 p-3 text-sm">
                <AirfryerIcon className="size-5 shrink-0 text-brand" />
                Heißluftfritteuse: {recipe.airfryer.temp_c} °C, ca. {recipe.airfryer.time_min} Min. – viele Geräte brauchen 3 Minuten zum Vorheizen.
              </p>
            )}
            <ul className="mt-4 divide-y divide-line/70 rounded-3xl bg-surface px-2 ring-1 ring-line/60">
              {ingredients.map((ing, i) => {
                const on = checked.has(i)
                return (
                  <li key={i}>
                    <label className="flex min-h-13 cursor-pointer items-center gap-3 px-2 py-2.5">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={on}
                        onChange={() =>
                          setChecked((s) => {
                            const n = new Set(s)
                            if (n.has(i)) n.delete(i)
                            else n.add(i)
                            return n
                          })
                        }
                      />
                      <span
                        aria-hidden
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand ${
                          on ? 'border-brand bg-brand text-brand-ink' : 'border-line'
                        }`}
                      >
                        {on && <Check className="size-4" strokeWidth={3} />}
                      </span>
                      <span className={`min-w-0 flex-1 ${on ? 'text-muted line-through' : ''}`}>
                        <span className="text-lg">{ing.name}</span>
                        {ing.note && <span className="block text-sm text-muted">{ing.note}</span>}
                      </span>
                      <span className="shrink-0 text-base font-semibold tabular">{formatQuantity(ing.amount, ing.unit)}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        {step && (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">
              Schritt {current} von {steps.length}
            </p>
            <h1 ref={headingRef} tabIndex={-1} className="mt-3 text-2xl font-medium leading-snug outline-none sm:text-3xl">
              {step}
            </h1>
            {stepTimers.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {stepTimers.map((t) => {
                  const label = `Schritt ${current} · ${t.label} · ${recipe.title}`
                  const running = timers.some((x) => x.label === label && !x.done)
                  return (
                    <Button
                      key={t.seconds}
                      size="lg"
                      variant={running ? 'secondary' : 'primary'}
                      icon={<Timer className="size-5" aria-hidden />}
                      disabled={running}
                      onClick={() => startTimer(label, t.seconds, t.label)}
                    >
                      {running ? `${t.label} läuft` : `${t.label} Timer`}
                    </Button>
                  )
                })}
              </div>
            )}
            {stepIngredients.length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-semibold text-muted">Zutaten in diesem Schritt</h2>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {stepIngredients.map((i) => (
                    <li key={i} className="rounded-full bg-surface px-3 py-1.5 text-sm ring-1 ring-line">
                      <span className="font-semibold tabular">{formatQuantity(ingredients[i].amount, ingredients[i].unit)}</span>{' '}
                      {ingredients[i].name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {current === last && (
          <div className="flex flex-col items-center pt-8 text-center">
            <span aria-hidden className="text-7xl animate-pop">
              {recipeEmoji(recipe)}
            </span>
            <h1 ref={headingRef} tabIndex={-1} className="mt-4 flex items-center gap-2 text-2xl font-bold outline-none">
              <PartyPopper className="size-6 text-brand" aria-hidden /> Guten Appetit!
            </h1>
            <p className="mt-2 text-muted">Schön, dass du selbst gekocht hast.</p>
            <div className="mt-8 w-full space-y-2">
              <Button block size="lg" onClick={() => setAddOpen(true)}>
                Als gegessen eintragen
              </Button>
              <Button block size="lg" variant="secondary" onClick={exit}>
                Zur Rezeptseite
              </Button>
            </div>
          </div>
        )}
      </main>

      {current < last && (
        <nav className="safe-bottom sticky bottom-0 -mx-4 flex gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur" aria-label="Schritte">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            disabled={current === 0}
            icon={<ChevronLeft className="size-5" aria-hidden />}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
          >
            Zurück
          </Button>
          <Button size="lg" className="flex-[2]" onClick={() => setIdx((i) => Math.min(last, i + 1))}>
            {current === 0 ? 'Los geht’s' : current === steps.length ? 'Fertig' : 'Weiter'}
            <ChevronRight className="size-5" aria-hidden />
          </Button>
        </nav>
      )}

      <ManualTimerSheet open={timerOpen} onClose={() => setTimerOpen(false)} onStart={(min) => startTimer(`${min} Min. · ${recipe.title}`, min * 60, `${min} Min.`)} />
      <AddRecipeSheet recipe={recipe} open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

function ManualTimerSheet({ open, onClose, onStart }: { open: boolean; onClose: () => void; onStart: (minutes: number) => void }) {
  const [custom, setCustom] = useState<number | null>(null)
  return (
    <Sheet open={open} onClose={onClose} title="Timer stellen">
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((m) => (
          <Button
            key={m}
            variant="secondary"
            size="lg"
            onClick={() => {
              onStart(m)
              onClose()
            }}
          >
            {m} Min.
          </Button>
        ))}
      </div>
      <form
        className="mt-4 flex items-end gap-2 pb-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!custom || custom <= 0) return
          onStart(Math.round(custom))
          setCustom(null)
          onClose()
        }}
      >
        <NumberInput className="flex-1" label="Eigene Dauer" suffix="Min." value={custom} min={0} max={600} onChange={setCustom} />
        <Button type="submit" size="lg" disabled={!custom}>
          Starten
        </Button>
      </form>
      <p className="mt-2 text-xs text-muted">Läuft weiter, auch wenn du die Seite wechselst. Ton und Vibration funktionieren, solange die App geöffnet ist.</p>
    </Sheet>
  )
}
