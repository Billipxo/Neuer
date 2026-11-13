import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Droplets, Plus, Scale, UserRound } from 'lucide-react'
import type { LogEntry, MealType } from '../types'
import { MEAL_TYPES } from '../types'
import { useAddLogEntries, useLog, useProfile, useWater } from '../hooks/data'
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
  const toast = useToast()
  const [copying, setCopying] = useState<{ meal: MealType; date: string; entries: LogEntry[] } | null>(null)
  const [savingDish, setSavingDish] = useState<{ meal: MealType; entries: LogEntry[] } | null>(null)
  const { data: water = [] } = useWater(date)
  const [editing, setEditing] = useState<LogEntry | null>(null)
  const [waterOpen, setWaterOpen] = useState(false)
  const [weightOpen, setWeightOpen] = useState(false)

  if (!profile) return null
  const totals = totalsOf(entries)
  const prog = progress(totals.kcal, profile.kcal_target)
  const goals = macroGrams(profile.kcal_target, {
    protein: profile.protein_pct,
    carbs: profile.carbs_pct,
    fat: profile.fat_pct,
  })
  const byMeal = groupByMeal(entries)
  const prevByMeal = groupByMeal(prevEntries)
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
        <ProgressRing consumed={totals.kcal} target={profile.kcal_target} />
        <p className="mx-auto mt-4 max-w-xs text-center text-sm text-muted" aria-live="polite">
          {motivationLine(prog, entries.length)}
        </p>
        <div className="mt-5 flex gap-4">
          <MacroBar label="Eiweiß" value={totals.protein} target={goals.protein} color="var(--c-protein)" />
          <MacroBar label="Kohlenhydrate" value={totals.carbs} target={goals.carbs} color="var(--c-carbs)" />
          <MacroBar label="Fett" value={totals.fat} target={goals.fat} color="var(--c-fat)" />
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Schnellaktionen">
        <QuickAction
          label="Mahlzeit"
          icon={<Plus className="size-5" aria-hidden />}
          onClick={() => navigate(`/hinzufuegen?meal=${mealForHour(hour)}&date=${date}`)}
          primary
        />
        <QuickAction
          label={`Wasser · ${fmt1(waterMl / 1000)} l`}
          ariaLabel={`Wasser, bisher ${fmtInt(waterMl)} Milliliter`}
          icon={<Droplets className="size-5" aria-hidden />}
          onClick={() => setWaterOpen(true)}
        />
        <QuickAction label="Gewicht" icon={<Scale className="size-5" aria-hidden />} onClick={() => setWeightOpen(true)} />
      </div>

      <WaterReminder date={date} ml={waterMl} target={profile.water_target_ml} onOpen={() => setWaterOpen(true)} />
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
            onTakeYesterday={async () => {
              await addLog.mutateAsync(copyEntries(prevByMeal[m], date, m))
              toast('Vom Vortag übernommen', '📋')
            }}
          />
        ))}
      </div>

      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
      <CopyMealSheet source={copying} onClose={() => setCopying(null)} />
      <SaveMealAsDishSheet source={savingDish} onClose={() => setSavingDish(null)} />
      <WaterSheet open={waterOpen} onClose={() => setWaterOpen(false)} date={date} target={profile.water_target_ml} />
      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} date={date} />
    </>
  )
}

function QuickAction({
  label,
  ariaLabel,
  icon,
  onClick,
  primary,
}: {
  label: string
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
      <span className="tabular">{label}</span>
    </button>
  )
}
