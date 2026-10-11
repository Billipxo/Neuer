import { Link } from 'react-router-dom';
import { Seite } from '../components/Seite';
import { Chip, Schalter } from '../components/ui';
import { useDaten } from '../db/DatenContext';
import type { Profil } from '../types';

const THEMES: { wert: Profil['theme']; text: string }[] = [
  { wert: 'system', text: 'Wie System' },
  { wert: 'hell', text: '☀️ Hell' },
  { wert: 'dunkel', text: '🌙 Dunkel' },
];
const RUNDEN = [10, 20, 30, 50];

export function EinstellungenSeite() {
  const { profil, aendereProfil } = useDaten();
  return (
    <Seite titel="Einstellungen">
      <Link to="/mehr" className="-mt-2 mb-3 inline-block text-sm text-slate-500 dark:text-slate-400">
        ‹ Mehr
      </Link>

      <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Darstellung</h2>
      <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        {THEMES.map((t) => (
          <Chip key={t.wert} aktiv={profil.theme === t.wert} onClick={() => aendereProfil({ theme: t.wert })}>
            {t.text}
          </Chip>
        ))}
      </div>

      <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Lernen</h2>
      <div className="space-y-2">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="mb-2 font-medium">Fragen pro Lernrunde</p>
          <div className="flex flex-wrap gap-2">
            {RUNDEN.map((n) => (
              <Chip key={n} aktiv={profil.sitzungsLaenge === n} onClick={() => aendereProfil({ sitzungsLaenge: n })}>
                {n}
              </Chip>
            ))}
          </div>
        </div>
        <Schalter
          titel="Antworten mischen"
          text="Reihenfolge der Antworten bei jeder Frage neu, damit du dir keine Positionen merkst"
          an={profil.antwortenMischen}
          onChange={(an) => aendereProfil({ antwortenMischen: an })}
        />
        <Schalter
          titel="Nur geprüfte Fragen lernen"
          text="Gilt für Lernrunden; der Katalog zeigt weiterhin alle Fragen"
          an={profil.nurGeprueft}
          onChange={(an) => aendereProfil({ nurGeprueft: an })}
        />
      </div>
    </Seite>
  );
}
