import { Info } from 'lucide-react'
import { DEFAULT_WEIGHT_KG } from '../../lib/activity'
import { missingBodyData } from '../../lib/nutrition'
import type { ProfileDraft } from './types'

/**
 * Wofür die Körperdaten gebraucht werden und was noch fehlt – damit nie unbemerkt mit Werten gerechnet wird, die man
 * gar nicht eingetragen hat.
 */
export function BodyDataNote({ draft, hasWeightLog }: { draft: ProfileDraft; hasWeightLog: boolean }) {
  const missing = missingBodyData(draft)
  const weightKnown = !missing.includes('Gewicht') || hasWeightLog
  return (
    <div className="flex gap-2 rounded-2xl bg-surface-2 p-3 text-sm" role="note">
      <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p>
          Körperdaten sind freiwillig. Die App nutzt sie nur für den Vorschlag fürs Tagesziel – das Gewicht auch, um den Verbrauch beim Sport zu
          schätzen.
        </p>
        {missing.length > 0 ? (
          <p className="text-muted">
            Noch leer: {missing.join(', ')}. Deshalb gibt es gerade keinen Kalorien-Vorschlag
            {weightKnown ? '' : `, und Sport wird mit ${DEFAULT_WEIGHT_KG} kg geschätzt (das steht dann jeweils dabei)`}.
          </p>
        ) : (
          <p className="text-muted">Alles eingetragen – Vorschlag und Sport-Schätzung rechnen mit deinen Angaben.</p>
        )}
      </div>
    </div>
  )
}
