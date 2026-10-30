import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Erklaerung, FrageBild, FrageKopf, FrageMitLoesung, FrageWerkzeuge } from '../components/FrageTeile';
import { FormelKnopf } from '../components/Formeln';
import { spieleTon, tonVorbereiten } from '../components/toene';
import { AntwortOption, BUCHSTABEN, RechenEingabe } from '../components/Antworten';
import { ErgebnisBanner } from '../components/ErgebnisBanner';
import { Dialog, StatusPunkt, knopf } from '../components/ui';
import { BEREICHE } from '../data/bereiche';
import { useDaten } from '../db/DatenContext';
import { bewerteAuswahl, bewerteRechnung, parseZahl } from '../logic/bewertung';
import { KARTEN_ERGEBNIS, type Ergebnis } from '../logic/leitner';
import type { AntwortEreignis } from '../logic/motivation';
import {
  LERN_MODI,
  antwortReihenfolge,
  lesezeichenSchluessel,
  startNachLesezeichen,
  waehleFragen,
  wiederEinreihen,
  type LernModus,
} from '../logic/sitzung';
import { tonFuer } from '../logic/toene';
import { THEMA_IDS, type Frage, type KartenBewertung, type RechenLoesung, type ThemaId } from '../types';

/** Wie oft eine falsch beantwortete Frage in derselben Runde höchstens erneut drankommt */
const MAX_WIEDERHOLUNGEN = 2;

interface Eintrag {
  id: string;
  /** Anzeigereihenfolge der Antworten (Original-Indizes) */
  reihenfolge: number[];
  schluessel: string;
}

export function SitzungSeite() {
  const [params] = useSearchParams();
  // neuer Schlüssel = neue Runde (z. B. „Falsche wiederholen“)
  return <Sitzung key={params.toString()} params={params} />;
}

function Sitzung({ params }: { params: URLSearchParams }) {
  const { fragen, fortschritte, profil, antwortSpeichern, aendereProfil, zeigeHinweis } = useDaten();
  const nachId = useMemo(() => new Map(fragen.map((f) => [f.id, f])), [fragen]);

  const bereich = BEREICHE.find((b) => b.id === params.get('bereich'));
  const themaParam = params.get('thema');
  const thema: ThemaId | 'alle' = bereich?.thema ?? (THEMA_IDS.includes(themaParam as ThemaId) ? (themaParam as ThemaId) : 'alle');
  const modusParam = params.get('modus') as LernModus;
  const modus: LernModus = LERN_MODI.includes(modusParam) ? modusParam : 'empfohlen';
  // „Alle der Reihe nach“: ohne Längenbegrenzung, ohne Wiederholen in der Runde, mit Lesezeichen
  const reihe = !params.get('ids') && modus === 'reihe';
  const lesezeichen = lesezeichenSchluessel(thema, bereich?.id);
  const zurueckParam = params.get('zurueck');
  const zurueck = zurueckParam?.startsWith('/')
    ? zurueckParam
    : bereich
      ? `/lernen/${bereich.thema}/${bereich.id}`
      : themaParam
        ? `/lernen/${thema}`
        : '/lernen';

  const neuerEintrag = (f: Frage, nr: number): Eintrag => ({
    id: f.id,
    reihenfolge: antwortReihenfolge(f.antworten.length, profil.antwortenMischen),
    schluessel: `${f.id}-${nr}`,
  });

  const [start] = useState(() => {
    const ids = params.get('ids');
    if (ids) {
      const liste = ids
        .split(',')
        .map((id) => nachId.get(id))
        .filter((f): f is NonNullable<typeof f> => !!f);
      return { fragen: liste, versatz: 0 };
    }
    const auswahl = waehleFragen(fragen, fortschritte, {
      thema,
      bereich,
      modus,
      nurGeprueft: profil.nurGeprueft,
      limit: reihe ? undefined : profil.sitzungsLaenge,
    });
    if (!reihe || params.has('vorn')) return { fragen: auswahl, versatz: 0 };
    const versatz = startNachLesezeichen(
      auswahl.map((f) => f.id),
      profil.lesezeichen[lesezeichen],
    );
    return { fragen: auswahl.slice(versatz), versatz };
  });
  /** „Alle der Reihe nach“: so viele Fragen der Reihe liegen vor dieser Runde (es geht am Lesezeichen weiter) */
  const versatz = start.versatz;
  const [warteschlange, setWarteschlange] = useState<Eintrag[]>(() => start.fragen.map((f, i) => neuerEintrag(f, i)));
  const [pos, setPos] = useState(0);
  const [aufgeloest, setAufgeloest] = useState(false);
  const [gewaehlt, setGewaehlt] = useState<number[]>([]);
  const [eingabe, setEingabe] = useState('');
  const [eingabeFehler, setEingabeFehler] = useState(false);
  const [aufgedeckt, setAufgedeckt] = useState(false);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  const [wiederEingereiht, setWiederEingereiht] = useState(false);
  /** erstes Ergebnis je Frage in dieser Runde */
  const [protokoll, setProtokoll] = useState<Map<string, Ergebnis>>(new Map());
  const [wiederholungen, setWiederholungen] = useState<Record<string, number>>({});
  const [speichert, setSpeichert] = useState(false);
  /** Rückmeldung zur letzten Antwort (XP, Serie) */
  const [ereignis, setEreignis] = useState<AntwortEreignis | null>(null);
  const [xpRunde, setXpRunde] = useState(0);

  // Geschweifte Klammern sind wichtig: neuere Browser liefern bei scrollTo() ein Promise zurück,
  // und was ein Effekt zurückgibt, ruft React später als Aufräum-Funktion auf (sonst weiße Seite).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pos]);

  if (warteschlange.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-10 text-center">
        <p className="text-5xl">🎉</p>
        <h1 className="mt-4 text-xl font-bold">Keine Fragen in dieser Auswahl</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          {profil.nurGeprueft ? 'Der Filter „Nur geprüfte Fragen“ ist aktiv. ' : ''}Wähle einen anderen Modus oder ein
          anderes Thema.
        </p>
        <Link to={zurueck} className={knopf('primaer', 'mt-6 w-full')}>
          Zurück
        </Link>
      </main>
    );
  }

  if (pos >= warteschlange.length) {
    return <Zusammenfassung protokoll={protokoll} nachId={nachId} zurueck={zurueck} params={params} xp={xpRunde} />;
  }

  const eintrag = warteschlange[pos];
  const frage = nachId.get(eintrag.id);
  if (!frage) {
    // Frage wurde zwischenzeitlich gelöscht
    setPos((p) => p + 1);
    return null;
  }
  const istAuswahl = frage.typ === 'einfach' || frage.typ === 'mehrfach';
  const letzte = pos === warteschlange.length - 1;

  function weiter() {
    setPos((p) => p + 1);
    setAufgeloest(false);
    setGewaehlt([]);
    setEingabe('');
    setEingabeFehler(false);
    setAufgedeckt(false);
    setErgebnis(null);
    setWiederEingereiht(false);
    setEreignis(null);
  }

  async function abschliessen(erg: Ergebnis, karte?: KartenBewertung) {
    if (speichert || !frage) return;
    setSpeichert(true);
    // Noch im Klick vorbereiten – Android spielt Töne nur nach einer Berührung ab
    if (profil.toene) tonVorbereiten();
    let rueckmeldung;
    try {
      rueckmeldung = await antwortSpeichern(frage.id, erg, karte);
      // erst nach dem Speichern der Antwort – beide schreiben ins Profil
      if (reihe) await aendereProfil({ lesezeichen: { ...profil.lesezeichen, [lesezeichen]: frage.id } });
    } finally {
      setSpeichert(false);
    }
    if (profil.toene) spieleTon(tonFuer(erg, rueckmeldung.ereignis.serie, karte));
    setXpRunde((x) => x + rueckmeldung.ereignis.xpGesamt);
    setProtokoll((p) => (p.has(frage.id) ? p : new Map(p).set(frage.id, erg)));
    const schon = wiederholungen[frage.id] ?? 0;
    const nochmal = !reihe && erg === 'falsch' && schon < MAX_WIEDERHOLUNGEN;
    if (nochmal) {
      setWiederholungen((w) => ({ ...w, [frage.id]: schon + 1 }));
      setWarteschlange((q) => wiederEinreihen(q, pos, neuerEintrag(frage, q.length)));
    }
    if (karte) {
      // Karteikarten springen sofort weiter – XP deshalb als kurzer Hinweis
      if (rueckmeldung.ereignis.xp.gesamt > 0) zeigeHinweis('⭐', `+${rueckmeldung.ereignis.xp.gesamt} XP`);
      weiter();
    } else {
      setErgebnis(erg);
      setEreignis(rueckmeldung.ereignis);
      setWiederEingereiht(nochmal);
      setAufgeloest(true);
    }
  }

  function pruefen(e?: FormEvent) {
    e?.preventDefault();
    if (!frage || aufgeloest) return;
    if (istAuswahl) {
      if (gewaehlt.length === 0) return;
      abschliessen(bewerteAuswahl(frage.richtig as number[], gewaehlt) ? 'richtig' : 'falsch');
    } else if (frage.typ === 'rechnen') {
      const wert = parseZahl(eingabe);
      if (wert === null) {
        setEingabeFehler(true);
        return;
      }
      abschliessen(bewerteRechnung(frage.richtig as RechenLoesung, wert) ? 'richtig' : 'falsch');
    }
  }

  function waehle(orig: number) {
    if (aufgeloest || !frage) return;
    if (frage.typ === 'einfach') setGewaehlt([orig]);
    else setGewaehlt((g) => (g.includes(orig) ? g.filter((i) => i !== orig) : [...g, orig]));
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      {/* Kopf mit Fortschritt */}
      <header className="sticky top-0 z-10 bg-slate-50/95 px-4 pt-3 pb-2 backdrop-blur dark:bg-slate-950/95">
        <div className="flex items-center gap-3">
          <Link to={zurueck} className="-ml-2 flex size-11 items-center justify-center rounded-full text-2xl" aria-label="Runde beenden">
            ✕
          </Link>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-marke-400 transition-all"
              style={{ width: `${((versatz + pos) / (versatz + warteschlange.length)) * 100}%` }}
            />
          </div>
          <span className="min-w-14 text-right text-sm text-slate-500 tabular-nums dark:text-slate-400">
            {versatz + pos + 1}/{versatz + warteschlange.length}
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 pt-2 pb-36" key={eintrag.schluessel}>
        {versatz > 0 && pos === 0 && (
          <p className="mb-3 rounded-xl bg-marke-50 p-3 text-sm text-slate-700 dark:bg-marke-500/10 dark:text-slate-200">
            📋 Du machst bei Frage {versatz + 1} von {versatz + warteschlange.length} weiter.{' '}
            <Link to={`/sitzung?${vonVorn(params)}`} replace className="font-medium underline">
              Von vorn beginnen
            </Link>
          </p>
        )}
        <FrageKopf frage={frage} />
        <FrageBild bild={frage.bild} />
        <h1 className="mb-4 text-xl leading-snug font-semibold">{frage.frage}</h1>
        <FormelKnopf frage={frage} />

        {istAuswahl && (
          <>
            <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
              {frage.typ === 'einfach' ? 'Eine Antwort ist richtig.' : 'Mehrere Antworten können richtig sein – alle richtigen ankreuzen.'}
            </p>
            <div className="space-y-2" role={frage.typ === 'einfach' ? 'radiogroup' : 'group'}>
              {eintrag.reihenfolge.map((orig, i) => (
                <AntwortOption
                  key={orig}
                  buchstabe={BUCHSTABEN[i]}
                  text={frage.antworten[orig]}
                  mehrfach={frage.typ === 'mehrfach'}
                  ausgewaehlt={gewaehlt.includes(orig)}
                  richtig={(frage.richtig as number[]).includes(orig)}
                  aufgeloest={aufgeloest}
                  onClick={() => waehle(orig)}
                />
              ))}
            </div>
          </>
        )}

        {frage.typ === 'rechnen' && (
          <RechenEingabe
            loesung={frage.richtig as RechenLoesung}
            eingabe={eingabe}
            setEingabe={(s) => {
              setEingabe(s);
              setEingabeFehler(false);
            }}
            fehler={eingabeFehler}
            aufgeloest={aufgeloest}
            ergebnis={ergebnis}
            onSubmit={pruefen}
          />
        )}

        {frage.typ === 'karte' && aufgedeckt && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <h2 className="mb-2 font-semibold">Musterantwort</h2>
              <p className="leading-relaxed whitespace-pre-line">{frage.richtig as string}</p>
            </div>
            <Erklaerung frage={frage} />
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">Wie gut wusstest du die Antwort?</p>
          </div>
        )}

        {aufgeloest && ergebnis && (
          <div className="mt-5 space-y-4">
            <ErgebnisBanner ergebnis={ergebnis} wiederEingereiht={wiederEingereiht} ereignis={ereignis} />
            <Erklaerung frage={frage} />
          </div>
        )}

        <div className="mt-6">
          <FrageWerkzeuge frageId={frage.id} />
        </div>
      </main>

      {/* Aktionsleiste unten, gut mit dem Daumen erreichbar */}
      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto max-w-xl">
          {frage.typ === 'karte' ? (
            aufgedeckt ? (
              <div className="grid grid-cols-3 gap-2">
                <button type="button" disabled={speichert} className={knopf('rot', '', 'kompakt')} onClick={() => abschliessen(KARTEN_ERGEBNIS.nicht, 'nicht')}>
                  Nicht gewusst
                </button>
                <button type="button" disabled={speichert} className={knopf('gelb', '', 'kompakt')} onClick={() => abschliessen(KARTEN_ERGEBNIS.teilweise, 'teilweise')}>
                  Teilweise
                </button>
                <button type="button" disabled={speichert} className={knopf('gruen', '', 'kompakt')} onClick={() => abschliessen(KARTEN_ERGEBNIS.gewusst, 'gewusst')}>
                  Gewusst
                </button>
              </div>
            ) : (
              <button type="button" className={knopf('primaer', 'w-full')} onClick={() => setAufgedeckt(true)}>
                Musterantwort aufdecken
              </button>
            )
          ) : aufgeloest ? (
            <button type="button" className={knopf('primaer', 'w-full')} onClick={weiter} autoFocus>
              {letzte ? 'Zur Auswertung' : 'Weiter'}
            </button>
          ) : (
            <button
              type="button"
              className={knopf('primaer', 'w-full')}
              disabled={speichert || (istAuswahl ? gewaehlt.length === 0 : eingabe.trim() === '')}
              onClick={() => pruefen()}
            >
              Antwort prüfen
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

/** Adresse derselben Runde, aber ohne Lesezeichen von der ersten Frage an */
function vonVorn(params: URLSearchParams): string {
  const p = new URLSearchParams(params);
  p.set('vorn', '1');
  return p.toString();
}

function Zusammenfassung({
  protokoll,
  nachId,
  zurueck,
  params,
  xp,
}: {
  protokoll: Map<string, Ergebnis>;
  nachId: Map<string, Frage>;
  zurueck: string;
  params: URLSearchParams;
  xp: number;
}) {
  const navigate = useNavigate();
  const { fortschritte } = useDaten();
  const [ansicht, setAnsicht] = useState<string | null>(null);
  const angezeigt = ansicht ? nachId.get(ansicht) : undefined;
  const gesamt = protokoll.size;
  const richtig = [...protokoll.values()].filter((e) => e === 'richtig').length;
  const nichtRichtig = [...protokoll.entries()].filter(([, e]) => e !== 'richtig').map(([id]) => id);
  const prozent = gesamt ? Math.round((richtig / gesamt) * 100) : 0;

  const neueRunde = () => {
    const p = new URLSearchParams(params);
    p.set('r', String(Date.now()));
    navigate(`/sitzung?${p}`, { replace: true });
  };
  const fehlerWiederholen = () => {
    const p = new URLSearchParams({ ids: nichtRichtig.join(','), zurueck });
    navigate(`/sitzung?${p}`, { replace: true });
  };

  return (
    <main className="mx-auto max-w-xl px-4 pt-8 pb-10">
      <div className="text-center">
        <p className="text-5xl" aria-hidden>
          {prozent >= 90 ? '🏆' : prozent >= 70 ? '💪' : '📚'}
        </p>
        <h1 className="mt-3 text-2xl font-bold">Runde geschafft</h1>
        <p className="mt-1 text-lg">
          <strong>{richtig}</strong> von <strong>{gesamt}</strong> Fragen beim ersten Versuch richtig ({prozent} %)
        </p>
        {xp > 0 && (
          <p className="mt-3 inline-block rounded-full bg-marke-400 px-4 py-1.5 font-bold text-slate-900">
            ⭐ +{xp.toLocaleString('de-DE')} XP in dieser Runde
          </p>
        )}
      </div>

      {nichtRichtig.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Noch nicht sicher</h2>
          <ul className="space-y-2">
            {nichtRichtig.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setAnsicht(id)}
                  className="block w-full rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
                >
                  <span className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <StatusPunkt status={fortschritte.get(id)?.status ?? 'neu'} />
                    <span>Lösung ansehen ›</span>
                  </span>
                  <span className="line-clamp-2 text-sm">{nachId.get(id)?.frage}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 grid gap-3">
        {nichtRichtig.length > 0 && (
          <button type="button" className={knopf('primaer')} onClick={fehlerWiederholen}>
            Diese {nichtRichtig.length} wiederholen
          </button>
        )}
        <button type="button" className={knopf(nichtRichtig.length ? 'sekundaer' : 'primaer')} onClick={neueRunde}>
          Neue Runde
        </button>
        <Link to={zurueck} className={knopf('leise')}>
          Fertig
        </Link>
      </div>

      <Dialog offen={!!angezeigt} titel="Lösung" onSchliessen={() => setAnsicht(null)}>
        {angezeigt && <FrageMitLoesung frage={angezeigt} />}
      </Dialog>
    </main>
  );
}
