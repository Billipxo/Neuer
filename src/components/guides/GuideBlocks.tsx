import { Lightbulb } from 'lucide-react'
import type { GuideBlock } from '../../data/guides'
import { weightRows } from '../../lib/guides'
import { MONTH_NAMES, MONTH_SHORT, seasonRows } from '../../lib/season'

function Table({ title, head, rows }: { title?: string; head: string[]; rows: string[][] }) {
  // Ab drei Spalten als kompakte Liste – Tabellen wären auf dem Handy zu breit
  if (head.length >= 3) {
    return (
      <figure className="overflow-hidden rounded-3xl bg-surface ring-1 ring-line/60">
        {title && <figcaption className="px-4 pt-3 font-semibold">{title}</figcaption>}
        <ul className="divide-y divide-line/60">
          {rows.map((r, i) => (
            <li key={i} className="px-4 py-2.5">
              <p className="font-medium">
                <span className="sr-only">{head[0]}: </span>
                {r[0]}
              </p>
              <p className="text-sm tabular">
                {r.slice(1, 3).map((c, j) => (
                  <span key={j}>
                    {j > 0 && <span aria-hidden> · </span>}
                    <span className="sr-only">{head[j + 1]}: </span>
                    <span className="whitespace-nowrap font-semibold text-brand">{c}</span>
                  </span>
                ))}
              </p>
              {r.slice(3).filter(Boolean).map((c, j) => (
                <p key={j} className="text-sm text-muted">
                  <span className="sr-only">{head[j + 3]}: </span>
                  {c}
                </p>
              ))}
            </li>
          ))}
        </ul>
      </figure>
    )
  }
  return (
    <figure className="overflow-hidden rounded-3xl bg-surface ring-1 ring-line/60">
      {title && <figcaption className="px-4 pt-3 font-semibold">{title}</figcaption>}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-muted">
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line/60 align-top">
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-4 py-2 font-medium">
                    {c}
                  </th>
                ) : (
                  <td key={j} className="px-4 py-2 tabular">
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

function SeasonCalendar() {
  const month = new Date().getMonth() + 1
  const rows = seasonRows(month)
  return (
    <figure className="overflow-hidden rounded-3xl bg-surface ring-1 ring-line/60">
      <figcaption className="px-4 pt-3 font-semibold">
        Jetzt im {MONTH_NAMES[month - 1]}: {rows.filter((r) => r.months.includes(month)).length} Sorten mit Saison
      </figcaption>
      <div className="overflow-x-auto pb-2">
        <table className="w-full min-w-[20rem] text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Sorte
              </th>
              {MONTH_SHORT.map((m, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`w-6 py-2 text-center font-medium ${i + 1 === month ? 'rounded-t-md bg-brand-soft text-brand' : ''}`}
                  aria-label={MONTH_NAMES[i]}
                >
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-line/50">
                <th scope="row" className={`px-3 py-1.5 text-left font-medium ${r.months.includes(month) ? '' : 'text-muted'}`}>
                  {r.name}
                </th>
                {MONTH_SHORT.map((_, i) => {
                  const on = r.months.includes(i + 1)
                  return (
                    <td key={i} className={`py-1.5 text-center ${i + 1 === month ? 'bg-brand-soft' : ''}`}>
                      <span
                        className={`mx-auto block size-3 rounded-full ${on ? 'bg-brand' : 'bg-surface-2'}`}
                        aria-label={`${MONTH_NAMES[i]}: ${on ? 'Saison' : 'keine Saison'}`}
                        role="img"
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}

export function GuideBlocks({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'text':
            return (
              <p key={i} className="leading-relaxed">
                {b.text}
              </p>
            )
          case 'list':
            return (
              <section key={i}>
                {b.title && <h2 className="mb-2 font-semibold">{b.title}</h2>}
                <ul className="space-y-2">
                  {b.items.map((t, j) => (
                    <li key={j} className="flex gap-2.5 leading-relaxed">
                      <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )
          case 'steps':
            return (
              <section key={i}>
                {b.title && <h2 className="mb-2 font-semibold">{b.title}</h2>}
                <ol className="space-y-3">
                  {b.items.map((t, j) => (
                    <li key={j} className="flex gap-3">
                      <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-ink">
                        {j + 1}
                      </span>
                      <p className="pt-0.5 leading-relaxed">
                        <span className="sr-only">Schritt {j + 1}: </span>
                        {t}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            )
          case 'table':
            return <Table key={i} title={b.title} head={b.head} rows={b.rows} />
          case 'tip':
            return (
              <p key={i} className="flex gap-2.5 rounded-2xl bg-carbs/10 p-4 leading-relaxed">
                <Lightbulb className="mt-0.5 size-5 shrink-0 text-carbs" aria-hidden />
                <span>{b.text}</span>
              </p>
            )
          case 'generated':
            return b.kind === 'season' ? (
              <SeasonCalendar key={i} />
            ) : (
              <Table key={i} title="Durchschnittsgewichte" head={['Menge', 'Gewicht']} rows={weightRows()} />
            )
        }
      })}
    </div>
  )
}
