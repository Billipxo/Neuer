import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Scale, Droplets, Pencil } from 'lucide-react'
import type { LogEntry } from '../types'
import { MEAL_TYPES } from '../types'
import { useLog, useLogRange, useProfile, useWater, useWaterRange, useWeights } from '../hooks/data'
import { dailySeries, periodStats, waterSeries, weightSeries } from '../lib/stats'
import { groupByMeal, totalsOf } from '../lib/log'
import { MEAL_LABELS } from '../lib/meals'
import { fmt1, fmtInt } from '../lib/format'
import { fmtAmount } from '../lib/units'
import { fmtDate, fmtDayShort, fromISODate, rangeISO, shiftISO, toISODate, todayISO, weekDaysISO, weekStartISO, relativeDayLabel } from '../lib/dates'
import { PageHeader } from '../components/layout/PageHeader'
import { Segmented } from '../components/ui/Segmented'
import { Button, IconButton } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { EmptyState } from '../components/ui/EmptyState'
import { NutrientGrid } from '../components/add/NutrientGrid'
import { EntrySheet } from '../components/today/EntrySheet'
import { WeightSheet } from '../components/today/WeightSheet'
import { WaterSheet } from '../components/today/WaterSheet'
import { KcalChart, MacroChart, WaterChart, WeightChart } from '../components/history/Charts'

type View = 'day' | 'week' | 'month'

export default function HistoryPage() {
  const [params, setParams] = useSearchParams()
  const view = (params.get('ansicht') as View) || 'week'
  const anchor = params.get('datum') ?? todayISO()
  const set = (v: View, d: string) => setParams({ ansicht: v, datum: d }, { replace: true })

  return (
    <>
      <PageHeader title="Verlauf" />
      <Segmented<View>
        label="Zeitraum"
        value={view}
        onChange={(v) => set(v, anchor)}
        options={[
          { value: 'day', label: 'Tag' },
          { value: 'week', label: 'Woche' },
          { value: 'month', label: 'Monat' },
        ]}
      />
      <div className="mt-3">
        {view === 'day' ? <DayView date={anchor} onDate={(d) => set('day', d)} /> : <PeriodView view={view} anchor={anchor} onAnchor={(d) => set(view, d)} />}
      </div>
    </>
  )
}

function DayView({ date, onDate }: { date: string; onDate: (d: string) => void }) {
  const { data: entries = [] } = useLog(date)
  const { data: water = [] } = useWater(date)
  const { data: weights = [] } = useWeights()
  const { data: profile } = useProfile()
  const [editing, setEditing] = useState<LogEntry | null>(null)
  const totals = totalsOf(entries)
  const byMeal = groupByMeal(entries)
  const weight = weights.find((w) => w.date === date)
  const waterMl = water.reduce((s, w) => s + Number(w.ml), 0)

  return (
    <>
      <div className="flex items-end gap-2">
        <IconButton label="Vorheriger Tag" onClick={() => onDate(shiftISO(date, -1))}>
          <ChevronLeft className="size-5" />
        </IconButton>
        <Field className="flex-1" label="Datum" type="date" value={date} max={todayISO()} onChange={(e) => e.target.value && onDate(e.target.value)} />
        <IconButton label="Nächster Tag" onClick={() => onDate(shiftISO(date, 1))}>
          <ChevronRight className="size-5" />
        </IconButton>
      </div>

      <Card className="mt-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">{relativeDayLabel(date)}</h2>
          <span className="text-sm text-muted tabular">Ziel {fmtInt(profile?.kcal_target ?? 0)} kcal</span>
        </div>
        <NutrientGrid n={totals} />
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Droplets className="size-4 text-water" aria-hidden /> {fmtInt(waterMl)} ml Wasser
          </span>
          {weight && (
            <span className="inline-flex items-center gap-1">
              <Scale className="size-4" aria-hidden /> {fmt1(Number(weight.kg))} kg
            </span>
          )}
        </p>
        <Link
          to={date === todayISO() ? '/' : `/?datum=${date}`}
          className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-brand"
        >
          <Pencil className="size-4" aria-hidden /> Tag bearbeiten
        </Link>
      </Card>

      {entries.length === 0 ? (
        <EmptyState title="Für diesen Tag ist nichts protokolliert" />
      ) : (
        MEAL_TYPES.filter((m) => byMeal[m].length).map((m) => (
          <div key={m}>
            <SectionTitle action={<span className="text-sm text-muted tabular">{fmtInt(totalsOf(byMeal[m]).kcal)} kcal</span>}>
              {MEAL_LABELS[m]}
            </SectionTitle>
            <Card className="p-1">
              <ul>
                {byMeal[m].map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => setEditing(e)} className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-surface-2/60">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{e.name}</span>
                        <span className="block text-xs text-muted">{fmtAmount(Number(e.amount), e.unit)}</span>
                      </span>
                      <span className="text-sm tabular">{fmtInt(Number(e.kcal))} kcal</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ))
      )}
      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function PeriodView({ view, anchor, onAnchor }: { view: 'week' | 'month'; anchor: string; onAnchor: (d: string) => void }) {
  const { data: profile } = useProfile()
  const [weightOpen, setWeightOpen] = useState(false)
  const [waterOpen, setWaterOpen] = useState(false)
  const anchorDate = fromISODate(anchor)
  const days =
    view === 'week' ? weekDaysISO(weekStartISO(anchor)) : rangeISO(toISODate(startOfMonth(anchorDate)), toISODate(endOfMonth(anchorDate)))
  const from = days[0]
  const to = days[days.length - 1]
  const { data: entries = [] } = useLogRange(from, to)
  const { data: water = [] } = useWaterRange(from, to)
  const { data: weights = [] } = useWeights()
  if (!profile) return null

  const series = dailySeries(entries, days)
  const stats = periodStats(series, profile.kcal_target)
  const weightData = weightSeries(weights, from, to)
  const label = view === 'week' ? `${fmtDayShort(from)} – ${fmtDayShort(to)}` : format(anchorDate, 'MMMM yyyy', { locale: de })
  const prev = view === 'week' ? shiftISO(from, -7) : toISODate(addMonths(anchorDate, -1))
  const next = view === 'week' ? shiftISO(from, 7) : toISODate(addMonths(anchorDate, 1))

  return (
    <>
      <div className="flex items-center gap-1">
        <IconButton label={view === 'week' ? 'Vorherige Woche' : 'Vorheriger Monat'} onClick={() => onAnchor(prev)}>
          <ChevronLeft className="size-5" />
        </IconButton>
        <p className="flex-1 text-center text-sm font-semibold" aria-live="polite">
          {label}
        </p>
        <IconButton label={view === 'week' ? 'Nächste Woche' : 'Nächster Monat'} onClick={() => onAnchor(next)}>
          <ChevronRight className="size-5" />
        </IconButton>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Ø kcal" value={fmtInt(stats.avg.kcal)} sub={`Ziel ${fmtInt(profile.kcal_target)}`} />
        <Stat label="Im Zielbereich" value={`${stats.daysInTarget}`} sub={`von ${stats.loggedDays} Tagen`} />
        <Stat label="Protokolliert" value={`${stats.loggedDays}`} sub={`von ${days.length} Tagen`} />
      </dl>

      <div className="mt-4 space-y-4">
        {stats.loggedDays === 0 ? (
          <EmptyState title="Noch keine Einträge in diesem Zeitraum" text="Sobald du Mahlzeiten einträgst, erscheinen hier deine Diagramme." />
        ) : (
          <>
            <KcalChart data={series} target={profile.kcal_target} />
            <MacroChart data={series} />
          </>
        )}
        {weightData.length > 0 ? (
          <WeightChart data={weightData} />
        ) : (
          <Card className="text-sm text-muted">Noch kein Gewicht in diesem Zeitraum eingetragen.</Card>
        )}
        <WaterChart data={waterSeries(water, days)} target={profile.water_target_ml} />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" icon={<Scale className="size-4" aria-hidden />} onClick={() => setWeightOpen(true)}>
            Gewicht eintragen
          </Button>
          <Button variant="secondary" icon={<Droplets className="size-4" aria-hidden />} onClick={() => setWaterOpen(true)}>
            Wasser heute
          </Button>
        </div>
        {weights.length > 0 && <WeightList />}
      </div>
      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} date={todayISO()} />
      <WaterSheet open={waterOpen} onClose={() => setWaterOpen(false)} date={todayISO()} target={profile.water_target_ml} />
    </>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3 text-center ring-1 ring-line/60">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-xl font-bold tabular">{value}</dd>
      <dd className="text-xs text-muted">{sub}</dd>
    </div>
  )
}

function WeightList() {
  const { data: weights = [] } = useWeights()
  const recent = [...weights].reverse().slice(0, 5)
  return (
    <Card>
      <h3 className="mb-1 font-semibold">Letzte Gewichtseinträge</h3>
      <ul className="divide-y divide-line/60 text-sm">
        {recent.map((w) => (
          <li key={w.id} className="flex justify-between py-2 tabular">
            <span>{fmtDate(w.date)}</span>
            <span className="font-medium">{fmt1(Number(w.kg))} kg</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
