import { PageHeader } from '../components/layout/PageHeader'
import { AchievementGroups, NextUp, SeriesCard } from '../components/achievements/AchievementGrid'

/** Erfolge: Serien mit Rekord, „Fast geschafft“ und alle Abzeichen nach Bereichen */
export function AchievementsPage() {
  return (
    <>
      <PageHeader title="Erfolge" subtitle="Abzeichen und Serien – ganz ohne Druck" back />
      <h2 className="mb-2 mt-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">Deine Serien</h2>
      <SeriesCard />
      <NextUp />
      <AchievementGroups />
      <p className="mt-6 px-1 text-xs text-muted">
        Erreichte Abzeichen bleiben für immer. Eine Pause beendet höchstens eine Serie – dein Rekord bleibt, und mit dem nächsten Eintrag
        beginnt eine neue. Gezählt werden die letzten 12 Monate.
      </p>
    </>
  )
}
