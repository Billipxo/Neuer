import { CheckCircle2, Download, Share, SquarePlus } from 'lucide-react'
import { useInstall } from '../../app/install'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'

/** „Als App installieren“: Knopf, wo der Browser das anbietet, sonst eine kurze Anleitung */
export function InstallSection() {
  const install = useInstall()
  const toast = useToast()

  if (install.installed) {
    return (
      <p className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="size-5 shrink-0 text-brand" aria-hidden /> Teller läuft als App auf diesem Gerät.
      </p>
    )
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted">
        Als App auf dem Startbildschirm öffnet Teller ohne Adressleiste, startet schneller und funktioniert auch ohne Netz.
      </p>
      {install.canPrompt ? (
        <Button
          block
          icon={<Download className="size-4" aria-hidden />}
          onClick={async () => {
            if (await install.prompt()) toast('Teller wird installiert', '📲')
          }}
        >
          Als App installieren
        </Button>
      ) : install.platform === 'ios' ? (
        <ol className="list-decimal space-y-1.5 pl-5" aria-label="So geht’s auf dem iPhone">
          <li>Teller in <strong>Safari</strong> öffnen.</li>
          <li>
            Unten auf <strong>Teilen</strong> <Share className="inline size-4 align-text-bottom" aria-label="(Symbol: Quadrat mit Pfeil)" /> tippen.
          </li>
          <li>
            <strong>Zum Home-Bildschirm</strong> <SquarePlus className="inline size-4 align-text-bottom" aria-hidden /> wählen und „Hinzufügen“ tippen.
          </li>
        </ol>
      ) : (
        <ol className="list-decimal space-y-1.5 pl-5" aria-label="So geht’s im Browser">
          <li>Teller in Chrome (Android: auch Samsung Internet oder Edge) öffnen.</li>
          <li>
            Im Menü <strong>⋮</strong> auf <strong>App installieren</strong> bzw. <strong>Zum Startbildschirm hinzufügen</strong> tippen.
          </li>
        </ol>
      )}
      <p className="text-xs text-muted">
        Für ein weiteres Handy: den Link zu Teller dort öffnen, anmelden und genauso installieren. Im gemeinsamen Haushalt
        seht ihr dann denselben Wochenplan und dieselbe Einkaufsliste.
      </p>
    </div>
  )
}
