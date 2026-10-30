import { useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { bildAlsDataUrl } from '../components/dateien';
import { TYP_TEXT } from '../components/FrageTeile';
import { Seite } from '../components/Seite';
import { Chip, Dialog, Schalter, knopf } from '../components/ui';
import { useDaten } from '../db/DatenContext';
import {
  MAX_ANTWORTEN,
  formularZuFrage,
  frageZuFormular,
  leeresFormular,
  naechsteEigeneId,
  typWechseln,
  type FrageFormular,
} from '../logic/editor';
import { FRAGE_TYPEN, THEMEN, THEMA_IDS, type ThemaId } from '../types';

const feld =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base dark:border-slate-700 dark:bg-slate-950';

function Feld({ label, hinweis, children }: { label: string; hinweis?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {hinweis && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hinweis}</span>}
    </label>
  );
}

export function FrageEditorSeite() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { fragen } = useDaten();
  const vorhanden = id ? fragen.find((f) => f.id === id) : undefined;
  if (id && !vorhanden) {
    return (
      <Seite titel="Frage nicht gefunden">
        <Link to="/mehr/katalog" className={knopf('primaer', 'w-full')}>
          Zum Katalog
        </Link>
      </Seite>
    );
  }
  const themaParam = params.get('thema') as ThemaId;
  const thema = THEMA_IDS.includes(themaParam) ? themaParam : 'recht';
  const start = vorhanden
    ? frageZuFormular(vorhanden)
    : leeresFormular(thema, naechsteEigeneId(thema, fragen.map((f) => f.id)));
  return <Editor key={id ?? 'neu'} start={start} neu={!vorhanden} mitgeliefert={vorhanden?.herkunft === 'mitgeliefert'} />;
}

function Editor({ start, neu, mitgeliefert }: { start: FrageFormular; neu: boolean; mitgeliefert: boolean }) {
  const { fragen, fortschritte, frageSpeichern, aendereFortschritt, zeigeHinweis } = useDaten();
  const navigate = useNavigate();
  const location = useLocation();
  // ohne Verlauf (direkt geöffnet) zurück zum Katalog statt aus der App heraus
  const verlassen = () => (location.key !== 'default' ? navigate(-1) : navigate('/mehr/katalog'));
  const [f, setF] = useState(start);
  // nach dem ersten Speicherversuch werden die Fehler bei jeder Eingabe neu geprüft
  const [versucht, setVersucht] = useState(false);
  const [bildFehler, setBildFehler] = useState('');
  const [abbrechenOffen, setAbbrechenOffen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const meldung = fortschritte.get(f.id)?.fehlerMeldung ?? '';
  const [meldungErledigt, setMeldungErledigt] = useState(true);
  const geaendert = JSON.stringify(f) !== JSON.stringify(start);
  const idVergeben = neu && fragen.some((x) => x.id === f.id);
  const fehler = useMemo(() => {
    if (!versucht) return [];
    const liste = [...formularZuFrage(f).fehler];
    if (idVergeben) liste.push(`Die ID „${f.id}“ ist schon vergeben`);
    return liste;
  }, [versucht, f, idVergeben]);

  const unterthemen = useMemo(
    () => [...new Set(fragen.filter((x) => x.thema === f.thema && x.unterthema).map((x) => x.unterthema!))].sort(),
    [fragen, f.thema],
  );

  const setze = (aenderung: Partial<FrageFormular>) => setF((alt) => ({ ...alt, ...aenderung }));
  const setzeThema = (thema: ThemaId) =>
    // neue Fragen bekommen eine ID passend zum Thema
    setF((alt) => ({
      ...alt,
      thema,
      id: neu ? naechsteEigeneId(thema, fragen.map((x) => x.id)) : alt.id,
    }));
  const setzeAntwort = (i: number, aenderung: Partial<{ text: string; richtig: boolean }>) =>
    setF((alt) => ({
      ...alt,
      antworten: alt.antworten.map((a, k) => {
        if (k === i) return { ...a, ...aenderung };
        // Einfachauswahl: nur ein Haken
        if (aenderung.richtig && alt.typ === 'einfach') return { ...a, richtig: false };
        return a;
      }),
    }));

  const bildWaehlen = async (datei: File | undefined) => {
    setBildFehler('');
    if (!datei) return;
    try {
      setze({ bild: await bildAlsDataUrl(datei) });
    } catch (e) {
      setBildFehler((e as Error).message);
    }
  };

  const speichern = async () => {
    const { frage } = formularZuFrage(f);
    setVersucht(true);
    if (!frage || idVergeben) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }
    setSpeichert(true);
    await frageSpeichern(frage);
    if (meldung && meldungErledigt) await aendereFortschritt(frage.id, { fehlerMeldung: '' });
    zeigeHinweis('✔', neu ? 'Frage angelegt' : 'Änderungen gespeichert');
    navigate(`/mehr/frage/${encodeURIComponent(frage.id)}`, { replace: true });
  };

  const zurueck = () => (geaendert ? setAbbrechenOffen(true) : verlassen());

  return (
    <Seite titel={neu ? 'Neue Frage' : 'Frage bearbeiten'}>
      <div className="space-y-5">
        {meldung && (
          <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-500/10 dark:ring-red-900">
            <p className="font-semibold text-red-800 dark:text-red-300">⚑ Gemeldeter Fehler</p>
            <p className="mt-1 whitespace-pre-line">{meldung}</p>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-5" checked={meldungErledigt} onChange={(e) => setMeldungErledigt(e.target.checked)} />
              Meldung nach dem Speichern als erledigt entfernen
            </label>
          </div>
        )}
        {mitgeliefert && (
          <p className="rounded-2xl bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Mitgelieferte Frage: Nach dem Speichern gilt deine Fassung. Spätere Änderungen an der Projektdatei werden für
            diese Frage nicht mehr übernommen – das lässt sich in der Frage über „Originalfassung wiederherstellen“
            rückgängig machen.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Feld label="Thema">
            <select value={f.thema} onChange={(e) => setzeThema(e.target.value as ThemaId)} className={`${feld} min-h-12`}>
              {THEMEN.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titel}
                </option>
              ))}
            </select>
          </Feld>
          <Feld label="Unterthema (optional)">
            <input list="unterthemen" value={f.unterthema} onChange={(e) => setze({ unterthema: e.target.value })} className={feld} placeholder="z. B. NAV" />
            <datalist id="unterthemen">
              {unterthemen.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Feld>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Fragetyp</legend>
          <div className="flex flex-wrap gap-2">
            {FRAGE_TYPEN.map((t) => (
              <Chip key={t} aktiv={f.typ === t} onClick={() => setF((alt) => typWechseln(alt, t))}>
                {TYP_TEXT[t]}
              </Chip>
            ))}
          </div>
        </fieldset>

        <Feld label="Frage">
          <textarea value={f.frage} onChange={(e) => setze({ frage: e.target.value })} rows={3} className={feld} />
        </Feld>

        {(f.typ === 'einfach' || f.typ === 'mehrfach') && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">
              Antworten – {f.typ === 'einfach' ? 'die richtige anhaken' : 'alle richtigen anhaken'}
            </legend>
            <ul className="space-y-2">
              {f.antworten.map((a, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    type={f.typ === 'einfach' ? 'radio' : 'checkbox'}
                    name="richtig"
                    checked={a.richtig}
                    onChange={(e) => setzeAntwort(i, { richtig: e.target.checked })}
                    className="size-6 shrink-0 accent-green-600"
                    aria-label={`Antwort ${i + 1} ist richtig`}
                  />
                  <input
                    value={a.text}
                    onChange={(e) => setzeAntwort(i, { text: e.target.value })}
                    className={feld}
                    placeholder={`Antwort ${i + 1}`}
                    aria-label={`Antwort ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-lg text-slate-500 disabled:opacity-30"
                    aria-label={`Antwort ${i + 1} entfernen`}
                    disabled={f.antworten.length <= 2}
                    onClick={() => setze({ antworten: f.antworten.filter((_, k) => k !== i) })}
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
            {f.antworten.length < MAX_ANTWORTEN && (
              <button
                type="button"
                className="mt-2 text-sm font-medium text-slate-700 underline dark:text-slate-300"
                onClick={() => setze({ antworten: [...f.antworten, { text: '', richtig: false }] })}
              >
                + Antwort hinzufügen
              </button>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Leere Felder werden beim Speichern weggelassen.</p>
          </fieldset>
        )}

        {f.typ === 'rechnen' && (
          <div className="grid grid-cols-2 gap-3">
            <Feld label="Lösung">
              <input inputMode="decimal" value={f.wert} onChange={(e) => setze({ wert: e.target.value })} className={feld} placeholder="z. B. 15,88" />
            </Feld>
            <Feld label="Einheit">
              <input value={f.einheit} onChange={(e) => setze({ einheit: e.target.value })} className={feld} placeholder="z. B. A" />
            </Feld>
            <Feld label="Toleranz">
              <input inputMode="decimal" value={f.toleranz} onChange={(e) => setze({ toleranz: e.target.value })} className={feld} placeholder="z. B. 0,2" />
            </Feld>
            <Feld label="Toleranz als">
              <select value={f.toleranzArt} onChange={(e) => setze({ toleranzArt: e.target.value as 'abs' | 'rel' })} className={`${feld} min-h-[46px]`}>
                <option value="abs">± in der Einheit</option>
                <option value="rel">± Prozent</option>
              </select>
            </Feld>
          </div>
        )}

        {f.typ === 'karte' && (
          <Feld label="Musterantwort">
            <textarea value={f.musterantwort} onChange={(e) => setze({ musterantwort: e.target.value })} rows={7} className={feld} />
          </Feld>
        )}

        <Feld
          label={f.typ === 'rechnen' ? 'Erklärung mit Rechenweg' : 'Erklärung'}
          hinweis="Bei Werten, die sich mit neuen TAB- oder VDE-Ausgaben ändern können, „Stand prüfen“ dazuschreiben."
        >
          <textarea value={f.erklaerung} onChange={(e) => setze({ erklaerung: e.target.value })} rows={4} className={feld} />
        </Feld>

        <Feld label="Quelle (Regelwerk)" hinweis="z. B. „NAV § 13“, „VDE-AR-N 4100“, „DIN VDE 0100-410“">
          <input value={f.quelle} onChange={(e) => setze({ quelle: e.target.value })} className={feld} />
        </Feld>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Schwierigkeit</legend>
          <div className="flex gap-2">
            {([1, 2, 3] as const).map((s) => (
              <Chip key={s} aktiv={f.schwierigkeit === s} onClick={() => setze({ schwierigkeit: s })}>
                {'★'.repeat(s)}
                <span className="sr-only"> Stufe {s}</span>
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Bild (optional)</legend>
          {f.bild && <img src={f.bild} alt="Bild zur Frage" className="mb-2 max-h-48 rounded-xl bg-white object-contain p-1 ring-1 ring-slate-200" />}
          <div className="flex flex-wrap gap-2">
            <label className={knopf('sekundaer', 'cursor-pointer', 'klein')}>
              📷 {f.bild ? 'Anderes Bild' : 'Bild wählen'}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => bildWaehlen(e.target.files?.[0])} />
            </label>
            {f.bild && (
              <button type="button" className={knopf('leise', '', 'klein')} onClick={() => setze({ bild: null })}>
                Bild entfernen
              </button>
            )}
          </div>
          {bildFehler && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{bildFehler}</p>}
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Große Fotos werden automatisch verkleinert.</p>
        </fieldset>

        <Feld label="Stand" hinweis="Monat, auf den sich die Frage bezieht (JJJJ-MM)">
          <input value={f.stand} onChange={(e) => setze({ stand: e.target.value })} className={feld} />
        </Feld>

        <Schalter titel="Geprüft" text="Mit den Kursunterlagen abgeglichen" an={f.geprueft} onChange={(geprueft) => setze({ geprueft })} />

        <p className="text-xs text-slate-500 dark:text-slate-400">
          ID: <span className="font-mono">{f.id}</span>
        </p>

        {fehler.length > 0 && (
          <div role="alert" className="rounded-2xl bg-red-50 p-4 text-red-800 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-900">
            <p className="font-semibold">Bitte noch korrigieren:</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {fehler.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto grid max-w-xl grid-cols-[auto_1fr] gap-2">
          <button type="button" className={knopf('leise')} onClick={zurueck}>
            Abbrechen
          </button>
          <button type="button" className={knopf('primaer')} onClick={speichern} disabled={speichert}>
            Speichern
          </button>
        </div>
      </footer>

      <Dialog offen={abbrechenOffen} titel="Änderungen verwerfen?" onSchliessen={() => setAbbrechenOffen(false)}>
        <p className="text-slate-600 dark:text-slate-400">Deine Eingaben gehen verloren.</p>
        <div className="mt-4 grid gap-2">
          <button type="button" className={knopf('rot')} onClick={verlassen}>
            Verwerfen
          </button>
          <button type="button" className={knopf('leise')} onClick={() => setAbbrechenOffen(false)}>
            Weiter bearbeiten
          </button>
        </div>
      </Dialog>
    </Seite>
  );
}
