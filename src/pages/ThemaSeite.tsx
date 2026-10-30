import { Link, Navigate, useParams } from 'react-router-dom';
import { LernModusListe } from '../components/LernModusListe';
import { Karte, Seite } from '../components/Seite';
import { ThemaKachel } from '../components/ThemaKachel';
import { AmpelLegende, Ampelbalken, Schalter } from '../components/ui';
import { BEREICHE } from '../data/bereiche';
import { useDaten } from '../db/DatenContext';
import { bereicheVon, fragenIm } from '../logic/bereiche';
import { statusVerteilung, waehleFragen, type LernModus } from '../logic/sitzung';
import { THEMEN, THEMA_IDS, type ThemaId } from '../types';

export function ThemaSeite() {
  const { thema = 'alle' } = useParams();
  const { fragen, fortschritte, profil, aendereProfil } = useDaten();
  if (thema !== 'alle' && !THEMA_IDS.includes(thema as ThemaId)) return <Navigate to="/lernen" replace />;
  const t = THEMEN.find((x) => x.id === thema);
  const themenFragen = t ? fragen.filter((f) => f.thema === t.id) : fragen;
  const bereiche = t ? bereicheVon(BEREICHE, t.id) : [];
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

      {bereiche.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Themenbereiche</h2>
          <p className="-mt-1 mb-2 text-sm text-slate-500 dark:text-slate-400">Mit Erklärung und eigenem Training</p>
          <ul className="space-y-2">
            {bereiche.map((b) => (
              <li key={b.id}>
                <ThemaKachel to={`/lernen/${b.thema}/${b.id}`} titel={b.titel} kurz={b.kurz} v={statusVerteilung(fragenIm(fragen, b), fortschritte)} />
              </li>
            ))}
          </ul>
          <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Ganzes Thema üben</h2>
        </>
      )}

      <div className={bereiche.length > 0 ? '' : 'mt-4'}>
        <LernModusListe auswahl={`thema=${thema}`} anzahl={anzahl} sitzungsLaenge={profil.sitzungsLaenge} />
      </div>

      <div className="mt-6">
        <Schalter
          titel="Nur geprüfte Fragen"
          text={`${themenFragen.filter((f) => f.geprueft).length} von ${themenFragen.length} Fragen sind geprüft`}
          an={profil.nurGeprueft}
          onChange={(an) => aendereProfil({ nurGeprueft: an })}
        />
      </div>
    </Seite>
  );
}
