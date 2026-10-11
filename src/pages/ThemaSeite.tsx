import { Link, Navigate, useParams } from 'react-router-dom';
import { Karte, Seite } from '../components/Seite';
import { AmpelLegende, Ampelbalken } from '../components/ui';
import { useDaten } from '../db/DatenContext';
import { statusVerteilung, waehleFragen, type LernModus } from '../logic/sitzung';
import { THEMEN, THEMA_IDS, type ThemaId } from '../types';

const MODI: { modus: LernModus; titel: string; text: string; icon: string }[] = [
  { modus: 'empfohlen', titel: 'Weiterlernen', text: 'Falsche und fällige Fragen zuerst, dann neue', icon: '▶' },
  { modus: 'neu', titel: 'Nur neue Fragen', text: 'Noch nie beantwortet', icon: '✨' },
  { modus: 'falsch', titel: 'Fehler wiederholen', text: 'Alle zuletzt falsch beantworteten Fragen', icon: '🔁' },
  { modus: 'markiert', titel: 'Markierte Fragen', text: 'Deine mit ★ markierten Fragen', icon: '★' },
  { modus: 'karten', titel: 'Karteikarten', text: 'Offene Fragen fürs Fachgespräch', icon: '🗂️' },
];

export function ThemaSeite() {
  const { thema = 'alle' } = useParams();
  const { fragen, fortschritte, profil, aendereProfil } = useDaten();
  if (thema !== 'alle' && !THEMA_IDS.includes(thema as ThemaId)) return <Navigate to="/lernen" replace />;
  const t = THEMEN.find((x) => x.id === thema);
  const themenFragen = t ? fragen.filter((f) => f.thema === t.id) : fragen;
  const v = statusVerteilung(themenFragen, fortschritte);
  const anzahl = (modus: LernModus) =>
    waehleFragen(fragen, fortschritte, { thema: thema as ThemaId | 'alle', modus, nurGeprueft: profil.nurGeprueft }).length;

  return (
    <Seite titel={t?.titel ?? 'Alle Themen'}>
      <Link to="/lernen" className="-mt-2 mb-3 inline-block text-sm text-slate-500 dark:text-slate-400">
        ‹ Alle Themen
      </Link>
      <Karte>
        {t && <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">{t.kurz}</p>}
        <Ampelbalken v={v} hoehe="h-3" />
        <div className="mt-2">
          <AmpelLegende v={v} />
        </div>
      </Karte>

      <ul className="mt-4 space-y-2">
        {MODI.map((m) => {
          const n = anzahl(m.modus);
          if (m.modus === 'karten' && n === 0) return null;
          const hervor = m.modus === 'empfohlen';
          const inhalt = (
            <>
              <span className="text-2xl" aria-hidden>
                {m.icon}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{m.titel}</span>
                <span className={`block text-sm ${hervor ? 'text-slate-800' : 'text-slate-500 dark:text-slate-400'}`}>{m.text}</span>
              </span>
              <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${hervor ? 'bg-white/60' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {m.modus === 'empfohlen' ? Math.min(n, profil.sitzungsLaenge) : n}
              </span>
            </>
          );
          const klassen =
            'flex min-h-16 w-full items-center gap-3 rounded-2xl p-4 text-left ring-1 transition ' +
            (hervor ? 'bg-marke-400 text-slate-900 ring-marke-500' : 'bg-white ring-slate-200 dark:bg-slate-900 dark:ring-slate-800');
          return (
            <li key={m.modus}>
              {n > 0 ? (
                <Link to={`/sitzung?thema=${thema}&modus=${m.modus}`} className={`${klassen} active:scale-[0.99]`}>
                  {inhalt}
                </Link>
              ) : (
                <div className={`${klassen} opacity-50`} aria-disabled>
                  {inhalt}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <label className="mt-6 flex min-h-12 items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <input
          type="checkbox"
          className="size-6 accent-marke-500"
          checked={profil.nurGeprueft}
          onChange={(e) => aendereProfil({ nurGeprueft: e.target.checked })}
        />
        <span>
          <span className="block font-medium">Nur geprüfte Fragen</span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">
            {themenFragen.filter((f) => f.geprueft).length} von {themenFragen.length} Fragen sind geprüft
          </span>
        </span>
      </label>
    </Seite>
  );
}
