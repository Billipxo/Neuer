import { Link } from 'react-router-dom';
import { LernKalender } from '../components/LernKalender';
import { Karte, Seite } from '../components/Seite';
import { Kachel, Meter } from '../components/ui';
import { useDaten } from '../db/DatenContext';
import { ALLE_ABZEICHEN, MIN_FRAGEN_THEMA, type Abzeichen } from '../logic/abzeichen';
import {
  LEVELS,
  SERIE_BONUS_MAX,
  XP_PRO_STERN,
  XP_TAGESZIEL,
  XP_WIEDERHOLUNG_HEUTE,
  laengsteSerie,
  lernserie,
  levelStand,
} from '../logic/motivation';
import { OHNE_SIMULATION_FAKTOR, pruefungsreife } from '../logic/reife';
import { statusVerteilung } from '../logic/sitzung';
import { THEMEN } from '../types';

const STUFEN_ICON = ['🥉', '🥈', '🥇'];

export function StatistikSeite() {
  const { fragen, fortschritte, profil, simulationen } = useDaten();
  const jetzt = Date.now();
  const reife = pruefungsreife(fragen, fortschritte, simulationen);
  const stand = levelStand(profil.xp);
  const serie = lernserie(profil.lernTage, jetzt);
  const gesamt = statusVerteilung(fragen, fortschritte);
  const antworten = Object.values(profil.lernTage).reduce((a, b) => a + b, 0);
  let versuche = 0;
  let richtig = 0;
  for (const f of fortschritte.values()) {
    versuche += f.versuche;
    richtig += f.richtigGesamt;
  }
  const quote = versuche ? Math.round((richtig / versuche) * 100) : null;
  const verdient = new Set(profil.abzeichen);

  return (
    <Seite titel="Statistik">
      {/* Prüfungsreife – die große Zahl dieser Seite */}
      <Karte>
        <p className="text-sm text-slate-600 dark:text-slate-400">Prüfungsreife</p>
        <p className="mt-1 text-5xl font-bold">{reife.prozent} %</p>
        <div className="mt-3">
          <Meter anteil={reife.prozent / 100} label="Prüfungsreife" hoehe="h-3" />
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Lernstand {reife.lernen} % ·{' '}
          {reife.simulation === null ? (
            <>
              noch keine Prüfungssimulation (ohne Simulation höchstens {Math.round(OHNE_SIMULATION_FAKTOR * 100)} % des Lernstands)
            </>
          ) : (
            <>Ø letzte Simulationen {reife.simulation} %</>
          )}
        </p>

        <h2 className="mt-5 mb-2 font-semibold">Je Thema</h2>
        <ul className="space-y-3">
          {reife.themen.map((t) => {
            const stufen = ['bronze', 'silber', 'gold'].filter((s) => verdient.has(`thema-${t.id}-${s}`));
            return (
              <li key={t.id}>
                <Link to={`/lernen/${t.id}`} className="block">
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">
                      {t.titel}{' '}
                      {stufen.length > 0 && (
                        <span title={`Abzeichen: ${stufen.join(', ')}`} aria-label={`Abzeichen ${stufen.join(', ')}`}>
                          {STUFEN_ICON[stufen.length - 1]}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-slate-600 dark:text-slate-400">
                      {t.prozent} % <span className="text-xs">({t.v.gelernt}/{t.v.gesamt} gelernt)</span>
                    </span>
                  </div>
                  <Meter anteil={t.prozent / 100} label={`${t.titel}: ${t.prozent} %`} hoehe="h-2" />
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Gelernte Fragen zählen voll, „1× richtig“ halb. Jedes Thema zählt gleich viel.
        </p>
      </Karte>

      {/* Karriereleiter */}
      <Karte className="mt-4">
        <div className="flex items-center gap-4">
          <span className="text-5xl" aria-hidden>
            {stand.level.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Level {stand.level.nr} von {LEVELS.length} · {profil.xp.toLocaleString('de-DE')} XP
            </p>
            <p className="text-xl leading-tight font-semibold">{stand.level.titel}</p>
          </div>
        </div>
        <div className="mt-3">
          <Meter anteil={stand.anteil} label="Fortschritt bis zum nächsten Level" />
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {stand.naechstes
            ? `noch ${stand.fehlen.toLocaleString('de-DE')} XP bis ${stand.naechstes.titel}`
            : 'Höchstes Level erreicht – eingetragen!'}
        </p>
        <ol className="mt-4 space-y-1.5">
          {LEVELS.map((l) => {
            const erreicht = profil.xp >= l.abXp;
            const aktuell = l.nr === stand.level.nr;
            return (
              <li
                key={l.nr}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                  aktuell ? 'bg-slate-100 font-semibold dark:bg-slate-800' : erreicht ? '' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <span className={`w-7 text-center text-lg ${erreicht ? '' : 'opacity-40 grayscale'}`} aria-hidden>
                  {l.icon}
                </span>
                <span className="flex-1">{l.titel}</span>
                <span className="shrink-0 text-xs">
                  {erreicht ? '✓' : `ab ${l.abXp.toLocaleString('de-DE')} XP`}
                </span>
              </li>
            );
          })}
        </ol>
      </Karte>

      {/* Lernserie & Kalender */}
      <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Dranbleiben</h2>
      <div className="grid grid-cols-3 gap-3">
        <Kachel label="Lernserie" wert={serie.tage} zusatz={serie.tage === 1 ? 'Tag' : 'Tage'} />
        <Kachel label="Längste" wert={laengsteSerie(profil.lernTage)} zusatz="Tage" />
        <Kachel label="Ziel erreicht" wert={profil.zielErreichtTage.length} zusatz="Tage" />
      </div>
      <Karte className="mt-3">
        <LernKalender lernTage={profil.lernTage} tagesziel={profil.tagesziel} jetzt={jetzt} />
      </Karte>

      {/* Zahlen */}
      <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Zahlen</h2>
      <div className="grid grid-cols-2 gap-3">
        <Kachel label="Antworten gesamt" wert={antworten.toLocaleString('de-DE')} />
        <Kachel label="Trefferquote" wert={quote === null ? '–' : `${quote} %`} />
        <Kachel label="Fragen gelernt" wert={`${gesamt.gelernt}/${gesamt.gesamt}`} />
        <Kachel label="Beste Serie" wert={profil.bestSerie} zusatz="richtige in Folge" />
      </div>

      {/* Abzeichen */}
      <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
        Abzeichen · {profil.abzeichen.length} von {ALLE_ABZEICHEN.length}
      </h2>
      <AbzeichenGruppe titel="Dranbleiben" liste={ALLE_ABZEICHEN.filter((a) => a.gruppe === 'fleiss')} verdient={verdient} />
      <AbzeichenGruppe titel="Meilensteine" liste={ALLE_ABZEICHEN.filter((a) => a.gruppe === 'meister')} verdient={verdient} />
      <section className="mb-3">
        <h3 className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">Themen</h3>
        <Karte>
          <ul className="space-y-1.5">
            {THEMEN.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{t.titel}</span>
                <span className="flex shrink-0 gap-1 text-xl">
                  {['bronze', 'silber', 'gold'].map((s, i) => {
                    const ok = verdient.has(`thema-${t.id}-${s}`);
                    return (
                      <span key={s} className={ok ? '' : 'opacity-25 grayscale'} title={`${s}${ok ? ' – verdient' : ''}`}>
                        {STUFEN_ICON[i]}
                        <span className="sr-only">{`${s}: ${ok ? 'verdient' : 'noch nicht'}`}</span>
                      </span>
                    );
                  })}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Bronze ab 50 %, Silber ab 75 %, Gold ab 90 % der Fragen eines Themas gelernt (ab {MIN_FRAGEN_THEMA} Fragen im Thema).
          </p>
        </Karte>
      </section>

      {/* Simulationen (Schritt 5) */}
      <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Prüfungssimulationen</h2>
      <Karte>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {simulationen.length ? `${simulationen.length} Simulationen` : 'Noch keine Prüfungssimulation gemacht.'}
        </p>
      </Karte>

      <details className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <summary className="cursor-pointer font-semibold">So bekommst du XP</summary>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>
            Richtige Antwort: {XP_PRO_STERN} XP je Schwierigkeitsstern (★ {XP_PRO_STERN}, ★★ {2 * XP_PRO_STERN}, ★★★{' '}
            {3 * XP_PRO_STERN})
          </li>
          <li>Serienbonus: +5 ab 3 richtigen in Folge, +10 ab 6, +{SERIE_BONUS_MAX} ab 9</li>
          <li>Karteikarte: „gewusst“ wie richtig, „teilweise“ die Hälfte</li>
          <li>Tagesziel erreicht: +{XP_TAGESZIEL} XP</li>
          <li>Frage heute schon richtig beantwortet: nur {XP_WIEDERHOLUNG_HEUTE} XP – Wiederholen lohnt sich am nächsten Tag</li>
          <li>Falsche Antworten kosten nichts</li>
        </ul>
      </details>
    </Seite>
  );
}

function AbzeichenGruppe({ titel, liste, verdient }: { titel: string; liste: Abzeichen[]; verdient: Set<string> }) {
  return (
    <section className="mb-3">
      <h3 className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">{titel}</h3>
      <ul className="grid grid-cols-2 gap-2">
        {liste.map((a) => {
          const ok = verdient.has(a.id);
          return (
            <li
              key={a.id}
              className={`flex items-start gap-2 rounded-xl p-2.5 ring-1 ${
                ok
                  ? 'bg-white ring-slate-200 dark:bg-slate-900 dark:ring-slate-700'
                  : 'bg-slate-100 ring-transparent dark:bg-slate-900/50'
              }`}
            >
              <span className={`text-2xl ${ok ? '' : 'opacity-30 grayscale'}`} aria-hidden>
                {a.icon}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm leading-tight font-semibold ${ok ? '' : 'text-slate-500 dark:text-slate-400'}`}>
                  {a.titel}
                  <span className="sr-only">{ok ? ' (verdient)' : ' (noch nicht verdient)'}</span>
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{a.text}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
