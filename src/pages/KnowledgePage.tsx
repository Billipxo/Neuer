import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { GUIDE_CATEGORY_LABELS, GUIDES, type GuideCategory } from '../data/guides'
import { PageHeader } from '../components/layout/PageHeader'

const ORDER: GuideCategory[] = ['geraete', 'grundlagen', 'planen', 'wissen']

export function KnowledgePage() {
  return (
    <>
      <PageHeader title="Kochwissen" subtitle="Grundlagen, Garzeiten und Tipps für die Küche" back="/rezepte" />
      <div className="space-y-6">
        {ORDER.map((cat) => (
          <section key={cat} aria-labelledby={`cat-${cat}`}>
            <h2 id={`cat-${cat}`} className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
              {GUIDE_CATEGORY_LABELS[cat]}
            </h2>
            <ul className="space-y-2">
              {GUIDES.filter((g) => g.category === cat).map((g) => (
                <li key={g.id}>
                  <Link
                    to={`/rezepte/wissen/${g.id}`}
                    className="flex items-center gap-3 rounded-3xl bg-surface p-3 ring-1 ring-line/60 transition active:scale-[0.99] hover:ring-brand/40"
                  >
                    <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft/70 text-3xl">
                      {g.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug">{g.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{g.summary}</span>
                      <span className="mt-1 block text-xs text-muted">{g.minutes} Min. Lesezeit</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
