import { Link } from 'react-router-dom';
import { Seite } from '../components/Seite';
import { Kachel, Meter, knopf } from '../components/ui';
import { BEREICHE } from '../data/bereiche';
import { useDaten } from '../db/DatenContext';
import { tagAusSchluessel, tageZwischen } from '../logic/datum';
import { LEVELS, heuteBeantwortet, lernserie, levelStand } from '../logic/motivation';
import { countdownText, pruefungsreife, tagespensum } from '../logic/reife';
import { statusVerteilung, waehleFragen, type LernModus } from '../logic/sitzung';

export function StartSeite() {
  const { fragen, fortschritte, profil, simulationen } = useDaten();
  const jetzt = Date.now();
  const pruefungTs = tagAusSchluessel(profil.pruefungsDatum);
  const tage = tageZwischen(jetzt, pruefungTs);
  const pensum = tagespensum(statusVerteilung(fragen, fortschritte), tage);
  const reife = pruefungsreife(fragen, fortschritte, simulationen);
  const heute = heuteBeantwortet(profil, jetzt);
  const serie = lernserie(profil.lernTage, jetzt);
  const stand = levelStand(profil.xp);
  const anzahl = (modus: LernModus) =>
    waehleFragen(fragen, fortschritte, { thema: 'alle', modus, nurGeprueft: profil.nurGeprueft }).length;
  const datumText = new Date(pruefungTs).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  const zielErreicht = heute >= profil.tagesziel;
  const lektionen = BEREICHE.filter((b) => profil.lektionen[b.id]).length;

  return (
    <Seite titel="TREI-Trainer">
      {/* Countdown – die eine große Zahl der Startseite */}
      <section className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm dark:bg-slate-800">
        <p className="text-sm text-slate-300">Schriftliche Prüfung · {datumText}</p>
        {tage > 1 ? (
          <p className="mt-1 text-5xl font-bold">
            {tage} <span className="text-2xl font-semibold">Tage</span>
          </p>
        ) : (
          <p className="mt-1 text-3xl font-bold">{countdownText(tage)}</p>
        )}
        {pensum !== null && (
          <p className="mt-2 text-sm text-slate-200">
            {pensum === 0 ? (
              'Alles gelernt – jetzt fällige Wiederholungen und Simulationen.'
            ) : (
              <>
                Empfohlen: <strong className="text-white">{pensum} Fragen pro Tag</strong> plus fällige Wiederholungen
              </>
            )}
          </p>
        )}
        {pensum !== null && pensum > profil.tagesziel && (
          <p className="mt-2 text-sm text-marke-400">
            Dein Tagesziel ({profil.tagesziel}) liegt darunter –{' '}
            <Link to="/mehr/einstellungen" className="underline">
              anpassen
            </Link>
          </p>
        )}
      </section>

      {/* Die drei Modi */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <ModusKachel to="/erklaeren" icon="📖" titel="Erklären" text={`${lektionen}/${BEREICHE.length} Lektionen`} />
        <ModusKachel to="/lernen" icon="✏️" titel="Üben" text="Fragen mit Lösung" />
        <ModusKachel to="/pruefung" icon="⏱️" titel="Prüfung" text="Mit Zeitlimit" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Kachel
          label="Heute"
          wert={
            <>
              {heute}
              <span className="text-lg font-medium text-slate-500 dark:text-slate-400"> / {profil.tagesziel}</span>
            </>
          }
          zusatz={zielErreicht ? '🎯 Tagesziel erreicht' : `noch ${profil.tagesziel - heute} bis zum Ziel`}
        >
          <Meter anteil={heute / profil.tagesziel} label="Tagesziel" />
        </Kachel>
        <Kachel
          label="Lernserie"
          wert={
            <>
              {serie.tage} <span className="text-lg font-medium">{serie.tage === 1 ? 'Tag' : 'Tage'}</span>
            </>
          }
          zusatz={serie.heuteGelernt ? '🔥 heute dabei' : serie.tage > 0 ? 'Heute lernen, Serie halten!' : 'Heute starten'}
        />
      </div>

      <Link to="/statistik" className="mt-3 block active:scale-[0.99]">
        <Kachel
          label="Prüfungsreife"
          wert={`${reife.prozent} %`}
          zusatz={
            reife.lernen === 0
              ? 'Wächst mit jeder gelernten Frage'
              : reife.schwaechstes && reife.themen.length > 1
                ? `Schwächstes Thema: ${reife.schwaechstes.titel} (${reife.schwaechstes.prozent} %)`
                : undefined
          }
        >
          <Meter anteil={reife.prozent / 100} label="Prüfungsreife" />
        </Kachel>
      </Link>

      <Link
        to="/statistik"
        className="mt-3 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
      >
        <span className="text-4xl" aria-hidden>
          {stand.level.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-slate-600 dark:text-slate-400">Level {stand.level.nr} von {LEVELS.length}</span>
          <span className="block leading-tight font-semibold">{stand.level.titel}</span>
          <span className="mt-2 block">
            <Meter anteil={stand.anteil} label="Fortschritt bis zum nächsten Level" hoehe="h-2" />
          </span>
          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            {profil.xp.toLocaleString('de-DE')} XP
            {stand.naechstes ? ` · noch ${stand.fehlen.toLocaleString('de-DE')} bis ${stand.naechstes.titel}` : ' · höchstes Level erreicht'}
          </span>
        </span>
      </Link>

      <Link to="/sitzung?thema=alle&modus=empfohlen&zurueck=/" className={knopf('primaer', 'mt-5 w-full')}>
        ▶ Weiterlernen
      </Link>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <SchnellStart to="/sitzung?thema=alle&modus=falsch&zurueck=/" icon="🔁" titel="Fehler" zahl={anzahl('falsch')} />
        <SchnellStart to="/sitzung?thema=alle&modus=faellig&zurueck=/" icon="⏰" titel="Fällig" zahl={anzahl('faellig')} />
        <SchnellStart to="/sitzung?thema=alle&modus=karten&zurueck=/" icon="🗂️" titel="Karteikarten" zahl={anzahl('karten')} />
      </div>
    </Seite>
  );
}

function ModusKachel({ to, icon, titel, text }: { to: string; icon: string; titel: string; text: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-24 flex-col items-start justify-between rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 active:scale-[0.98] dark:bg-slate-900 dark:ring-slate-800"
    >
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <span>
        <span className="block font-semibold">{titel}</span>
        <span className="block text-xs leading-tight text-slate-500 dark:text-slate-400">{text}</span>
      </span>
    </Link>
  );
}

function SchnellStart({ to, icon, titel, zahl }: { to: string; icon: string; titel: string; zahl: number }) {
  const inhalt = (
    <>
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <span className="text-2xl font-bold">{zahl}</span>
      <span className="text-sm font-medium">{titel}</span>
    </>
  );
  const klassen =
    'flex min-h-24 flex-col items-start justify-between rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800';
  return zahl > 0 ? (
    <Link to={to} className={`${klassen} active:scale-[0.98]`}>
      {inhalt}
    </Link>
  ) : (
    <div className={`${klassen} opacity-50`} aria-disabled>
      {inhalt}
    </div>
  );
}
