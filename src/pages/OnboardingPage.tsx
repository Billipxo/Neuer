import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import type { Profile } from '../types'
import { useSaveProfile } from '../hooks/data'
import { Button, IconButton } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { BodyForm } from '../components/profile/BodyForm'
import { GoalPicker, KcalTargetEditor, MacroEditor } from '../components/profile/TargetEditor'
import { defaultDraft, type ProfileDraft } from '../components/profile/types'
import { sumPercents } from '../lib/nutrition'
import { Switch } from '../components/ui/Switch'
import { AirfryerIcon } from '../components/recipes/AirfryerIcon'
import { DietPicker } from '../components/profile/DietPicker'

const STEPS = ['Name', 'Körperdaten', 'Ziel', 'Makros'] as const

export function OnboardingPage({ existing }: { existing: Profile | null }) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<ProfileDraft>(() => defaultDraft(existing))
  const save = useSaveProfile()
  const patch = (p: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, ...p }))

  const macroOk = sumPercents({ protein: draft.protein_pct, carbs: draft.carbs_pct, fat: draft.fat_pct }) === 100
  const canNext = step === 0 ? draft.name.trim().length > 0 : step === 3 ? macroOk : true

  async function finish() {
    await save.mutateAsync({ ...draft, name: draft.name.trim(), onboarded: true })
  }

  return (
    <main className="safe-top mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-6">
      <div className="flex items-center gap-2 pt-4">
        <IconButton label="Zurück" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="-ml-2">
          <ChevronLeft className="size-6" />
        </IconButton>
        <div
          className="flex flex-1 gap-1.5"
          role="progressbar"
          aria-label="Fortschritt der Einrichtung"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-valuetext={`Schritt ${step + 1} von ${STEPS.length}: ${STEPS[step]}`}
        >
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition ${i <= step ? 'bg-brand' : 'bg-surface-2'}`} />
          ))}
        </div>
        <span className="w-11" />
      </div>

      <div key={step} className="flex-1 animate-fade-up pt-6">
        {step === 0 && (
          <>
            <h1 className="text-2xl font-bold">Willkommen bei Teller 👋</h1>
            <p className="mt-1 text-muted">Ein paar kurze Fragen, dann kann es losgehen. Alles lässt sich später ändern.</p>
            <Field
              className="mt-6"
              label="Wie dürfen wir dich nennen?"
              autoComplete="given-name"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Vorname"
            />
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold">Körperdaten (optional)</h1>
            <p className="mt-1 mb-6 text-muted">
              Damit kann die App einen Vorschlag für dein Tagesziel berechnen. Du kannst den Schritt auch überspringen.
            </p>
            <BodyForm draft={draft} onChange={patch} showTarget={false} />
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold">Was ist dein Ziel?</h1>
            <p className="mt-1 mb-6 text-muted">Wähle frei – das Tagesziel legst du selbst fest.</p>
            <GoalPicker draft={draft} onChange={patch} />
            <div className="mt-6">
              <KcalTargetEditor draft={draft} onChange={patch} />
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="text-2xl font-bold">Makro-Verteilung (optional)</h1>
            <p className="mt-1 mb-6 text-muted">
              Ein Vorschlag als Startpunkt: 25 % Eiweiß, 45 % Kohlenhydrate, 30 % Fett. Passe es an, wie es für dich passt.
            </p>
            <MacroEditor draft={draft} onChange={patch} />
            <div className="mt-8 space-y-5 rounded-2xl bg-surface p-4 ring-1 ring-line/60">
              <DietPicker value={draft.diet} onChange={(diet) => patch({ diet })} />
              <Switch
                label="Ich habe eine Heißluftfritteuse"
                description="Dann zeigen Rezepte zuerst die Zubereitung darin."
                checked={draft.has_airfryer}
                onChange={(v) => patch({ has_airfryer: v })}
                icon={<AirfryerIcon className="size-6 shrink-0 text-brand" />}
              />
            </div>
          </>
        )}
      </div>

      {save.error && (
        <p role="alert" className="mb-3 text-sm text-danger">
          Speichern fehlgeschlagen: {(save.error as Error).message}
        </p>
      )}
      <div className="flex gap-3">
        {step === 1 && (
          <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep(2)}>
            Überspringen
          </Button>
        )}
        <Button
          size="lg"
          className="flex-1"
          disabled={!canNext || save.isPending}
          onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : finish())}
        >
          {step < STEPS.length - 1 ? 'Weiter' : save.isPending ? 'Speichern …' : 'Los geht’s'}
        </Button>
      </div>
    </main>
  )
}
