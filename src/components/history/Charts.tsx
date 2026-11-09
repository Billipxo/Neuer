import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fmt1, fmtInt } from '../../lib/format'
import { fmtDate } from '../../lib/dates'
import type { DayPoint } from '../../lib/stats'

const axis = { stroke: 'var(--c-muted)', fontSize: 11, tickLine: false, axisLine: false } as const
const grid = <CartesianGrid vertical={false} stroke="var(--c-line)" strokeDasharray="0" strokeOpacity={0.6} />

interface TipProps {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string; payload?: { date?: string } }[]
  unit: string
}

function Tip({ active, payload, unit }: TipProps) {
  if (!active || !payload?.length) return null
  const date = payload[0].payload?.date
  return (
    <div className="rounded-xl bg-surface px-3 py-2 text-xs shadow-lg ring-1 ring-line">
      {date && <p className="mb-1 font-semibold text-ink">{fmtDate(date)}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-ink tabular">
          {payload.length > 1 && <span className="size-2.5 rounded-sm" style={{ background: p.color }} aria-hidden />}
          {payload.length > 1 && <span className="text-muted">{p.name}</span>}
          <span className="ml-auto font-medium">
            {unit === 'kg' ? fmt1(p.value ?? 0) : fmtInt(p.value ?? 0)} {unit}
          </span>
        </p>
      ))}
    </div>
  )
}

export function ChartCard({ title, summary, children, table }: { title: string; summary?: ReactNode; children: ReactNode; table: ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-line/60" aria-label={title}>
      <h3 className="font-semibold">{title}</h3>
      {summary && <div className="text-sm text-muted">{summary}</div>}
      <div className="mt-3 h-52" aria-hidden>
        {children}
      </div>
      <details className="mt-2 text-sm">
        <summary className="min-h-9 cursor-pointer py-2 text-muted">Als Tabelle anzeigen</summary>
        {table}
      </details>
    </section>
  )
}

function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="max-h-64 overflow-y-auto">
      <table className="w-full text-left text-sm tabular">
        <thead>
          <tr className="text-muted">
            {head.map((h) => (
              <th key={h} scope="col" className="py-1 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line/60">
              {r.map((c, j) => (
                <td key={j} className="py-1">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MacroLegend() {
  const items = [
    { label: 'Eiweiß', color: 'var(--c-protein)' },
    { label: 'Kohlenhydrate', color: 'var(--c-carbs)' },
    { label: 'Fett', color: 'var(--c-fat)' },
  ]
  return (
    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-ink">
          <span className="size-2.5 rounded-sm" style={{ background: i.color }} aria-hidden />
          {i.label} (g)
        </span>
      ))}
    </span>
  )
}

export function KcalChart({ data, target }: { data: DayPoint[]; target: number }) {
  return (
    <ChartCard
      title="Kalorien pro Tag"
      summary={`Gestrichelte Linie: dein Ziel (${fmtInt(target)} kcal)`}
      table={<SimpleTable head={['Datum', 'kcal']} rows={data.filter((d) => d.logged).map((d) => [fmtDate(d.date), fmtInt(d.kcal)])} />}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -4, bottom: 0 }} barCategoryGap="20%">
          {grid}
          <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
          <YAxis {...axis} tickFormatter={(v: number) => fmtInt(v)} width={52} domain={[0, (max: number) => Math.max(max, target * 1.1)]} />
          <Tooltip content={<Tip unit="kcal" />} cursor={{ fill: 'var(--c-surface-2)' }} />
          <ReferenceLine y={target} stroke="var(--c-muted)" strokeDasharray="4 4" strokeWidth={1.5} />
          <Bar dataKey="kcal" name="kcal" fill="var(--c-brand)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function MacroChart({ data }: { data: DayPoint[] }) {
  return (
    <ChartCard
      title="Makros pro Tag"
      summary={<MacroLegend />}
      table={
        <SimpleTable
          head={['Datum', 'Eiweiß', 'KH', 'Fett']}
          rows={data.filter((d) => d.logged).map((d) => [fmtDate(d.date), `${fmtInt(d.protein)} g`, `${fmtInt(d.carbs)} g`, `${fmtInt(d.fat)} g`])}
        />
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -4, bottom: 0 }} barCategoryGap="20%">
          {grid}
          <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
          <YAxis {...axis} width={52} />
          <Tooltip content={<Tip unit="g" />} cursor={{ fill: 'var(--c-surface-2)' }} />
          <Bar dataKey="protein" name="Eiweiß" stackId="m" fill="var(--c-protein)" stroke="var(--c-surface)" strokeWidth={2} maxBarSize={28} />
          <Bar dataKey="carbs" name="Kohlenhydrate" stackId="m" fill="var(--c-carbs)" stroke="var(--c-surface)" strokeWidth={2} maxBarSize={28} />
          <Bar dataKey="fat" name="Fett" stackId="m" fill="var(--c-fat)" stroke="var(--c-surface)" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function WaterChart({ data, target }: { data: { date: string; label: string; ml: number }[]; target: number }) {
  return (
    <ChartCard
      title="Wasser pro Tag"
      summary={`Gestrichelte Linie: Ziel ${fmtInt(target)} ml`}
      table={<SimpleTable head={['Datum', 'ml']} rows={data.filter((d) => d.ml > 0).map((d) => [fmtDate(d.date), fmtInt(d.ml)])} />}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -4, bottom: 0 }} barCategoryGap="20%">
          {grid}
          <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
          <YAxis {...axis} tickFormatter={(v: number) => fmtInt(v)} width={52} domain={[0, (max: number) => Math.max(max, target * 1.1)]} />
          <Tooltip content={<Tip unit="ml" />} cursor={{ fill: 'var(--c-surface-2)' }} />
          <ReferenceLine y={target} stroke="var(--c-muted)" strokeDasharray="4 4" strokeWidth={1.5} />
          <Bar dataKey="ml" name="Wasser" fill="var(--c-water)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function WeightChart({ data }: { data: { date: string; label: string; kg: number }[] }) {
  const values = data.map((d) => d.kg)
  const min = Math.floor(Math.min(...values) - 1)
  const max = Math.ceil(Math.max(...values) + 1)
  return (
    <ChartCard
      title="Gewicht"
      summary={data.length ? `${fmt1(data[data.length - 1].kg)} kg zuletzt` : undefined}
      table={<SimpleTable head={['Datum', 'kg']} rows={data.map((d) => [fmtDate(d.date), fmt1(d.kg)])} />}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
          {grid}
          <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
          <YAxis {...axis} domain={[min, max]} width={52} tickFormatter={(v: number) => fmt1(v)} />
          <Tooltip content={<Tip unit="kg" />} cursor={{ stroke: 'var(--c-muted)', strokeWidth: 1 }} />
          <Line
            type="monotone"
            dataKey="kg"
            name="Gewicht"
            stroke="var(--c-brand)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--c-brand)', stroke: 'var(--c-surface)', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
