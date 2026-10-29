import { useState } from 'react';
import { Link } from 'react-router-dom';
import { nachUpdateSuchen, type UpdateErgebnis } from '../components/appUpdate';
import { Seite } from '../components/Seite';
import { spieleTon } from '../components/toene';
import { Chip, Schalter, Stepper, knopf } from '../components/ui';
import { useDaten } from '../db/DatenContext';
import { istGueltigesDatum } from '../logic/datum';
import { STANDARD_PROFIL, type Profil } from '../types';

const THEMES: { wert: Profil['theme']; text: string }[] = [
  { wert: 'system', text: 'Wie System' },
  { wert: 'hell', text: '☀️ Hell' },
  { wert: 'dunkel', text: '🌙 Dunkel' },
];
const RUNDEN = [10, 20, 30, 50];
const ZIEL_SCHRITT = 5;
const ZIEL_MIN = 5;
const ZIEL_MAX = 200;

const UPDATE_TEXT: Record<UpdateErgebnis, string> = {
  neu: 'Neue Version gefunden. Sobald sie geladen ist, erscheint oben „Aktualisieren“.',
  aktuell: 'Du hast die neueste Version.',
  anmeldung: 'Ohne Anmeldung ist keine Update-Prüfung möglich. Benutzername und Passwort sind die des geschützten Ordners.',
  offline: 'Keine Internetverbindung – die App läuft offline weiter.',
  fehler: 'Die Update-Prüfung hat nicht geklappt. Versuch es später noch einmal.',
  'nicht-verfuegbar': 'Updates gibt es nur in der veröffentlichten App, nicht im Entwicklungsmodus.',
};
const APP_STAND = new Date(__APP_STAND__).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

export function EinstellungenSeite() {
  const { profil, aendereProfil } = useDaten();
  const [update, setUpdate] = useState<UpdateErgebnis | 'sucht' | null>(null);
  const updateSuchen = async () => {
    setUpdate('sucht');
    setUpdate(await nachUpdateSuchen());
  };
  return (
    <Seite titel="Einstellungen">
      <Link to="/mehr" className="-mt-2 mb-3 inline-block text-sm text-slate-500 dark:text-slate-400">
        ‹ Mehr
      </Link>

      <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Ziele</h2>
      <div className="space-y-2">
        <Stepper
          titel="Tagesziel"
          text="Fragen pro Tag (+50 XP beim Erreichen)"
          wert={profil.tagesziel}
          min={ZIEL_MIN}
          max={ZIEL_MAX}
          schritt={ZIEL_SCHRITT}
          onChange={(tagesziel) => aendereProfil({ tagesziel })}
        />
        <label className="block rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <span className="block font-medium">Schriftliche Prüfung am</span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">Für Countdown und empfohlenes Tagespensum</span>
          <input
            type="date"
            value={profil.pruefungsDatum}
            onChange={(e) => istGueltigesDatum(e.target.value) && aendereProfil({ pruefungsDatum: e.target.value })}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950 dark:[color-scheme:dark]"
          />
          {profil.pruefungsDatum !== STANDARD_PROFIL.pruefungsDatum && (
            <button
              type="button"
              className="mt-2 text-sm text-slate-600 underline dark:text-slate-300"
              onClick={() => aendereProfil({ pruefungsDatum: STANDARD_PROFIL.pruefungsDatum })}
            >
              Zurück auf 30.01.2027
            </button>
          )}
        </label>
      </div>

      <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Darstellung</h2>
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
        <Schalter
          titel="Töne bei Antworten"
          text="Kurzer Ton bei richtig und falsch. In der Prüfungssimulation bleibt es still."
          an={profil.toene}
          onChange={(an) => {
            aendereProfil({ toene: an });
            if (an) spieleTon('richtig');
          }}
        />
      </div>

      <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">App</h2>
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <p className="font-medium">Version vom {APP_STAND}</p>
        {__EINZELDATEI__ ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Eine neue Version bekommst du als neue Datei (PC) bzw. neue App (Android). Lade vorher unter „Daten &
            Sicherung“ eine Sicherung herunter – dann geht nichts verloren.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Neue Versionen werden automatisch gesucht. Klappt das nicht (z. B. im passwortgeschützten Ordner), hier von
              Hand suchen – der Browser fragt dann nach Benutzername und Passwort.
            </p>
            <button
              type="button"
              className={knopf('sekundaer', 'mt-3 w-full', 'mittel')}
              disabled={update === 'sucht'}
              onClick={updateSuchen}
            >
              {update === 'sucht' ? 'Suche …' : 'Nach Updates suchen'}
            </button>
            <p aria-live="polite" className="mt-2 text-sm text-slate-700 empty:hidden dark:text-slate-300">
              {update && update !== 'sucht' ? UPDATE_TEXT[update] : ''}
            </p>
          </>
        )}
      </div>
    </Seite>
  );
}
