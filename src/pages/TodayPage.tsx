import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Dumbbell, Droplets, Plus, Scale, UserRound } from 'lucide-react'
import type { ActivityLog, LogEntry, MealType, PlanItem } from '../types'
import { MEAL_TYPES } from '../types'
import { useActivities, useAddLogEntries, useDeleteLogEntry, useLog, useProfile, useWater, useWeights } from '../hooks/data'
import { isMissingTableError } from '../data/store'
import { summarizeActivities, targetWithActivity, weightOn } from '../lib/activity'
import { ActivitySection } from '../components/today/ActivitySection'
import { ActivitySheet } from '../components/today/ActivitySheet'
import { usePlanRange } from '../hooks/plan'
import { canLogDirectly, openPlanItems, planItemEntry } from '../lib/plannedToday'
import { detectVeggies } from '../lib/veggies'
import { copyEntries, groupByMeal, totalsOf } from '../lib/log'
import { macroGrams, motivationLine, progress } from '../lib/nutrition'
import { mealForHour } from '../lib/meals'
import { fmt1, fmtInt } from '../lib/format'
import { shiftISO, todayISO } from '../lib/dates'
import { Card } from '../components/ui/Card'
import { ProgressRing } from '../components/ui/ProgressRing'
import { MacroBar } from '../components/ui/MacroBar'
import { DaySwitcher } from '../components/today/DaySwitcher'
import { MealSection } from '../components/today/MealSection'
import { EntrySheet } from '../components/today/EntrySheet'
import { WaterSheet } from '../components/today/WaterSheet'
import { WaterReminder } from '../components/today/WaterReminder'
import { WeekGlance } from '../components/today/WeekGlance'
import { CopyMealSheet } from '../components/today/CopyMealSheet'
import { SaveMealAsDishSheet } from '../components/today/SaveMealAsDishSheet'
import { useToast } from '../components/ui/Toast'
import { WeightSheet } from '../components/today/WeightSheet'
import { InstallHint } from '../components/today/InstallHint'

function greeting(hour: number) {
  if (hour < 11) return 'Guten Morgen'
  if (hour < 18) return 'Hallo'
  return 'Guten Abend'
}

export function TodayPage() {
  const [params, setParams] = useSearchParams()
  const date = params.get('datum') ?? todayISO()
  const setDate = (d: string) => setParams(d === todayISO() ? {} : { datum: d }, { replace: true })
  const navigate = useNavigate()

  const { data: profile } = useProfile()
  const { data: entries = [] } = useLog(date)
  const { data: prevEntries = [] } = useLog(shiftISO(date, -1))
  const addLog = useAddLogEntries()
  const deleteLog = useDeleteLogEntry()
  const { data: plan = [] } = usePlanRange(date, date)
  const toast = useToast()
  const [copying, setCopying] = useState<{ meal: MealType; date: string; entries: LogEntry[] } | null>(null)
  const [savingDish, setSavingDish] = useState<{ meal: MealType; entries: LogEntry[] } | null>(null)
  const { data: water = [] } = useWater(date)
  const [editing, setEditing] = useState<LogEntry | null>(null)
  const [waterOpen, setWaterOpen] = useState(false)
  const activitiesQuery = useActivities(date)
  const { data: weights = [] } = useWeights()
  // Sport: Sheet zum Eintragen (null = zu, 'neu' = neuer Eintrag, sonst der bearbeitete Eintrag)
  const [activitySheet, setActivitySheet] = useState<ActivityLog | 'neu' | null>(null)
  const [weightOpen, setWeightOpen] = useState(false)

  if (!profile) return null
  const totals = totalsOf(entries)
  const activities = activitiesQuery.data ?? []
  const activityUnavailable = !!activitiesQuery.error && isMissingTableError(activitiesQuery.error)
  const activityKcal = summarizeActivities(activities).kcal
  const inBudget = !!profile.activity_in_budget
  // Sport erhöht das Tagesziel nur, wenn das im Profil so eingestellt ist
  const target = targetWithActivity(profile.kcal_target, activityKcal, inBudget)
  const prog = progress(totals.kcal, target)
  const goals = macroGrams(profile.kcal_target, {
    protein: profile.protein_pct,
    carbs: profile.carbs_pct,
    fat: profile.fat_pct,
  })
  const byMeal = groupByMeal(entries)
  const prevByMeal = groupByMeal(prevEntries)
  const openPlan = openPlanItems(plan, entries)

  /** Geplantes als gegessen eintragen – mit Rückgängig. Freien Text ohne Werte erst auf der Hinzufügen-Seite ergänzen. */
  async function logPlanned(p: PlanItem) {
    if (!canLogDirectly(p)) {
      navigate(`/hinzufuegen?meal=${p.meal}&date=${date}&suche=${encodeURIComponent(p.title)}`)
      return
    }
    let veggies = detectVeggies(p.title)
    if (p.recipe_id) {
      // Das Kochbuch erst jetzt laden – die Tagesseite soll schnell starten
      try {
        const { getRecipe, recipeVeggies } = await import('../lib/recipes')
        const recipe = getRecipe(p.recipe_id)
        if (recipe) veggies = recipeVeggies(recipe)
      } catch {
        // ohne Kochbuch genügt die Erkennung am Namen
      }
    }
    const [row] = await addLog.mutateAsync([planItemEntry(p, veggies)])
    toast(`${p.title} eingetragen`, '✅', row ? { label: 'Rückgängig', onClick: () => deleteLog.mutate(row.id) } : undefined)
  }
  const waterMl = water.reduce((s, w) => s + Number(w.ml), 0)
  const hour = new Date().getHours()

  return (
    <>
      <header className="flex items-center justify-between pt-4">
        <div>
          <p className="text-sm text-muted">{greeting(hour)},</p>
          <h1 className="text-2xl font-bold tracking-tight">{profile.name || 'du'}</h1>
        </div>
        <Link
          to="/profil"
          aria-label="Profil und Einstellungen"
          className="flex size-11 items-center justify-center rounded-full bg-surface ring-1 ring-line"
        >
          <UserRound className="size-5" aria-hidden />
        </Link>
      </header>

      <div className="mt-3">
        <DaySwitcher date={date} onChange={setDate} />
      </div>

      <Card className="mt-2 pt-6">
        <ProgressRing consumed={totals.kcal} target={target} />
        {inBudget && activityKcal > 0 && (
          <p className="mt-2 text-center text-xs text-muted">
            Tagesziel {fmtInt(profile.kcal_target)} kcal + {fmtInt(activityKcal)} kcal Sport
          </p>
        )}
        <p className="mx-auto mt-4 max-w-xs text-center text-sm text-muted" aria-live="polite">
          {motivationLine(prog, entries.length)}
        </p>
        <div className="mt-5 flex gap-4">
          <MacroBar label="Eiweiß" value={totals.protein} target={goals.protein} color="var(--c-protein)" />
          <MacroBar label="Kohlenhydrate" value={totals.carbs} target={goals.carbs} color="var(--c-carbs)" />
          <MacroBar label="Fett" value={totals.fat} target={goals.fat} color="var(--c-fat)" />
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-4 gap-2" role="group" aria-label="Schnellaktionen">
        <QuickAction
          label="Mahlzeit"
          icon={<Plus className="size-5" aria-hidden />}
          onClick={() => navigate(`/hinzufuegen?meal=${mealForHour(hour)}&date=${date}`)}
          primary
        />
        <QuickAction
          label="Wasser"
          sub={`${fmt1(waterMl / 1000)} l`}
          ariaLabel={`Wasser, bisher ${fmtInt(waterMl)} Milliliter`}
          icon={<Droplets className="size-5" aria-hidden />}
          onClick={() => setWaterOpen(true)}
        />
        <QuickAction label="Gewicht" icon={<Scale className="size-5" aria-hidden />} onClick={() => setWeightOpen(true)} />
        <QuickAction
          label="Sport"
          sub={activityKcal > 0 ? `${fmtInt(activityKcal)} kcal` : undefined}
          ariaLabel={activityUnavailable ? 'Sport (noch nicht eingerichtet)' : 'Sport'}
          icon={<Dumbbell className="size-5" aria-hidden />}
          onClick={() => (activityUnavailable ? document.getElementById('sport')?.scrollIntoView({ behavior: 'smooth' }) : setActivitySheet('neu'))}
        />
      </div>

      <WaterReminder date={date} ml={waterMl} target={profile.water_target_ml} onOpen={() => setWaterOpen(true)} />
      <InstallHint />
      <WeekGlance date={date} />

      <div className="mt-6 space-y-3">
        {MEAL_TYPES.map((m) => (
          <MealSection
            key={m}
            meal={m}
            date={date}
            entries={byMeal[m]}
            onEdit={setEditing}
            yesterday={prevByMeal[m]}
            onCopy={() => setCopying({ meal: m, date, entries: byMeal[m] })}
            onSaveAsDish={() => setSavingDish({ meal: m, entries: byMeal[m] })}
            planned={openPlan.filter((p) => p.meal === m)}
            onLogPlanned={logPlanned}
            onTakeYesterday={async () => {
              await addLog.mutateAsync(copyEntries(prevByMeal[m], date, m))
              toast('Vom Vortag übernommen', '📋')
            }}
          />
        ))}
      </div>

      <div id="sport" className="mt-3 scroll-mt-4">
        <ActivitySection
          activities={activities}
          inBudget={inBudget}
          unavailable={activityUnavailable}
          onAdd={() => setActivitySheet('neu')}
          onEdit={(a) => setActivitySheet(a)}
        />
      </div>

      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
      <ActivitySheet
        open={activitySheet !== null}
        date={date}
        editing={activitySheet && activitySheet !== 'neu' ? activitySheet : null}
        weight={weightOn(date, weights, profile.weight_kg)}
        onClose={() => setActivitySheet(null)}
      />
      <CopyMealSheet source={copying} onClose={() => setCopying(null)} />
      <SaveMealAsDishSheet source={savingDish} onClose={() => setSavingDish(null)} />
      <WaterSheet open={waterOpen} onClose={() => setWaterOpen(false)} date={date} target={profile.water_target_ml} />
      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} date={date} />
    </>
  )
}

function QuickAction({
  label,
  sub,
  ariaLabel,
  icon,
  onClick,
  primary,
}: {
  label: string
  /** Kleine zweite Zeile, z. B. die Wassermenge */
  sub?: string
  ariaLabel?: string
  icon: React.ReactNode
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`flex min-h-18 flex-col items-center justify-center gap-1 rounded-2xl text-sm font-semibold transition active:scale-[0.97] ${
        primary ? 'bg-brand text-brand-ink shadow-sm' : 'bg-surface text-ink ring-1 ring-line'
      }`}
    >
      {icon}
      <span className="tabular leading-tight">
        {label}
        {sub && <span className="block text-xs font-medium text-muted">{sub}</span>}
      </span>
    </button>
  )
}
