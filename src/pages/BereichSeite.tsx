import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { BereichErklaerung } from '../components/BereichErklaerung';
import { FORMELN } from '../data/formeln';
import { formelnZumBereich } from '../logic/formeln';
import { LernModusListe } from '../components/LernModusListe';
import { Karte, Seite } from '../components/Seite';
import { AmpelLegende, Ampelbalken, Schalter, StatusPunkt, knopf } from '../components/ui';
import { BEREICHE } from '../data/bereiche';
import { useDaten } from '../db/DatenContext';
import { fragenIm } from '../logic/bereiche';
import { statusVerteilung, waehleFragen, type LernModus } from '../logic/sitzung';
import { THEMEN, THEMA_IDS, type ThemaId } from '../types';

/** Ein Themenbereich: Lernstand, Training starten, Erklärung zum Nachlesen, weitere Trainings und Fragenliste. */
export function BereichSeite() {
  const { thema = '', bereich: bereichId = '' } = useParams();
  const [params] = useSearchParams();
  const { fragen, fortschritte, profil, aendereProfil } = useDaten();
  const bereich = BEREICHE.find((b) => b.id === bereichId && b.thema === thema);
  if (!bereich) return <Navigate to={THEMA_IDS.includes(thema as ThemaId) ? `/lernen/${thema}` : '/lernen'} replace />;

  const t = THEMEN.find((x) => x.id === bereich.thema);
  const bereichsFragen = fragenIm(fragen, bereich);
  const v = statusVerteilung(bereichsFragen, fortschritte);
  const anzahl = (modus: LernModus) =>
    waehleFragen(fragen, fortschritte, { thema: bereich.thema, bereich, modus, nurGeprueft: profil.nurGeprueft }).length;
  const auswahl = `thema=${bereich.thema}&bereich=${bereich.id}`;
  const start = Math.min(anzahl('empfohlen'), profil.sitzungsLaenge);
  const vonErklaerungen = params.get('von') === 'erklaerungen';

  const startKnopf = (beschriftung: string, variante: 'primaer' | 'sekundaer') =>
    start > 0 ? (
      <Link to={`/sitzung?${auswahl}&modus=empfohlen`} className={knopf(variante, 'w-full')}>
        ▶ {beschriftung} ({start} {start === 1 ? 'Frage' : 'Fragen'})
      </Link>
    ) : (
      <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {bereichsFragen.length > 0 && profil.nurGeprueft
          ? 'Keine Fragen zum Üben – „Nur geprüfte Fragen“ ist eingeschaltet und in diesem Bereich ist noch keine Frage geprüft.'
          : 'In diesem Bereich gibt es keine Fragen mehr.'}
      </p>
    );

  return (
    <Seite titel={bereich.titel}>
      <Link
        to={vonErklaerungen ? '/lernen/erklaerungen' : `/lernen/${bereich.thema}`}
        className="-mt-2 mb-3 inline-block text-sm text-slate-500 dark:text-slate-400"
      >
        ‹ {vonErklaerungen ? 'Alle Erklärungen' : t?.titel}
      </Link>
      <Karte>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
          {t?.titel} · {bereichsFragen.length} {bereichsFragen.length === 1 ? 'Frage' : 'Fragen'}
        </p>
        <Ampelbalken v={v} hoehe="h-3" />
        <div className="mt-2">
          <AmpelLegende v={v} />
        </div>
      </Karte>

      <div className="mt-4">{startKnopf('Training starten', 'primaer')}</div>

      <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">📖 Erklärung</h2>
      <BereichErklaerung bereich={bereich} />
      {formelnZumBereich(bereich.id, FORMELN).map((g) => (
        <Link key={g.id} to={`/lernen/formeln?gruppe=${g.id}`} className={knopf('sekundaer', 'mt-3 w-full', 'mittel')}>
          📐 Formelsammlung: {g.titel}
        </Link>
      ))}

      <div className="mt-4">{startKnopf('Jetzt üben', 'sekundaer')}</div>

      <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Weitere Trainings</h2>
      <LernModusListe auswahl={auswahl} anzahl={anzahl} sitzungsLaenge={profil.sitzungsLaenge} ohne={['empfohlen']} />

      <details className="mt-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <summary className="cursor-pointer font-semibold">
          Alle {bereichsFragen.length} {bereichsFragen.length === 1 ? 'Frage' : 'Fragen'} dieses Bereichs
        </summary>
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          {bereichsFragen.map((f) => (
            <li key={f.id}>
              <Link to={`/mehr/frage/${f.id}`} className="flex items-start gap-3 py-3">
                <span className="pt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  <StatusPunkt status={fortschritte.get(f.id)?.status ?? 'neu'} mitText={false} />
                </span>
                <span className="line-clamp-2 flex-1 text-sm">{f.frage}</span>
                <span className="text-slate-400" aria-hidden>
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-6">
        <Schalter
          titel="Nur geprüfte Fragen"
          text={`${bereichsFragen.filter((f) => f.geprueft).length} von ${bereichsFragen.length} Fragen sind geprüft`}
          an={profil.nurGeprueft}
          onChange={(an) => aendereProfil({ nurGeprueft: an })}
        />
      </div>
    </Seite>
  );
}
