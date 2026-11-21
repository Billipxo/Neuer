import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { NotebookPen } from 'lucide-react'
import type { ActivityLog } from '../../types'
import { ACTIVITY_TYPES, QUICK_ACTIVITY_KEYS, activityType } from '../../data/activities'
import { DEFAULT_WEIGHT_KG, estimateKcal } from '../../lib/activity'
import { fmtInt } from '../../lib/format'
import { useDeleteActivity, useSaveActivity } from '../../hooks/data'
import { useUndoToast } from '../../hooks/undo'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { ConfirmDeleteButton } from '../ui/ConfirmDeleteButton'
import { Field, Select } from '../ui/Field'
import { NumberInput } from '../ui/NumberInput'
import { Chip } from '../ui/Segmented'
import { Switch } from '../ui/Switch'
import { useToast } from '../ui/Toast'

const MINUTE_CHIPS = [15, 30, 45, 60, 90]
/** Hier passt das Trainingstagebuch mit Übungen, Sätzen und Gewichten */
const WITH_EXERCISES = ['krafttraining', 'hiit', 'crosstrainer', 'rudern', 'indoor-cycling', 'pilates', 'kampfsport']
const STEP_CHIPS = [5000, 8000, 10000, 12000]

/** Sporteinheit eintragen oder ändern: Sportart, Dauer (bzw. Schritte) – der Verbrauch wird geschätzt oder selbst eingetragen */
export function ActivitySheet({
  open,
  date,
  editing,
  weight,
  onClose,
}: {
  open: boolean
  date: string
  editing: ActivityLog | null
  weight: { kg: number; known: boolean }
  onClose: () => void
}) {
  const save = useSaveActivity()
  const del = useDeleteActivity()
  const toast = useToast()
  const undoToast = useUndoToast()
  const [kind, setKind] = useState('spazieren')
  const [minutes, setMinutes] = useState<number | null>(30)
  const [steps, setSteps] = useState<number | null>(8000)
  const [customName, setCustomName] = useState('')
  const [ownKcal, setOwnKcal] = useState<number | null>(null)
  const [useOwn, setUseOwn] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      const t = activityType(editing.kind)
      setKind(t ? editing.kind : 'eigene')
      setMinutes(editing.minutes)
      setSteps(editing.steps)
      setCustomName(t && !t.custom ? '' : editing.name)
      // Weicht der gespeicherte Wert von der Schätzung ab, war er selbst eingetragen
      const estimate = t ? estimateKcal(t, { minutes: editing.minutes, steps: editing.steps }, weight.kg) : -1
      setUseOwn(!t || t.custom || estimate !== editing.kcal)
      setOwnKcal(editing.kcal)
    } else {
      setKind('spazieren')
      setMinutes(30)
      setSteps(8000)
      setCustomName('')
      setUseOwn(false)
      setOwnKcal(null)
    }
  }, [open, editing, weight.kg])

  const type = activityType(kind) ?? ACTIVITY_TYPES[0]
  const estimate = estimateKcal(type, { minutes, steps }, weight.kg)
  const manual = type.custom || useOwn
  const kcal = manual ? (ownKcal ?? 0) : estimate
  const valid = type.steps ? !!steps && steps > 0 : type.custom ? !!customName.trim() && ownKcal !== null : !!minutes && minutes > 0
  const busy = save.isPending || del.isPending

  async function submit() {
    if (!valid) return
    await save.mutateAsync({
      id: editing?.id,
      date: editing?.date ?? date,
      kind: type.key,
      name: type.custom ? customName.trim() : type.name,
      minutes: type.steps ? null : minutes && minutes > 0 ? Math.round(minutes) : null,
      steps: type.steps ? Math.round(steps ?? 0) : null,
      kcal: Math.max(0, Math.round(kcal)),
    })
    toast(editing ? 'Sport geändert' : 'Sport eingetragen', '💪')
    onClose()
  }

  async function remove() {
    if (!editing) return
    await del.mutateAsync(editing.id)
    undoToast('Sport gelöscht', 'activity_logs', [editing])
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Sport bearbeiten' : 'Sport eintragen'}
      footer={
        <div className="space-y-2">
          <Button block size="lg" disabled={!valid || busy} onClick={submit}>
            {busy ? 'Speichern …' : editing ? 'Speichern' : `Eintragen · ${fmtInt(kcal)} kcal`}
          </Button>
          {editing && (
            <ConfirmDeleteButton block disabled={busy} onConfirm={remove} />
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Häufige Sportarten">
          {QUICK_ACTIVITY_KEYS.map((k) => {
            const t = activityType(k)!
            return (
              <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
                <span aria-hidden>{t.emoji}</span> {t.name.replace(/\s*\(.*\)$/, '')}
              </Chip>
            )
          })}
        </div>
        <Select
          label="Sportart"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          options={[...ACTIVITY_TYPES].sort((a, b) => a.name.localeCompare(b.name, 'de')).map((t) => ({ value: t.key, label: `${t.emoji} ${t.name}` }))}
        />

        {!editing && WITH_EXERCISES.includes(type.key) && (
          <Link
            to={`/training/eintragen?datum=${date}`}
            onClick={onClose}
            className="flex min-h-11 items-center gap-2 rounded-2xl bg-brand-soft px-3 text-sm font-medium text-brand"
          >
            <NotebookPen className="size-4 shrink-0" aria-hidden /> Mit Übungen, Sätzen und Gewichten eintragen
          </Link>
        )}

        {type.custom && <Field label="Was hast du gemacht?" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="z. B. Umzug, Kinderwagen schieben" />}

        {type.steps ? (
          <>
            <NumberInput label="Schritte" suffix="Schritte" value={steps} min={0} onChange={setSteps} />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Schnellauswahl Schritte">
              {STEP_CHIPS.map((n) => (
                <Chip key={n} active={steps === n} onClick={() => setSteps(n)}>
                  {fmtInt(n)}
                </Chip>
              ))}
            </div>
          </>
        ) : (
          <>
            <NumberInput label={type.custom ? 'Dauer (optional)' : 'Dauer'} suffix="Min." value={minutes} min={0} onChange={setMinutes} />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Schnellauswahl Dauer">
              {MINUTE_CHIPS.map((m) => (
                <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)}>
                  {m} Min.
                </Chip>
              ))}
            </div>
          </>
        )}

        {!type.custom && (
          <div className="rounded-2xl bg-surface-2 p-3 text-sm" aria-live="polite">
            <p className="font-semibold">≈ {fmtInt(estimate)} kcal zusätzlich verbraucht</p>
            <p className="mt-0.5 text-xs text-muted">
              Geschätzt (Richtwert, ohne Grundumsatz) mit {fmtInt(weight.kg)} kg
              {weight.known ? '' : ` – trag dein Gewicht ein, dann wird es genauer (jetzt gerechnet mit ${DEFAULT_WEIGHT_KG} kg)`}.
            </p>
          </div>
        )}
        {!type.custom && (
          <Switch
            label="Eigene kcal eintragen"
            description="Zum Beispiel den Wert von deiner Uhr oder dem Gerät im Studio"
            checked={useOwn}
            onChange={(v) => {
              setUseOwn(v)
              if (v && ownKcal === null) setOwnKcal(estimate)
            }}
          />
        )}
        {manual && <NumberInput label="Verbrauch" suffix="kcal" value={ownKcal} min={0} max={10000} onChange={setOwnKcal} />}
      </div>
    </Sheet>
  )
}
