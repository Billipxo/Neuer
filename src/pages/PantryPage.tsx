import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageCheck, Plus, Search, ShoppingBasket, X } from 'lucide-react'
import { matchesDiet, RECIPES, recipeEmoji } from '../lib/recipes'
import { useVariantRecipes } from '../hooks/variants'
import { useProfile } from '../hooks/data'
import { choicesFromShopping, matchRecipes, missingIngredients, pantryChoices, type PantryMatch } from '../lib/pantry'
import { fmtInt } from '../lib/format'
import { useAddToShopping, useShoppingItems } from '../hooks/shopping'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Switch } from '../components/ui/Switch'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { recipeGradient } from '../components/recipes/RecipeCard'

const KEY = 'teller-pantry'
const CHOICES = pantryChoices(RECIPES)
const BASICS = new Set(['Zwiebeln', 'Knoblauch'])

interface Saved {
  have: string[]
  assumeBasics: boolean
}

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Saved | null
    if (s && Array.isArray(s.have)) return { have: s.have, assumeBasics: s.assumeBasics ?? true }
  } catch {
    /* egal */
  }
  return { have: [], assumeBasics: true }
}

export function PantryPage() {
  const [state, setState] = useState<Saved>(load)
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const { data: shopping = [] } = useShoppingItems()
  const { data: profile } = useProfile()
  const { recipes: ownRecipes, shared } = useVariantRecipes()
  const toast = useToast()

  const update = (next: Saved) => {
    setState(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* egal */
    }
  }
  const toggle = (name: string) =>
    update({ ...state, have: state.have.includes(name) ? state.have.filter((h) => h !== name) : [...state.have, name] })

  const q = query.trim().toLowerCase()
  const suggestions = useMemo(() => {
    const free = CHOICES.filter((c) => !state.have.includes(c.name) && !(state.assumeBasics && BASICS.has(c.name)))
    return q ? free.filter((c) => c.name.toLowerCase().includes(q)) : free.slice(0, 24)
  }, [q, state.have, state.assumeBasics])

  const matches = useMemo(
    () => matchRecipes([...ownRecipes, ...shared, ...RECIPES].filter((r) => matchesDiet(r, profile?.diet, profile?.avoid)), state.have, { assumeBasics: state.assumeBasics }),
    [state, profile?.diet, profile?.avoid, ownRecipes, shared],
  )
  const complete = matches.filter((m) => m.missing.length === 0)
  const almost = matches.filter((m) => m.missing.length > 0 && m.missing.length <= 2)
  const rest = matches.filter((m) => m.missing.length > 2)
  const fromStock = choicesFromShopping(shopping, CHOICES.map((c) => c.name)).filter((c) => !state.have.includes(c))

  return (
    <>
      <PageHeader title="Was habe ich da?" subtitle="Rezepte passend zu deinen Zutaten" back="/rezepte" />

      <section aria-labelledby="have-title" className="rounded-3xl bg-surface p-4 ring-1 ring-line/60">
        <h2 id="have-title" className="font-semibold">
          Deine Zutaten {state.have.length > 0 && <span className="text-muted">({state.have.length})</span>}
        </h2>
        {state.have.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Tippe unten an, was du im Kühlschrank oder Vorrat hast.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Ausgewählte Zutaten">
            {state.have.map((h) => (
              <li key={h}>
                <button
                  type="button"
                  onClick={() => toggle(h)}
                  aria-label={`${h} entfernen`}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full bg-brand px-3 text-sm font-medium text-brand-ink transition active:scale-95"
                >
                  {h} <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="pantry-search" className="sr-only">
            Zutat suchen
          </label>
          <input
            id="pantry-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zutat suchen, z. B. Eier"
            className="min-h-12 w-full rounded-2xl bg-surface-2 pl-11 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={q ? 'Passende Zutaten' : 'Häufige Zutaten'}>
          {(showAll || q ? suggestions : suggestions.slice(0, 16)).map((c) => (
            <li key={c.name}>
              <button
                type="button"
                onClick={() => {
                  toggle(c.name)
                  setQuery('')
                }}
                className="inline-flex min-h-9 items-center gap-1 rounded-full bg-surface-2 px-3 text-sm transition hover:bg-line/70 active:scale-95"
              >
                <Plus className="size-3.5 text-muted" aria-hidden /> {c.name}
              </button>
            </li>
          ))}
          {!q && !showAll && suggestions.length > 16 && (
            <li>
              <button type="button" onClick={() => setShowAll(true)} className="min-h-9 rounded-full px-3 text-sm font-semibold text-brand">
                Mehr anzeigen
              </button>
            </li>
          )}
        </ul>
        {q && suggestions.length === 0 && <p className="mt-2 text-sm text-muted">Keine passende Zutat in den Rezepten.</p>}

        {fromStock.length > 0 && (
          <Button
            variant="secondary"
            block
            className="mt-4"
            icon={<PackageCheck className="size-4" aria-hidden />}
            onClick={() => update({ ...state, have: [...state.have, ...fromStock] })}
          >
            Vorrat aus der Einkaufsliste übernehmen ({fromStock.length})
          </Button>
        )}
        <div className="mt-4 border-t border-line/60 pt-4">
          <Switch
            label="Zwiebeln & Knoblauch habe ich immer"
            description="Salz, Öl und Gewürze werden ohnehin nicht mitgezählt."
            checked={state.assumeBasics}
            onChange={(v) => update({ ...state, assumeBasics: v })}
          />
        </div>
        {state.have.length > 0 && (
          <button type="button" onClick={() => update({ ...state, have: [] })} className="mt-3 min-h-9 text-sm font-semibold text-muted hover:text-ink">
            Auswahl leeren
          </button>
        )}
      </section>

      <div aria-live="polite">
        {state.have.length > 0 && matches.length === 0 && (
          <EmptyState title="Noch kein passendes Rezept" text="Wähle weitere Zutaten aus, dann wird es spannend." />
        )}
        <MatchSection title="Alles da" subtitle="Kannst du sofort kochen" items={complete} />
        <MatchSection title="Fast alles da" subtitle="Es fehlen höchstens zwei Zutaten" items={almost} onAddMissing={toast} />
        <MatchSection title="Weitere Ideen" items={rest.slice(0, 15)} onAddMissing={toast} />
      </div>
    </>
  )
}

function MatchSection({
  title,
  subtitle,
  items,
  onAddMissing,
}: {
  title: string
  subtitle?: string
  items: PantryMatch[]
  onAddMissing?: (text: string, emoji?: string) => void
}) {
  if (!items.length) return null
  return (
    <section className="mt-6" aria-label={title}>
      <h2 className="px-1 font-semibold">
        {title} <span className="text-muted">({items.length})</span>
      </h2>
      {subtitle && <p className="px-1 text-sm text-muted">{subtitle}</p>}
      <ul className="mt-3 space-y-2">
        {items.map((m) => (
          <MatchRow key={m.recipe.id} match={m} onAddMissing={onAddMissing} />
        ))}
      </ul>
    </section>
  )
}

function MatchRow({ match: m, onAddMissing }: { match: PantryMatch; onAddMissing?: (text: string, emoji?: string) => void }) {
  const add = useAddToShopping()
  const total = m.have.length + m.missing.length
  return (
    <li className="rounded-3xl bg-surface p-3 ring-1 ring-line/60">
      <Link to={`/rezepte/${m.recipe.id}`} className="flex items-center gap-3">
        <span aria-hidden className={`flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl ${recipeGradient(m.recipe)}`}>
          {recipeEmoji(m.recipe)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block font-semibold leading-snug">{m.recipe.title}</span>
          <span className="mt-0.5 block text-xs text-muted tabular">
            {fmtInt(m.recipe.nutrition.kcal)} kcal · {m.recipe.time_min} Min. · {m.have.length} von {total} Zutaten da
          </span>
          <span
            className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-label="Zutaten vorhanden"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={m.have.length}
          >
            <span className="block h-full rounded-full bg-brand" style={{ width: `${m.coverage * 100}%` }} />
          </span>
        </span>
      </Link>
      {m.missing.length > 0 && (
        <div className="mt-2 flex items-center gap-2 border-t border-line/60 pt-2">
          <p className="min-w-0 flex-1 text-sm">
            <span className="text-muted">Fehlt: </span>
            {m.missing.join(', ')}
          </p>
          {onAddMissing && (
            <Button
              variant="ghost"
              size="sm"
              icon={<ShoppingBasket className="size-4" aria-hidden />}
              disabled={add.isPending}
              aria-label={`Fehlende Zutaten für ${m.recipe.title} auf die Einkaufsliste`}
              onClick={async () => {
                const items = missingIngredients(m.recipe, m.missing).map((i) => ({ name: i.name, amount: i.amount, unit: i.unit, category: i.category }))
                await add.mutateAsync({ items, source: 'manual' })
                onAddMissing(`${items.length} Zutaten auf der Einkaufsliste`, '🛒')
              }}
            >
              Einkaufen
            </Button>
          )}
        </div>
      )}
    </li>
  )
}
