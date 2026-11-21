import { useEffect, useState } from 'react'
import { Dumbbell, Info, LogOut, Moon, Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../app/auth'
import { applyTheme, getThemePref, type ThemePref } from '../app/theme'
import { useActivities, useProfile, useSaveProfile, useWeights } from '../hooks/data'
import { isMissingTableError } from '../data/store'
import { todayISO } from '../lib/dates'
import { sumPercents } from '../lib/nutrition'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Segmented } from '../components/ui/Segmented'
import { useToast } from '../components/ui/Toast'
import { BodyForm } from '../components/profile/BodyForm'
import { GoalPicker, KcalTargetEditor, MacroEditor, WaterTargetEditor } from '../components/profile/TargetEditor'
import { defaultDraft, type ProfileDraft } from '../components/profile/types'
import { DataSection } from '../components/profile/DataSection'
import { DeleteAccount } from '../components/profile/DeleteAccount'
import { BodyDataNote } from '../components/profile/BodyDataNote'
import { WelcomeTour } from '../components/onboarding/WelcomeTour'
import { HouseholdSection } from '../components/profile/HouseholdSection'
import { InstallSection } from '../components/profile/InstallSection'
import { Switch } from '../components/ui/Switch'
import { AirfryerIcon } from '../components/recipes/AirfryerIcon'
import { DietPicker } from '../components/profile/DietPicker'
import { AvoidPicker } from '../components/profile/AvoidPicker'
import { AchievementSummaryCard } from '../components/achievements/AchievementGrid'

export function ProfilePage() {
  const location = useLocation()
  const { data: profile } = useProfile()
  // Sport gibt es erst nach dem Datenbank-Update – vorher keine Einstellung dafür anbieten
  const activities = useActivities(todayISO())
  const activityAvailable = !(activities.error && isMissingTableError(activities.error))
  // „/profil#app“ (Hinweis „So geht’s“) springt zur Installations-Anleitung, sobald die Seite steht
  const ready = !!profile
  useEffect(() => {
    if (ready && location.hash === '#app') document.getElementById('app')?.scrollIntoView({ block: 'start' })
  }, [location.hash, ready])
  const { signOut, email, store } = useAuth()
  const { data: weights = [] } = useWeights()
  const save = useSaveProfile()
  const toast = useToast()
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const [theme, setTheme] = useState<ThemePref>(getThemePref)
  const [tourOpen, setTourOpen] = useState(false)

  useEffect(() => {
    if (profile && !draft) setDraft(defaultDraft(profile))
  }, [profile, draft])

  if (!draft || !profile) return null
  const patch = (p: Partial<ProfileDraft>) => setDraft((d) => (d ? { ...d, ...p } : d))
  const macroOk = sumPercents({ protein: draft.protein_pct, carbs: draft.carbs_pct, fat: draft.fat_pct }) === 100
  const dirty = JSON.stringify(defaultDraft(profile)) !== JSON.stringify(draft)

  return (
    <>
      <PageHeader title="Profil & Einstellungen" subtitle={store?.kind === 'local' ? 'Demo-Modus – Daten nur auf diesem Gerät' : email} back="/" />

      <SectionTitle>Erfolge</SectionTitle>
      <AchievementSummaryCard />

      <SectionTitle>Tagesziel</SectionTitle>
      <Card className="space-y-5">
        <GoalPicker draft={draft} onChange={patch} />
        <KcalTargetEditor draft={draft} onChange={patch} />
        {activityAvailable && (
          <Switch
            label="Sport aufs Tagesziel anrechnen"
            description="Der geschätzte Verbrauch erhöht das Tagesziel am jeweiligen Tag. Dein Alltag (Aktivitätsniveau) steckt schon im Tagesziel – deshalb ist das zunächst aus."
            checked={!!draft.activity_in_budget}
            onChange={(v) => patch({ activity_in_budget: v })}
            icon={<Dumbbell className="size-5 shrink-0 text-muted" aria-hidden />}
          />
        )}
      </Card>

      <SectionTitle>Makros</SectionTitle>
      <Card>
        <MacroEditor draft={draft} onChange={patch} />
      </Card>

      <SectionTitle>Über dich</SectionTitle>
      <Card className="space-y-4">
        <Field
          label="Name"
          value={draft.name}
          onChange={(e) => patch({ name: e.target.value })}
          hint="Für die Begrüßung und als Vorschlag im gemeinsamen Haushalt – ein Spitzname reicht."
        />
        <BodyDataNote draft={draft} hasWeightLog={weights.length > 0} />
        <BodyForm draft={draft} onChange={patch} />
        <WaterTargetEditor draft={draft} onChange={patch} />
      </Card>

      <SectionTitle>Küche</SectionTitle>
      <Card className="space-y-5">
        <DietPicker value={draft.diet} onChange={(diet) => patch({ diet })} />
        <AvoidPicker value={draft.avoid} onChange={(avoid) => patch({ avoid })} />
        <Switch
          label="Heißluftfritteuse vorhanden"
          description="Rezepte zeigen dann zuerst die Zubereitung in der Heißluftfritteuse und werden in der Galerie bevorzugt."
          checked={draft.has_airfryer}
          onChange={(v) => patch({ has_airfryer: v })}
          icon={
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <AirfryerIcon className="size-5" />
            </span>
          }
        />
      </Card>

      <SectionTitle>Darstellung</SectionTitle>
      <Card>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Moon className="size-4" aria-hidden /> Farbschema
        </p>
        <Segmented<ThemePref>
          label="Farbschema"
          value={theme}
          onChange={(t) => {
            setTheme(t)
            applyTheme(t)
          }}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Hell' },
            { value: 'dark', label: 'Dunkel' },
          ]}
        />
      </Card>

      <div id="app" className="scroll-mt-4">
        <SectionTitle>App auf dem Handy</SectionTitle>
      </div>
      <Card>
        <InstallSection />
      </Card>

      <SectionTitle>Gemeinsamer Haushalt</SectionTitle>
      <Card>
        <HouseholdSection />
      </Card>

      <SectionTitle>Deine Daten</SectionTitle>
      <Card>
        <DataSection />
      </Card>

      <SectionTitle>Konto</SectionTitle>
      <Card className="space-y-2">
        <Button variant="secondary" block icon={<LogOut className="size-4" aria-hidden />} onClick={() => signOut()}>
          {store?.kind === 'local' ? 'Demo-Modus verlassen' : 'Abmelden'}
        </Button>
        <DeleteAccount />
        <Button variant="ghost" block className="text-brand!" icon={<Sparkles className="size-4" aria-hidden />} onClick={() => setTourOpen(true)}>
          Einführung noch einmal ansehen
        </Button>
        <Link to="/ueber" className="flex min-h-11 items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-brand hover:bg-surface-2">
          <Info className="size-4" aria-hidden /> Über Teller, Datenschutz & Impressum
        </Link>
      </Card>
      <WelcomeTour open={tourOpen} onClose={() => setTourOpen(false)} />

      <p className="mt-6 px-1 text-center text-xs text-muted">
        Teller ersetzt keine Ernährungs- oder medizinische Beratung. Alle Werte sind Richtwerte.
      </p>

      {dirty && (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4 safe-bottom">
          <div className="mx-auto max-w-lg animate-fade-up">
            <Button
              block
              size="lg"
              className="shadow-lg"
              disabled={!macroOk || save.isPending}
              onClick={async () => {
                const saved = await save.mutateAsync({ ...draft, onboarded: true })
                setDraft(defaultDraft(saved))
                toast('Einstellungen gespeichert', '✅')
              }}
            >
              {macroOk ? 'Änderungen speichern' : 'Makros müssen 100 % ergeben'}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
