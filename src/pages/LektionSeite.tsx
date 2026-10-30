import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { AntwortOption, BUCHSTABEN } from '../components/Antworten';
import { ErklaerungsBlock, QuellenHinweis } from '../components/BereichErklaerung';
import { ErgebnisBanner } from '../components/ErgebnisBanner';
import { FormelText } from '../components/Formeln';
import { spieleTon, tonVorbereiten } from '../components/toene';
import { knopf } from '../components/ui';
import { BEREICHE } from '../data/bereiche';
import { useDaten } from '../db/DatenContext';
import { lektionsSchritte } from '../logic/lektion';
import type { LektionsEreignis } from '../logic/motivation';
import { antwortReihenfolge, waehleFragen } from '../logic/sitzung';
import { THEMEN, type Bereich } from '../types';

/** Erklärmodus: ein Themenbereich als Lektion – kurze Seiten zum Lesen, dazwischen Verständnisfragen. */
export function LektionSeite() {
  const { bereich: id = '' } = useParams();
  const [params] = useSearchParams();
  const bereich = BEREICHE.find((b) => b.id === id);
  if (!bereich) return <Navigate to="/erklaeren" replace />;
  const zurueckParam = params.get('zurueck');
  const zurueck = zurueckParam?.startsWith('/') ? zurueckParam : '/erklaeren';
  // neuer Schlüssel = Lektion beginnt von vorn (nächste Lektion oder „Wiederholen“)
  return <Lektion key={`${bereich.id}-${params.get('r') ?? ''}`} bereich={bereich} zurueck={zurueck} />;
}

function Lektion({ bereich, zurueck }: { bereich: Bereich; zurueck: string }) {
  const { profil, lektionAbschliessen } = useDaten();
  const schritte = useMemo(() => lektionsSchritte(bereich), [bereich]);
  const fragen = bereich.verstaendnis ?? [];
  const [pos, setPos] = useState(0);
  /** Anzeigereihenfolge der Antworten je Frage (Original-Indizes) */
  const [reihenfolgen] = useState(() => fragen.map((f) => antwortReihenfolge(f.antworten.length, profil.antwortenMischen)));
  /** gewählte Antwort (Original-Index) je beantworteter Frage */
  const [antworten, setAntworten] = useState<Record<number, number>>({});
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const [ereignis, setEreignis] = useState<LektionsEreignis | null>(null);

  // Geschweifte Klammern: Was ein Effekt zurückgibt, ruft React als Aufräum-Funktion auf.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pos]);

  const richtig = fragen.filter((f, nr) => antworten[nr] === f.richtig).length;

  if (pos >= schritte.length) {
    return <Abschluss bereich={bereich} zurueck={zurueck} richtig={richtig} gesamt={fragen.length} ereignis={ereignis} />;
  }

  const schritt = schritte[pos];
  const beantwortet = schritt.art === 'frage' && antworten[schritt.nr] !== undefined;
  const letzte = pos === schritte.length - 1;

  const zurueckBlaettern = () => {
    setGewaehlt(null);
    setPos((p) => Math.max(0, p - 1));
  };
  const weiter = async () => {
    setGewaehlt(null);
    if (!letzte) {
      setPos((p) => p + 1);
      return;
    }
    setSpeichert(true);
    try {
      setEreignis(await lektionAbschliessen(bereich.id, richtig, fragen.length));
    } finally {
      setSpeichert(false);
    }
    setPos(schritte.length);
  };
  const pruefen = () => {
    if (schritt.art !== 'frage' || gewaehlt === null) return;
    setAntworten((a) => ({ ...a, [schritt.nr]: gewaehlt }));
    if (profil.toene) {
      tonVorbereiten();
      spieleTon(gewaehlt === schritt.frage.richtig ? 'richtig' : 'falsch');
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-10 bg-slate-50/95 px-4 pt-3 pb-2 backdrop-blur dark:bg-slate-950/95">
        <div className="flex items-center gap-3">
          <Link to={zurueck} className="-ml-2 flex size-11 items-center justify-center rounded-full text-2xl" aria-label="Lektion beenden">
            ✕
          </Link>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full rounded-full bg-marke-400 transition-all" style={{ width: `${(pos / schritte.length) * 100}%` }} />
          </div>
          <span className="min-w-14 text-right text-sm text-slate-500 tabular-nums dark:text-slate-400">
            {pos + 1}/{schritte.length}
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 pt-2 pb-36" key={pos}>
        <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">📖 Lektion · {THEMEN.find((t) => t.id === bereich.thema)?.titel}</p>

        {schritt.art === 'seite' ? (
          <div className="space-y-3">
            <h1 className="mb-1 text-xl leading-tight font-bold">{bereich.titel}</h1>
            <ErklaerungsBlock
              titel={schritt.titel}
              text={schritt.text}
              punkte={schritt.punkte}
              zusatz={schritt.teile > 1 ? `${schritt.teil}/${schritt.teile}` : undefined}
            />
            {letzte && <QuellenHinweis bereich={bereich} />}
          </div>
        ) : (
          <>
            <p className="mb-2 inline-block rounded-full bg-marke-50 px-3 py-1 text-sm font-semibold text-slate-800 ring-1 ring-marke-400 dark:bg-marke-500/10 dark:text-slate-100 dark:ring-marke-500/40">
              ❓ Verständnisfrage
            </p>
            <h1 className="mb-4 text-xl leading-snug font-semibold">
              <FormelText text={schritt.frage.frage} />
            </h1>
            <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">Eine Antwort ist richtig.</p>
            <div className="space-y-2" role="radiogroup">
              {reihenfolgen[schritt.nr].map((orig, i) => (
                <AntwortOption
                  key={orig}
                  buchstabe={BUCHSTABEN[i]}
                  text={<FormelText text={schritt.frage.antworten[orig]} />}
                  mehrfach={false}
                  ausgewaehlt={(beantwortet ? antworten[schritt.nr] : gewaehlt) === orig}
                  richtig={orig === schritt.frage.richtig}
                  aufgeloest={beantwortet}
                  onClick={() => setGewaehlt(orig)}
                />
              ))}
            </div>
            {beantwortet && (
              <div className="mt-5 space-y-4">
                <ErgebnisBanner ergebnis={antworten[schritt.nr] === schritt.frage.richtig ? 'richtig' : 'falsch'} />
                <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800/60">
                  <h3 className="mb-2 font-semibold">Erklärung</h3>
                  <p className="leading-relaxed">
                    <FormelText text={schritt.frage.erklaerung} />
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-xl gap-2">
          {pos > 0 && (
            <button type="button" className={knopf('sekundaer', 'shrink-0')} onClick={zurueckBlaettern}>
              ‹ Zurück
            </button>
          )}
          {schritt.art === 'frage' && !beantwortet ? (
            <button type="button" className={knopf('primaer', 'flex-1')} disabled={gewaehlt === null} onClick={pruefen}>
              Antwort prüfen
            </button>
          ) : (
            <button type="button" className={knopf('primaer', 'flex-1')} disabled={speichert} onClick={weiter} autoFocus={beantwortet}>
              {letzte ? 'Lektion abschließen' : 'Weiter ›'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function Abschluss({
  bereich,
  zurueck,
  richtig,
  gesamt,
  ereignis,
}: {
  bereich: Bereich;
  zurueck: string;
  richtig: number;
  gesamt: number;
  ereignis: LektionsEreignis | null;
}) {
  const { fragen, fortschritte, profil } = useDaten();
  const index = BEREICHE.findIndex((b) => b.id === bereich.id);
  const naechste = BEREICHE[index + 1];
  const zumUeben = Math.min(
    waehleFragen(fragen, fortschritte, { thema: bereich.thema, bereich, modus: 'empfohlen', nurGeprueft: profil.nurGeprueft }).length,
    profil.sitzungsLaenge,
  );
  const anteil = gesamt ? richtig / gesamt : 1;
  const ziel = encodeURIComponent(zurueck);

  return (
    <main className="mx-auto max-w-xl px-4 pt-8 pb-10">
      <div className="text-center">
        <p className="text-5xl" aria-hidden>
          {anteil === 1 ? '🏆' : anteil >= 0.5 ? '💪' : '📚'}
        </p>
        <h1 className="mt-3 text-2xl font-bold">Lektion geschafft</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{bereich.titel}</p>
        {gesamt > 0 && (
          <p className="mt-3 text-lg">
            <strong>{richtig}</strong> von <strong>{gesamt}</strong> Verständnisfragen richtig
          </p>
        )}
        {ereignis && ereignis.xpGesamt > 0 && (
          <p className="mt-3 inline-block rounded-full bg-marke-400 px-4 py-1.5 font-bold text-slate-900">⭐ +{ereignis.xpGesamt} XP</p>
        )}
        {gesamt > 0 && richtig < gesamt && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Tipp: Lies die Seiten zu den falschen Antworten noch einmal – oder übe den Bereich jetzt mit Prüfungsfragen.
          </p>
        )}
      </div>

      <div className="mt-8 grid gap-2">
        {zumUeben > 0 && (
          <Link to={`/sitzung?thema=${bereich.thema}&bereich=${bereich.id}&modus=empfohlen&zurueck=${ziel}`} className={knopf('primaer', 'w-full')}>
            ✏️ Diesen Bereich üben ({zumUeben} {zumUeben === 1 ? 'Frage' : 'Fragen'})
          </Link>
        )}
        {naechste && (
          <Link to={`/erklaeren/${naechste.id}?zurueck=${ziel}`} className={knopf(zumUeben > 0 ? 'sekundaer' : 'primaer', 'w-full py-3 text-center')}>
            📖 Nächste Lektion: {naechste.titel}
          </Link>
        )}
        <Link to={`/erklaeren/${bereich.id}?zurueck=${ziel}&r=${Date.now()}`} replace className={knopf('leise', 'w-full')}>
          ↺ Lektion wiederholen
        </Link>
        <Link to={zurueck} className={knopf('leise', 'w-full')}>
          {zurueck === '/erklaeren' ? 'Zur Übersicht' : 'Zurück'}
        </Link>
      </div>
    </main>
  );
}
