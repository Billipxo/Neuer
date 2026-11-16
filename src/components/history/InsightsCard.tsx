import { useId, useMemo, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import type { LogEntry } from '../../types'
import { fmtShare, periodInsights, WEEKDAY_NAMES } from '../../lib/insights'
import { MEAL_LABELS } from '../../lib/meals'
import { fmtInt } from '../../lib/format'
import { Card } from '../ui/Card'
import { Segmented } from '../ui/Segmented'

type FoodView = 'kcal' | 'count'

/**
 * Eine Zeile: Name, Zahl und darunter ein Balken. Die Zahl steht immer als Text daneben – der Balken
 * (eine Farbe, heller Hintergrund aus derselben Farbe, abgerundet am Datenende) hilft nur beim Vergleichen.
 */
function MeterRow({ name, figure, value, max, hint }: { name: string; figure: string; value: number; max: number; hint: string }) {
  const width = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <li className="py-1.5" title={hint}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate">{name}</span>
        <span className="shrink-0 text-muted tabular-nums">{figure}</span>
      </div>
      <div aria-hidden className="mt-1 h-2 rounded-r bg-brand-soft">
        {width > 0 && <div className="h-full rounded-r bg-brand" style={{ width: `${width * 100}%` }} />}
      </div>
    </li>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="mt-4">
      <h4 id={id} className="text-sm font-semibold">
        {title}
      </h4>
      {note && <p className="text-xs text-muted">{note}</p>}
      {children}
    </section>
  )
}

/** Einblicke: woher die Kalorien eines Zeitraums kommen – neutral beschrieben, ohne Bewertung */
export function InsightsCard({ entries, monthly }: { entries: LogEntry[]; monthly: boolean }) {
  const [view, setView] = useState<FoodView>('kcal')
  const ins = useMemo(() => periodInsights(entries), [entries])
  if (ins.entries === 0) return null

  const foods = view === 'kcal' ? ins.byKcal : ins.byCount
  const foodMax = view === 'kcal' ? (foods[0]?.kcal ?? 0) : (foods[0]?.count ?? 0)
  const weekdayMax = Math.max(0, ...ins.weekdays.map((w) => w.avgKcal))

  return (
    <Card>
      <h3 className="flex items-center gap-2 font-semibold">
        <Lightbulb className="size-4 text-brand" aria-hidden /> Einblicke
      </h3>
      <p className="text-xs text-muted">Woher die Kalorien in diesem Zeitraum kommen · ohne Wertung</p>

      <Section title="Lebensmittel">
        <Segmented<FoodView>
          className="mt-2"
          label="Lebensmittel sortieren"
          value={view}
          onChange={setView}
          options={[
            { value: 'kcal', label: 'Meiste kcal' },
            { value: 'count', label: 'Am häufigsten' },
          ]}
        />
        <ol className="mt-1" aria-label={view === 'kcal' ? 'Lebensmittel mit den meisten kcal' : 'Am häufigsten eingetragen'}>
          {foods.map((f) => (
            <MeterRow
              key={f.name}
              name={f.name}
              figure={view === 'kcal' ? `${fmtInt(f.kcal)} kcal · ${fmtShare(f.share)}` : `${f.count}× · ${fmtInt(f.kcal)} kcal`}
              value={view === 'kcal' ? f.kcal : f.count}
              max={foodMax}
              hint={`${f.name}: ${f.count}-mal eingetragen, zusammen ${fmtInt(f.kcal)} kcal (${fmtShare(f.share)} aller kcal)`}
            />
          ))}
        </ol>
      </Section>

      <Section title="Nach Mahlzeiten" note="Anteil an allen kcal">
        <ul className="mt-1" aria-label="kcal nach Mahlzeiten">
          {ins.meals.map((m) => (
            <MeterRow
              key={m.meal}
              name={MEAL_LABELS[m.meal]}
              figure={`${fmtShare(m.share)} · ${fmtInt(m.kcal)} kcal`}
              value={m.share}
              max={1}
              hint={`${MEAL_LABELS[m.meal]}: ${fmtInt(m.kcal)} kcal, ${fmtShare(m.share)} aller kcal`}
            />
          ))}
        </ul>
      </Section>

      {ins.energy && (
        <Section title="Energie aus" note="Anteile an den kcal aus Eiweiß, Kohlenhydraten und Fett">
          <ul className="mt-1" aria-label="Energie aus Eiweiß, Kohlenhydraten und Fett">
            {(
              [
                ['Eiweiß', ins.energy.protein],
                ['Kohlenhydrate', ins.energy.carbs],
                ['Fett', ins.energy.fat],
              ] as const
            ).map(([name, share]) => (
              <MeterRow key={name} name={name} figure={fmtShare(share)} value={share} max={1} hint={`${name}: ${fmtShare(share)} der Energie aus den Makronährstoffen`} />
            ))}
          </ul>
        </Section>
      )}

      {monthly && (
        <Section title="Nach Wochentagen" note="Ø kcal der Tage mit Einträgen">
          <ul className="mt-1" aria-label="Durchschnittliche kcal nach Wochentagen">
            {ins.weekdays.map((w) => (
              <MeterRow
                key={w.weekday}
                name={WEEKDAY_NAMES[w.weekday]}
                figure={w.days ? `Ø ${fmtInt(w.avgKcal)} kcal` : '–'}
                value={w.avgKcal}
                max={weekdayMax}
                hint={
                  w.days
                    ? `${WEEKDAY_NAMES[w.weekday]}: im Schnitt ${fmtInt(w.avgKcal)} kcal an ${w.days} ${w.days === 1 ? 'Tag' : 'Tagen'} mit Einträgen`
                    : `${WEEKDAY_NAMES[w.weekday]}: keine Einträge`
                }
              />
            ))}
          </ul>
        </Section>
      )}
    </Card>
  )
}
