import { useEffect, useState } from 'react'
import { Copy, LogOut, Minus, Pencil, Plus, RefreshCw, Share2, UserMinus, UserPlus, Users } from 'lucide-react'
import { useAuth } from '../../app/auth'
import { useHousehold } from '../../app/household'
import { useProfile } from '../../hooks/data'
import { useCreateHousehold, useJoinHousehold, useLeaveHousehold, useRemoveMember, useUpdateHousehold } from '../../hooks/household'
import { JOIN_MESSAGES, PENDING_INVITE_KEY, codeFromInput, displayName, inviteLink, inviteText, isInviteCode } from '../../lib/household'
import { copyText, shareText } from '../../lib/share'
import type { Household } from '../../types'
import { Button, IconButton } from '../ui/Button'
import { Field } from '../ui/Field'
import { Sheet } from '../ui/Sheet'
import { Switch } from '../ui/Switch'
import { useToast } from '../ui/Toast'

type SheetKind = 'create' | 'join' | 'edit' | 'leave' | null

const SHARED_NOTE = 'Geteilt werden Wochenplan, Einkaufsliste sowie eigene Rezepte und Gerichte (für die anderen nur lesbar).'
const PRIVATE_NOTE = 'Protokoll, Gewicht, Wasser, Ziele und Erfolge bleiben privat.'

function readPendingInvite(): string | null {
  try {
    return localStorage.getItem(PENDING_INVITE_KEY)
  } catch {
    return null
  }
}
function clearPendingInvite() {
  try {
    localStorage.removeItem(PENDING_INVITE_KEY)
  } catch {
    /* nichts zu tun */
  }
}

/** Gemeinsamer Haushalt: gründen, beitreten, Mitglieder und Einladung verwalten */
export function HouseholdSection() {
  const { supported, available, loadFailed, household } = useHousehold()
  const { data: profile } = useProfile()
  const toast = useToast()
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [invite, setInvite] = useState('')
  const [pending] = useState(readPendingInvite)

  // Über einen Einladungslink gekommen: Beitritt gleich öffnen
  useEffect(() => {
    if (!pending || !supported || !available) return
    clearPendingInvite()
    if (household) {
      toast('Du bist bereits in einem Haushalt – verlasse ihn zuerst, um der Einladung zu folgen.', '👥')
      return
    }
    setInvite(pending)
    setSheet('join')
    // bewusst nur beim ersten Anzeigen der Karte
  }, [])

  if (!supported) {
    return (
      <div className="space-y-2 text-sm">
        <p>
          Mit Konto können mehrere Personen <strong>einen Wochenplan und eine Einkaufsliste</strong> gemeinsam führen – jede mit dem eigenen
          Handy.
        </p>
        <p className="text-muted">Im Demo-Modus bleiben alle Daten auf diesem Gerät. Zum gemeinsamen Planen den Demo-Modus verlassen und anmelden.</p>
        {pending && (
          <p role="status" className="rounded-2xl bg-surface-2 p-3">
            Du hast eine Einladung geöffnet (Code {pending}). Nach dem Anmelden geht es direkt zum Beitritt.
          </p>
        )}
      </div>
    )
  }

  if (loadFailed) {
    return <p className="text-sm text-muted">Der gemeinsame Haushalt konnte gerade nicht geladen werden. Bitte später noch einmal versuchen.</p>
  }

  if (!available) {
    return (
      <p className="text-sm text-muted">
        Die Datenbank kennt den gemeinsamen Haushalt noch nicht. Dafür muss einmal die neueste Migration eingespielt werden (siehe Anleitung,
        Abschnitt „Updates der Datenbank“).
      </p>
    )
  }

  const myName = profile?.name ?? ''

  return (
    <>
      {household ? (
        <HouseholdDetails household={household} onEdit={() => setSheet('edit')} onLeave={() => setSheet('leave')} />
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            Führt <strong>einen Wochenplan und eine Einkaufsliste gemeinsam</strong> – wer etwas einplant oder abhakt, sehen alle sofort.
          </p>
          <p className="text-xs text-muted">
            {SHARED_NOTE} {PRIVATE_NOTE}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button icon={<Users className="size-4" aria-hidden />} onClick={() => setSheet('create')}>
              Haushalt gründen
            </Button>
            <Button
              variant="secondary"
              icon={<UserPlus className="size-4" aria-hidden />}
              onClick={() => {
                setInvite('')
                setSheet('join')
              }}
            >
              Mit Code beitreten
            </Button>
          </div>
        </div>
      )}

      <CreateSheet open={sheet === 'create'} onClose={() => setSheet(null)} defaultName={myName} />
      <JoinSheet open={sheet === 'join'} onClose={() => setSheet(null)} defaultName={myName} code={invite} />
      {household && <EditSheet open={sheet === 'edit'} onClose={() => setSheet(null)} household={household} />}
      {household && <LeaveSheet open={sheet === 'leave'} onClose={() => setSheet(null)} household={household} />}
    </>
  )
}

function HouseholdDetails({ household, onEdit, onLeave }: { household: Household; onEdit: () => void; onLeave: () => void }) {
  const { userId } = useAuth()
  const { isOwner } = useHousehold()
  const update = useUpdateHousehold()
  const remove = useRemoveMember()
  const toast = useToast()
  const link = inviteLink(window.location.origin, household.invite_code)

  async function share() {
    const outcome = await shareText({ title: `Einladung in den Haushalt „${household.name}“`, text: inviteText(household, link) })
    if (outcome === 'copied') toast('Einladung in die Zwischenablage kopiert', '📋')
    if (outcome === 'failed') toast('Teilen nicht möglich – bitte den Code weitergeben')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Users className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{household.name}</p>
          <p className="text-xs text-muted">
            {household.members.length === 1 ? 'Noch allein – lade jemanden ein' : `${household.members.length} Mitglieder`} · gemeinsamer Plan und
            Einkaufsliste
          </p>
        </div>
        <IconButton label="Haushalt bearbeiten" onClick={onEdit}>
          <Pencil className="size-4" />
        </IconButton>
      </div>

      <ul aria-label="Mitglieder" className="divide-y divide-line/60 rounded-2xl bg-surface-2/60 px-3">
        {household.members.map((m) => {
          const name = displayName(m)
          const mine = m.user_id === userId
          return (
            <li key={m.user_id} className="flex min-h-12 items-center gap-3 py-1.5">
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                {name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {name}
                {mine && <span className="text-muted"> · du</span>}
              </span>
              {m.role === 'owner' && <span className="shrink-0 text-xs text-muted">gegründet</span>}
              {isOwner && !mine && (
                <IconButton
                  label={`${name} aus dem Haushalt entfernen`}
                  className="size-10 text-muted"
                  disabled={remove.isPending}
                  onClick={async () => {
                    if (!confirm(`${name} aus dem Haushalt entfernen? ${name} behält eine eigene Kopie von Plan und Einkaufsliste.`)) return
                    await remove.mutateAsync(m.user_id)
                    toast(`${name} ist nicht mehr im Haushalt`)
                  }}
                >
                  <UserMinus className="size-4" />
                </IconButton>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium" id="eaters-label">
            Personen am Tisch
          </p>
          <p className="text-xs text-muted">Portionen im Plan gelten pro Person – die Einkaufsliste rechnet für alle.</p>
        </div>
        <div role="group" aria-labelledby="eaters-label" className="flex shrink-0 items-center gap-1">
          <IconButton
            label="Eine Person weniger"
            className="size-10 bg-surface-2"
            disabled={household.eaters <= 1 || update.isPending}
            onClick={() => update.mutate({ eaters: household.eaters - 1 })}
          >
            <Minus className="size-4" />
          </IconButton>
          <output className="w-8 text-center font-semibold tabular" aria-live="polite">
            {household.eaters}
          </output>
          <IconButton
            label="Eine Person mehr"
            className="size-10 bg-surface-2"
            disabled={household.eaters >= 20 || update.isPending}
            onClick={() => update.mutate({ eaters: household.eaters + 1 })}
          >
            <Plus className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="rounded-2xl bg-surface-2/60 p-3">
        <p className="text-xs text-muted">Einladungscode</p>
        <p className="mt-0.5 font-mono text-xl font-semibold tracking-wider" aria-label={`Einladungscode ${household.invite_code}`}>
          {household.invite_code}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="sm" icon={<Share2 className="size-4" aria-hidden />} onClick={share}>
            Einladung teilen
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<Copy className="size-4" aria-hidden />}
            onClick={async () => toast((await copyText(household.invite_code)) ? 'Code kopiert' : 'Kopieren nicht möglich', '📋')}
          >
            Code kopieren
          </Button>
        </div>
        <button
          type="button"
          className="mt-2 flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-xs text-muted underline-offset-2 hover:underline disabled:opacity-50"
          disabled={update.isPending}
          onClick={async () => {
            if (!confirm('Neuen Einladungscode erzeugen? Der bisherige Code und alte Einladungslinks gelten dann nicht mehr.')) return
            await update.mutateAsync({ newCode: true })
            toast('Neuer Einladungscode erzeugt')
          }}
        >
          <RefreshCw className="size-3.5" aria-hidden /> Neuen Code erzeugen
        </button>
      </div>

      <Button variant="ghost" block className="text-danger" icon={<LogOut className="size-4" aria-hidden />} onClick={onLeave}>
        Haushalt verlassen
      </Button>
    </div>
  )
}

function CreateSheet({ open, onClose, defaultName }: { open: boolean; onClose: () => void; defaultName: string }) {
  const create = useCreateHousehold()
  const toast = useToast()
  const [name, setName] = useState('')
  const [me, setMe] = useState(defaultName)
  const [bring, setBring] = useState(true)

  useEffect(() => {
    if (open) {
      setName('')
      setMe(defaultName)
      setBring(true)
    }
  }, [open, defaultName])

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Haushalt gründen"
      footer={
        <Button
          block
          size="lg"
          disabled={!name.trim() || create.isPending}
          onClick={async () => {
            const household = await create.mutateAsync({ name: name.trim(), displayName: me.trim(), bring })
            toast(`„${household.name}“ gegründet – lade jetzt jemanden ein`, '👥')
            onClose()
          }}
        >
          {create.isPending ? 'Wird angelegt …' : 'Haushalt gründen'}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Name des Haushalts" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Familie Müller oder WG Sonnenallee" maxLength={60} autoComplete="off" />
        <Field label="Dein Name im Haushalt" value={me} onChange={(e) => setMe(e.target.value)} hint="So sehen dich die anderen, z. B. bei eingeplanten Mahlzeiten." maxLength={40} autoComplete="off" />
        <Switch
          label="Meinen Plan und meine Einkaufsliste mitnehmen"
          description="Wochenplan ab heute und alle Einkaufsartikel werden zum gemeinsamen Bestand. Sonst bleiben sie privat gespeichert."
          checked={bring}
          onChange={setBring}
        />
        <p className="text-xs text-muted">
          {SHARED_NOTE} {PRIVATE_NOTE}
        </p>
      </div>
    </Sheet>
  )
}

function JoinSheet({ open, onClose, defaultName, code }: { open: boolean; onClose: () => void; defaultName: string; code: string }) {
  const join = useJoinHousehold()
  const toast = useToast()
  const [input, setInput] = useState(code)
  const [me, setMe] = useState(defaultName)
  const [bring, setBring] = useState(true)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setInput(code)
      setMe(defaultName)
      setBring(true)
      setProblem(null)
    }
  }, [open, code, defaultName])

  const normalized = codeFromInput(input)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Haushalt beitreten"
      footer={
        <Button
          block
          size="lg"
          disabled={!isInviteCode(normalized) || join.isPending}
          onClick={async () => {
            setProblem(null)
            const result = await join.mutateAsync({ code: normalized, displayName: me.trim(), bring })
            if (result.status === 'joined') {
              toast(`Willkommen im Haushalt „${result.household?.name ?? ''}“`, '👥')
              onClose()
            } else {
              setProblem(JOIN_MESSAGES[result.status])
            }
          }}
        >
          {join.isPending ? 'Trete bei …' : 'Beitreten'}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field
          label="Einladungscode oder Link"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="XXXXX-XXXXX"
          hint="Den Code findet ein Mitglied unter Profil → Gemeinsamer Haushalt."
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
        <Field label="Dein Name im Haushalt" value={me} onChange={(e) => setMe(e.target.value)} maxLength={40} autoComplete="off" />
        <Switch
          label="Meinen Plan und meine Einkaufsliste mitbringen"
          description="Wochenplan ab heute und alle Einkaufsartikel kommen in den gemeinsamen Bestand. Sonst bleiben sie privat gespeichert."
          checked={bring}
          onChange={setBring}
        />
        {problem && (
          <p role="alert" className="text-sm text-danger">
            {problem}
          </p>
        )}
        <p className="text-xs text-muted">
          {SHARED_NOTE} {PRIVATE_NOTE}
        </p>
      </div>
    </Sheet>
  )
}

function EditSheet({ open, onClose, household }: { open: boolean; onClose: () => void; household: Household }) {
  const { me } = useHousehold()
  const update = useUpdateHousehold()
  const toast = useToast()
  const [name, setName] = useState(household.name)
  const [mine, setMine] = useState(me?.display_name ?? '')

  useEffect(() => {
    if (open) {
      setName(household.name)
      setMine(me?.display_name ?? '')
    }
  }, [open, household.name, me?.display_name])

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Haushalt bearbeiten"
      footer={
        <Button
          block
          size="lg"
          disabled={!name.trim() || update.isPending}
          onClick={async () => {
            await update.mutateAsync({ name: name.trim(), displayName: mine.trim() })
            toast('Gespeichert')
            onClose()
          }}
        >
          Speichern
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Name des Haushalts" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="off" />
        <Field label="Dein Name im Haushalt" value={mine} onChange={(e) => setMine(e.target.value)} maxLength={40} autoComplete="off" />
      </div>
    </Sheet>
  )
}

function LeaveSheet({ open, onClose, household }: { open: boolean; onClose: () => void; household: Household }) {
  const leave = useLeaveHousehold()
  const toast = useToast()
  const [copy, setCopy] = useState(true)
  const last = household.members.length === 1

  useEffect(() => {
    if (open) setCopy(true)
  }, [open])

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Haushalt verlassen?"
      footer={
        <Button
          variant="danger"
          block
          size="lg"
          disabled={leave.isPending}
          onClick={async () => {
            await leave.mutateAsync(last ? true : copy)
            toast('Du hast den Haushalt verlassen')
            onClose()
          }}
        >
          {leave.isPending ? 'Einen Moment …' : 'Haushalt verlassen'}
        </Button>
      }
    >
      <div className="space-y-4 text-sm">
        {last ? (
          <p>
            Du bist das letzte Mitglied. Der Haushalt wird aufgelöst – der gemeinsame Plan und die Einkaufsliste werden wieder deine eigenen.
          </p>
        ) : (
          <>
            <p>
              Die anderen behalten den gemeinsamen Plan und die Einkaufsliste – auch das, was du eingetragen hast. Deine Rezepte und Gerichte
              sehen sie danach nicht mehr.
            </p>
            <Switch
              label="Kopie mitnehmen"
              description="Wochenplan ab heute und offene Einkäufe als eigene Kopie behalten."
              checked={copy}
              onChange={setCopy}
            />
          </>
        )}
        <p className="text-muted">Was vor dem Haushalt privat war, ist danach wieder da.</p>
      </div>
    </Sheet>
  )
}
