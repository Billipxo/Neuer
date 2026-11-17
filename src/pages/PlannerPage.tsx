import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getISOWeek } from 'date-fns'
import { CheckCircle2, ChevronLeft, ChevronRight, Dumbbell, Plus, Share2, Sparkles, Trash2 } from 'lucide-react'
import type { MealType, PlanItem, TrainingPlan } from '../types'
import { MEAL_TYPES } from '../types'
import { useActivityRange, useProfile, useWeights } from '../hooks/data'
import { useAddPlanItems, useDeletePlanItems, usePlanRange } from '../hooks/plan'
import { trainingPlansUnavailable, useTrainingPlans } from '../hooks/trainingPlan'
import { activityEmoji, weightOn } from '../lib/activity'
import { matchPlans, mealPlanHints, planDetail, trainingWeekSummary } from '../lib/trainingPlan'
import { TrainingPlanSheet, type TrainingPlanTarget } from '../components/planner/TrainingPlanSheet'
import { TrainingWeekSheet } from '../components/planner/TrainingWeekSheet'
import { TrainingPlanItemSheet } from '../components/planner/TrainingPlanItemSheet'
import { suggestWeek, weekSummary, type NewPlanItem } from '../lib/planner'
import { loadFavorites } from '../lib/favorites'
import { getRecipe, matchesDiet, RECIPES } from '../lib/recipes'
import { useVariantRecipes } from '../hooks/variants'
import { MEAL_LABELS } from '../lib/meals'
import { fmtDayShort, fromISODate, shiftISO, todayISO, weekDaysISO, weekStartISO, fmtDate } from '../lib/dates'
import { fmtInt } from '../lib/format'
import { PageHeader } from '../components/layout/PageHeader'
import { Button, IconButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'
import { PlanSlotSheet } from '../components/planner/PlanSlotSheet'
import { PlanItemSheet } from '../components/planner/PlanItemSheet'
import { GenerateShoppingButton } from '../components/planner/GenerateShoppingButton'
import { SharedBanner } from '../components/household/SharedBanner'
import { useHousehold } from '../app/household'
import { decodePlan, encodePlan, planLink, weekPlanShareText } from '../lib/planShare'
import { SharedPlanSheet } from '../components/planner/SharedPlanSheet'
import { shareText } from '../lib/share'

export function PlannerPage() {
  const [params, setParams] = useSearchParams()
  const weekStart = weekStartISO(params.get('woche') ?? todayISO())
  const days = weekDaysISO(weekStart)
  const setWeek = (d: string) => setParams({ woche: weekStartISO(d) }, { replace: true })

  const { data: profile } = useProfile()
  const { data: items = [] } = usePlanRange(days[0], days[6])
  const add = useAddPlanItems()
  const del = useDeletePlanItems()
  const toast = useToast()
  const [slot, setSlot] = useState<{ date: string; meal: MealType } | null>(null)
  const [editing, setEditing] = useState<PlanItem | null>(null)
  // Training – dezent neben den Mahlzeiten, persönlich auch im gemeinsamen Haushalt
  const trainingQuery = useTrainingPlans(days[0], days[6])
  const trainingPlans = trainingQuery.data ?? []
  const trainingUnavailable = trainingPlansUnavailable(trainingQuery)
  const { data: weekActivities = [] } = useActivityRange(days[0], days[6])
  const { data: weights = [] } = useWeights()
  const [trainingTarget, setTrainingTarget] = useState<TrainingPlanTarget | null>(null)
  const [trainingWeekOpen, setTrainingWeekOpen] = useState(false)
  const [editingTraining, setEditingTraining] = useState<TrainingPlan | null>(null)

  const { recipes: ownRecipes } = useVariantRecipes()
  const { household } = useHousehold()

  // Per Link empfangener Plan (?plan=…): prüfen und zum Übernehmen anbieten
  const sharedToken = params.get('plan')
  const sharedPlan = useMemo(() => (sharedToken ? decodePlan(sharedToken) : null), [sharedToken])
  useEffect(() => {
    if (sharedToken && !sharedPlan) {
      toast('Der Link enthält keinen gültigen Wochenplan', '⚠️')
      setParams({ woche: weekStart }, { replace: true })
    }
    // nur auf den Link reagieren
  }, [sharedToken, sharedPlan])

  if (!profile) return null
  const target = profile.kcal_target
  const summary = weekSummary(items, days)
  const today = todayISO()
  const inBudget = !!profile.activity_in_budget
  // Was das geplante Training für die Mahlzeiten heißt: mehr kcal (wenn angerechnet), an Krafttagen mehr Eiweiß
  const hints = mealPlanHints(trainingPlans, days, { weightKg: weightOn(days[0], weights, profile.weight_kg).kg, inBudget })
  const doneTrainings = matchPlans(trainingPlans, weekActivities)
  const trainingWeek = trainingWeekSummary(trainingPlans, weekActivities, days)
  const dayTarget = (d: string) => target + (hints.extraKcal[d] ?? 0)
  const trainingHint = [
    hints.proteinDays.length ? 'an Krafttagen proteinreiche Rezepte' : '',
    Object.keys(hints.extraKcal).length ? 'an Trainingstagen etwas mehr kcal (Sport wird aufs Tagesziel angerechnet)' : '',
  ].filter(Boolean)

  async function suggest() {
    const suggested = suggestWeek({
      recipes: [...RECIPES, ...ownRecipes].filter((r) => matchesDiet(r, profile!.diet, profile!.avoid)),
      month: Number(weekStart.slice(5, 7)),
      days,
      kcalTarget: target,
      macros: { protein: profile!.protein_pct, carbs: profile!.carbs_pct, fat: profile!.fat_pct },
      existing: items,
      preferAirfryer: profile!.has_airfryer ?? true,
      favorites: loadFavorites(),
      extraKcal: hints.extraKcal,
      proteinDays: hints.proteinDays,
    })
    if (!suggested.length) {
      toast('Alle Slots sind schon belegt')
      return
    }
    await add.mutateAsync(suggested)
    const trainingDays = hints.trainingDays.length
    toast(
      trainingDays
        ? `${suggested.length} Mahlzeiten vorgeschlagen – abgestimmt auf ${trainingDays} ${trainingDays === 1 ? 'Trainingstag' : 'Trainingstage'}`
        : `${suggested.length} Mahlzeiten vorgeschlagen – alles bleibt änderbar`,
      '✨',
    )
  }

  async function addItem(item: NewPlanItem) {
    await add.mutateAsync([item])
    setSlot(null)
    toast('Eingeplant')
  }

  return (
    <>
      <PageHeader
        title="Wochenplan"
        actions={
          items.length > 0 && (
            <IconButton
              label="Wochenplan teilen"
              onClick={async () => {
                // Lesbarer Text plus Link: Wer Teller nutzt, übernimmt den Plan mit einem Tipp
                const link = planLink(window.location.origin, encodePlan(items, days, (id) => Boolean(getRecipe(id))))
                const outcome = await shareText({ title: 'Wochenplan', text: weekPlanShareText(items, days, link) })
                if (outcome === 'copied') toast('Wochenplan in die Zwischenablage kopiert', '📋')
                if (outcome === 'failed') toast('Teilen nicht möglich')
              }}
            >
              <Share2 className="size-5" />
            </IconButton>
          )
        }
      />
      <SharedBanner>
        {household && ` · Portionen gelten pro Person, eingekauft wird für ${household.eaters} ${household.eaters === 1 ? 'Person' : 'Personen'}.`}
      </SharedBanner>
      <div className="flex items-center gap-1">
        <IconButton label="Vorherige Woche" onClick={() => setWeek(shiftISO(weekStart, -7))}>
          <ChevronLeft className="size-5" />
        </IconButton>
        <button
          type="button"
          onClick={() => setWeek(today)}
          className="min-h-11 flex-1 rounded-xl text-center hover:bg-surface-2"
          aria-label={`KW ${getISOWeek(fromISODate(weekStart))}, ${fmtDate(days[0])} bis ${fmtDate(days[6])}. Tippen für aktuelle Woche`}
        >
          <span className="block text-sm font-semibold">KW {getISOWeek(fromISODate(weekStart))}</span>
          <span className="block text-xs text-muted">
            {fmtDayShort(days[0])} – {fmtDayShort(days[6])}
          </span>
        </button>
        <IconButton label="Nächste Woche" onClick={() => setWeek(shiftISO(weekStart, 7))}>
          <ChevronRight className="size-5" />
        </IconButton>
      </div>

      <Card className="mt-2">
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div>
            <dt className="text-xs text-muted">Woche gesamt</dt>
            <dd className="text-lg font-bold tabular">{fmtInt(summary.total.kcal)}</dd>
            <dd className="text-xs text-muted">kcal</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Ø pro Tag</dt>
            <dd className="text-lg font-bold tabular">{fmtInt(summary.avgPerPlannedDay.kcal)}</dd>
            <dd className="text-xs text-muted">von {fmtInt(target)} kcal</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Geplant</dt>
            <dd className="text-lg font-bold tabular">{summary.plannedDays}/7</dd>
            <dd className="text-xs text-muted">Tage</dd>
          </div>
        </dl>
        <p className="mt-3 text-center text-xs text-muted tabular">
          Makros Woche: {fmtInt(summary.total.protein)} g Eiweiß · {fmtInt(summary.total.carbs)} g KH · {fmtInt(summary.total.fat)} g Fett
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button icon={<Sparkles className="size-4" aria-hidden />} disabled={add.isPending} onClick={suggest}>
            Woche vorschlagen
          </Button>
          <GenerateShoppingButton items={items} />
        </div>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            block
            className="mt-2 text-muted"
            icon={<Trash2 className="size-4" aria-hidden />}
            onClick={async () => {
              if (!confirm(trainingPlans.length ? 'Alle Mahlzeiten dieser Woche entfernen? Geplantes Training bleibt.' : 'Alle Einträge dieser Woche entfernen?')) return
              await del.mutateAsync(items.map((i) => i.id))
              toast('Woche geleert')
            }}
          >
            Woche leeren
          </Button>
        )}
        {trainingUnavailable ? (
          <p className="mt-3 border-t border-line/70 pt-3 text-xs text-muted">
            Training einplanen: Dafür fehlt noch ein kurzes Datenbank-Update – in Supabase einmal <strong>setup-teil-4.sql</strong> ausführen
            (Anleitung: „Update: Training planen“).
          </p>
        ) : (
          <div className="mt-3 border-t border-line/70 pt-2">
            <div className="flex items-center gap-2">
              <Dumbbell className="size-4 shrink-0 text-muted" aria-hidden />
              <p className="min-w-0 flex-1 text-sm text-muted tabular">
                {trainingWeek.planned
                  ? `Training: ${trainingWeek.planned} geplant${trainingWeek.done ? ` · ${trainingWeek.done} erledigt` : ''}`
                  : 'Training (optional)'}
              </p>
              {days[6] >= today && (
                <Button variant="secondary" size="sm" onClick={() => setTrainingWeekOpen(true)}>
                  Trainingstage planen
                </Button>
              )}
            </div>
            {trainingHint.length > 0 && (
              <p className="mt-1 text-xs text-muted">„Woche vorschlagen“ achtet auf dein Training: {trainingHint.join(' und ')}.</p>
            )}
          </div>
        )}
      </Card>

      <div className="mt-4 space-y-3">
        {days.map((d) => {
          const dayItems = items.filter((i) => i.date === d)
          const dayTrainings = trainingPlans.filter((p) => p.date === d)
          const kcal = summary.perDay[d].kcal
          const goal = dayTarget(d)
          const pct = goal > 0 ? Math.min(100, (kcal / goal) * 100) : 0
          return (
            <Card key={d} aria-current={d === today ? 'date' : undefined} className={`p-0 ${d === today ? 'ring-2 ring-brand/60' : ''}`}>
              <div className="flex items-center justify-between gap-2 pl-4 pr-2 pt-2">
                <h2 className="font-semibold">
                  {fmtDayShort(d)}
                  {d === today && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">Heute</span>}
                </h2>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted tabular">
                    {fmtInt(kcal)} / {fmtInt(goal)} kcal
                  </span>
                  {!trainingUnavailable && d >= today && (
                    <IconButton
                      label={`Training am ${fmtDayShort(d)} einplanen`}
                      className="size-10 text-muted"
                      onClick={() => setTrainingTarget({ date: d, days })}
                    >
                      <Dumbbell className="size-4" />
                    </IconButton>
                  )}
                </div>
              </div>
              <div className="mx-4 mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
              <ul className="mt-1 pb-1">
                {MEAL_TYPES.map((m) => {
                  const slotItems = dayItems.filter((i) => i.meal === m)
                  return (
                    <li key={m} className="flex items-start gap-2 px-4 py-1.5">
                      <span className="w-20 shrink-0 pt-2 text-xs font-medium text-muted">{MEAL_LABELS[m].replace('essen', '')}</span>
                      <div className="min-w-0 flex-1 space-y-1">
                        {slotItems.map((i) => (
                          <button
                            key={i.id}
                            type="button"
                            onClick={() => setEditing(i)}
                            className="flex min-h-10 w-full items-center gap-2 rounded-xl bg-surface-2/70 px-3 text-left text-sm transition hover:bg-surface-2"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {i.title}
                              {Number(i.servings) !== 1 && <span className="text-muted"> ×{String(i.servings).replace('.', ',')}</span>}
                            </span>
                            <span className="shrink-0 text-xs text-muted tabular">{fmtInt(Number(i.kcal))}</span>
                          </button>
                        ))}
                        {slotItems.length === 0 && (
                          <button
                            type="button"
                            onClick={() => setSlot({ date: d, meal: m })}
                            aria-label={`${MEAL_LABELS[m]} am ${fmtDayShort(d)} planen`}
                            className="flex min-h-10 w-full items-center gap-1.5 rounded-xl border border-dashed border-line px-3 text-sm text-muted transition hover:border-brand hover:text-brand"
                          >
                            <Plus className="size-4" aria-hidden />
                            Planen
                          </button>
                        )}
                      </div>
                      {slotItems.length > 0 && (
                        <IconButton
                          label={`Weiteres zu ${MEAL_LABELS[m]} am ${fmtDayShort(d)} hinzufügen`}
                          className="size-10 text-muted"
                          onClick={() => setSlot({ date: d, meal: m })}
                        >
                          <Plus className="size-4" />
                        </IconButton>
                      )}
                    </li>
                  )
                })}
                {dayTrainings.length > 0 && (
                  <li className="flex items-start gap-2 px-4 py-1.5">
                    <span className="w-20 shrink-0 pt-2 text-xs font-medium text-muted">Training</span>
                    <div className="min-w-0 flex-1 space-y-1">
                      {dayTrainings.map((p) => {
                        const done = doneTrainings.has(p.id)
                        const detail = planDetail(p)
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setEditingTraining(p)}
                            aria-label={`${p.title}${detail ? `, ${detail}` : ''}${done ? ', erledigt' : ''}`}
                            className="flex min-h-10 w-full items-center gap-2 rounded-xl border border-line/70 px-3 text-left text-sm transition hover:bg-surface-2"
                          >
                            <span aria-hidden>{activityEmoji(p.kind)}</span>
                            <span className="min-w-0 flex-1 truncate">
                              {p.title}
                              {p.minutes ? <span className="text-muted"> · {p.minutes} Min.</span> : null}
                            </span>
                            {done && <CheckCircle2 className="size-4 shrink-0 text-brand" aria-hidden />}
                          </button>
                        )
                      })}
                    </div>
                  </li>
                )}
              </ul>
            </Card>
          )
        })}
      </div>

      <PlanSlotSheet slot={slot} onClose={() => setSlot(null)} onAdd={addItem} />
      <PlanItemSheet item={editing} onClose={() => setEditing(null)} />
      <TrainingPlanSheet target={trainingTarget} onClose={() => setTrainingTarget(null)} />
      <TrainingWeekSheet open={trainingWeekOpen} days={days} existing={trainingPlans} onClose={() => setTrainingWeekOpen(false)} />
      <TrainingPlanItemSheet
        plan={editingTraining}
        done={editingTraining ? (doneTrainings.get(editingTraining.id) ?? null) : null}
        days={days}
        onClose={() => setEditingTraining(null)}
      />
      <SharedPlanSheet
        plan={sharedPlan}
        onClose={() => setParams({ woche: weekStart }, { replace: true })}
        onImported={(week) => setParams({ woche: week }, { replace: true })}
      />
    </>
  )
}
