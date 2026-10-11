import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { dateiHerunterladen, dateiTeilen, kannDateienTeilen, leseJsonDatei } from '../components/dateien';
import { Karte, Seite } from '../components/Seite';
import { Dialog, knopf } from '../components/ui';
import { useDaten } from '../db/DatenContext';
import { erstelleSicherung, holeLetzteSicherung, merkeLetzteSicherung } from '../db/db';
import { dateinameMitDatum, fragenAlsJson, planeImport, pruefeSicherung, type ImportPlan, type Sicherung } from '../logic/austausch';
import { formatDatumZeit } from '../logic/format';
import { levelFuerXp } from '../logic/motivation';
import { THEMEN, type ThemaId } from '../types';

type ExportAuswahl = 'alle' | 'eigene' | ThemaId;

function Abschnitt({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">{titel}</h2>
      <Karte>{children}</Karte>
    </section>
  );
}

/** Datei-Auswahl als großer Knopf */
function DateiKnopf({ text, onDatei }: { text: string; onDatei: (f: File) => void }) {
  return (
    <label className={knopf('sekundaer', 'w-full cursor-pointer')}>
      {text}
      <input
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = ''; // dieselbe Datei erneut wählbar
          if (f) onDatei(f);
        }}
      />
    </label>
  );
}

export function DatenSeite() {
  const { db, fragen, fortschritte, simulationen, fragenImportieren, sicherungWiederherstellen, lernstandZuruecksetzen, zeigeHinweis } =
    useDaten();
  const teilenMoeglich = kannDateienTeilen();
  const [letzteSicherung, setLetzteSicherung] = useState<number | null>(null);
  const [exportAuswahl, setExportAuswahl] = useState<ExportAuswahl>('alle');
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null);
  const [ueberschreiben, setUeberschreiben] = useState(true);
  const [sicherung, setSicherung] = useState<Sicherung | null>(null);
  const [fehler, setFehler] = useState('');
  const [zuruecksetzenOffen, setZuruecksetzenOffen] = useState(false);
  const [speicher, setSpeicher] = useState<{ dauerhaft: boolean | null; belegtMb: number | null }>({ dauerhaft: null, belegtMb: null });

  useEffect(() => {
    holeLetzteSicherung(db).then(setLetzteSicherung);
    (async () => {
      const dauerhaft = navigator.storage?.persisted ? await navigator.storage.persisted() : null;
      const schaetzung = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
      setSpeicher({ dauerhaft, belegtMb: schaetzung?.usage != null ? schaetzung.usage / 1_000_000 : null });
    })().catch(() => {});
  }, [db]);

  // ----- Lernstand sichern -----
  const sichern = async (teilen: boolean) => {
    const inhalt = JSON.stringify(await erstelleSicherung(db), null, 1);
    const name = dateinameMitDatum('trei-lernstand');
    if (teilen) {
      if (!(await dateiTeilen(inhalt, name, 'TREI-Trainer Lernstand'))) return;
    } else {
      dateiHerunterladen(inhalt, name);
    }
    await merkeLetzteSicherung(db);
    setLetzteSicherung(Date.now());
    zeigeHinweis('💾', 'Sicherung erstellt');
  };

  const sicherungGewaehlt = async (datei: File) => {
    setFehler('');
    try {
      const { sicherung: s, fehler: f } = pruefeSicherung(await leseJsonDatei(datei));
      if (f) setFehler(f);
      setSicherung(s);
    } catch (e) {
      setFehler((e as Error).message);
    }
  };

  const wiederherstellen = async () => {
    if (!sicherung) return;
    await sicherungWiederherstellen(sicherung);
    setSicherung(null);
    zeigeHinweis('✔', 'Lernstand wiederhergestellt');
  };

  // ----- Fragen exportieren -----
  const exportListe =
    exportAuswahl === 'alle'
      ? fragen
      : exportAuswahl === 'eigene'
        ? fragen.filter((f) => f.herkunft === 'eigen' || f.bearbeitet)
        : fragen.filter((f) => f.thema === exportAuswahl);
  const exportName =
    exportAuswahl === 'alle' || exportAuswahl === 'eigene'
      ? dateinameMitDatum(exportAuswahl === 'alle' ? 'trei-fragen' : 'trei-eigene-fragen')
      : `${exportAuswahl}.json`;
  const exportieren = async (teilen: boolean) => {
    const inhalt = fragenAlsJson(exportListe);
    if (teilen) await dateiTeilen(inhalt, exportName, 'TREI-Trainer Fragen');
    else dateiHerunterladen(inhalt, exportName);
  };

  // ----- Fragen importieren -----
  const importGewaehlt = async (datei: File) => {
    setFehler('');
    try {
      setImportPlan(planeImport(await leseJsonDatei(datei), new Map(fragen.map((f) => [f.id, f]))));
    } catch (e) {
      setFehler((e as Error).message);
      setImportPlan(null);
    }
  };
  const importAnzahl = importPlan ? importPlan.neu.length + (ueberschreiben ? importPlan.geaendert.length : 0) : 0;
  const importieren = async () => {
    if (!importPlan) return;
    await fragenImportieren([...importPlan.neu, ...(ueberschreiben ? importPlan.geaendert : [])]);
    zeigeHinweis('✔', `${importAnzahl} ${importAnzahl === 1 ? 'Frage' : 'Fragen'} importiert`);
    setImportPlan(null);
  };

  const zuruecksetzen = async () => {
    await lernstandZuruecksetzen();
    setZuruecksetzenOffen(false);
    zeigeHinweis('↺', 'Lernstand zurückgesetzt');
  };

  const dauerhaftAnfordern = async () => {
    const ok = navigator.storage?.persist ? await navigator.storage.persist() : false;
    setSpeicher((s) => ({ ...s, dauerhaft: ok }));
    zeigeHinweis(ok ? '✔' : 'ℹ️', ok ? 'Speicher ist jetzt dauerhaft' : 'Der Browser hat abgelehnt – als App installieren hilft');
  };

  const sicherungAlter = letzteSicherung ? Math.floor((Date.now() - letzteSicherung) / 86_400_000) : null;

  return (
    <Seite titel="Daten & Sicherung">
      <Link to="/mehr" className="-mt-2 mb-1 inline-block text-sm text-slate-500 dark:text-slate-400">
        ‹ Mehr
      </Link>

      {fehler && (
        <p role="alert" className="mt-3 rounded-2xl bg-red-50 p-3 text-red-800 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-900">
          {fehler}
        </p>
      )}

      <Abschnitt titel="Lernstand sichern">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Alle Daten liegen nur in diesem Browser. Sichere regelmäßig, z. B. in deine Cloud oder per Mail an dich – dann
          ist nichts weg, wenn das Handy kaputtgeht oder die Browserdaten gelöscht werden.
        </p>
        <p className="mt-2 text-sm font-medium">
          Letzte Sicherung:{' '}
          {letzteSicherung ? `${formatDatumZeit(letzteSicherung)}${sicherungAlter ? ` (vor ${sicherungAlter} ${sicherungAlter === 1 ? 'Tag' : 'Tagen'})` : ''}` : 'noch nie'}
        </p>
        <div className="mt-3 grid gap-2">
          <button type="button" className={knopf('primaer')} onClick={() => sichern(false)}>
            💾 Sicherung herunterladen
          </button>
          {teilenMoeglich && (
            <button type="button" className={knopf('sekundaer')} onClick={() => sichern(true)}>
              Sicherung teilen …
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Enthält Lernstand, XP, Abzeichen, Simulationen, Notizen sowie eigene und bearbeitete Fragen.
        </p>
      </Abschnitt>

      <Abschnitt titel="Lernstand wiederherstellen">
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">Ersetzt den kompletten Lernstand auf diesem Gerät durch eine Sicherung.</p>
        <DateiKnopf text="📂 Sicherungsdatei wählen" onDatei={sicherungGewaehlt} />
      </Abschnitt>

      <Abschnitt titel="Fragen exportieren">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Welche Fragen?</span>
          <select
            value={exportAuswahl}
            onChange={(e) => setExportAuswahl(e.target.value as ExportAuswahl)}
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="alle">Alle Fragen</option>
            <option value="eigene">Nur eigene und bearbeitete</option>
            {THEMEN.map((t) => (
              <option key={t.id} value={t.id}>
                Thema: {t.titel}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {exportListe.length} {exportListe.length === 1 ? 'Frage' : 'Fragen'} → <span className="font-mono">{exportName}</span>
        </p>
        <div className="mt-3 grid gap-2">
          <button type="button" className={knopf('sekundaer')} disabled={exportListe.length === 0} onClick={() => exportieren(false)}>
            ⬇ Exportieren
          </button>
          {teilenMoeglich && (
            <button type="button" className={knopf('leise', '', 'mittel')} disabled={exportListe.length === 0} onClick={() => exportieren(true)}>
              Teilen …
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Tipp: Exportierst du ein einzelnes Thema, passt die Datei direkt als <span className="font-mono">src/data/fragen/&lt;thema&gt;.json</span>{' '}
          ins Projekt.
        </p>
      </Abschnitt>

      <Abschnitt titel="Fragen importieren">
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
          JSON-Datei mit Fragen im Schema der Projektdateien, z. B. aus dem Kurs nachgetragen oder von einem anderen Gerät
          exportiert. Jede Frage wird vor dem Import geprüft.
        </p>
        <DateiKnopf text="📂 Fragen-Datei wählen" onDatei={importGewaehlt} />
      </Abschnitt>

      <Abschnitt titel="Speicher">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Dauerhaft gespeichert:{' '}
          <strong>{speicher.dauerhaft === null ? 'unbekannt' : speicher.dauerhaft ? 'ja' : 'nein'}</strong>
          {speicher.belegtMb !== null && ` · belegt ca. ${speicher.belegtMb.toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`}
        </p>
        {speicher.dauerhaft === false && (
          <>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Ohne dauerhaften Speicher darf der Browser die Daten bei Platzmangel löschen. Als App installiert ist das
              meist erledigt.
            </p>
            <button type="button" className={knopf('sekundaer', 'mt-3 w-full', 'mittel')} onClick={dauerhaftAnfordern}>
              Dauerhaften Speicher anfordern
            </button>
          </>
        )}
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {fragen.length} Fragen · {fortschritte.size} mit Lernstand · {simulationen.length} Simulationen
        </p>
      </Abschnitt>

      <Abschnitt titel="Neu anfangen">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Löscht Lernstatus, XP, Serien, Abzeichen und Simulationen. Fragen, Einstellungen, Notizen, Markierungen und
          Fehlermeldungen bleiben erhalten.
        </p>
        <button type="button" className={knopf('gefahr', 'mt-3 w-full', 'mittel')} onClick={() => setZuruecksetzenOffen(true)}>
          Lernstand zurücksetzen …
        </button>
      </Abschnitt>

      {/* Import-Vorschau */}
      <Dialog offen={!!importPlan} titel="Fragen importieren" onSchliessen={() => setImportPlan(null)}>
        {importPlan && (
          <>
            <ul className="space-y-1 text-slate-700 dark:text-slate-300">
              <li>
                <strong>{importPlan.neu.length}</strong> neue Fragen
              </li>
              <li>
                <strong>{importPlan.geaendert.length}</strong> vorhandene Fragen mit geändertem Inhalt
              </li>
              <li>
                <strong>{importPlan.gleich}</strong> unverändert
              </li>
              {importPlan.fehlerhaft.length > 0 && (
                <li className="text-red-700 dark:text-red-400">
                  <strong>{importPlan.fehlerhaft.length}</strong> fehlerhaft (werden nicht importiert)
                </li>
              )}
            </ul>
            {importPlan.geaendert.length > 0 && (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-5" checked={ueberschreiben} onChange={(e) => setUeberschreiben(e.target.checked)} />
                Geänderte Fragen mit der Fassung aus der Datei überschreiben
              </label>
            )}
            {importPlan.fehlerhaft.length > 0 && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-medium">Fehler anzeigen</summary>
                <ul className="mt-2 space-y-1">
                  {importPlan.fehlerhaft.map((x) => (
                    <li key={`${x.nr}-${x.id}`}>
                      <span className="font-mono">{x.id}</span>: {x.fehler.join(' · ')}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="mt-4 grid gap-2">
              <button type="button" className={knopf('primaer')} disabled={importAnzahl === 0} onClick={importieren}>
                {importAnzahl} {importAnzahl === 1 ? 'Frage' : 'Fragen'} importieren
              </button>
              <button type="button" className={knopf('leise')} onClick={() => setImportPlan(null)}>
                Abbrechen
              </button>
            </div>
          </>
        )}
      </Dialog>

      {/* Sicherung wiederherstellen */}
      <Dialog offen={!!sicherung} titel="Lernstand ersetzen?" onSchliessen={() => setSicherung(null)}>
        {sicherung && (
          <>
            <p className="text-slate-700 dark:text-slate-300">
              Sicherung vom <strong>{sicherung.erstellt ? formatDatumZeit(Date.parse(sicherung.erstellt)) : 'unbekannt'}</strong>:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
              <li>
                {levelFuerXp(sicherung.profil.xp ?? 0).titel}, {(sicherung.profil.xp ?? 0).toLocaleString('de-DE')} XP
              </li>
              <li>{sicherung.fortschritte.length} Fragen mit Lernstand</li>
              <li>{sicherung.simulationen.length} Simulationen</li>
              <li>{sicherung.fragen.length} eigene oder bearbeitete Fragen</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-400">
              Der aktuelle Lernstand auf diesem Gerät wird dabei vollständig ersetzt.
            </p>
            <div className="mt-4 grid gap-2">
              <button type="button" className={knopf('primaer')} onClick={wiederherstellen}>
                Wiederherstellen
              </button>
              <button type="button" className={knopf('leise')} onClick={() => setSicherung(null)}>
                Abbrechen
              </button>
            </div>
          </>
        )}
      </Dialog>

      <Dialog offen={zuruecksetzenOffen} titel="Lernstand zurücksetzen?" onSchliessen={() => setZuruecksetzenOffen(false)}>
        <p className="text-slate-700 dark:text-slate-300">
          Alle Fragen werden wieder „neu“, XP, Level, Serien, Abzeichen und Simulationen sind weg. Das lässt sich nur mit
          einer Sicherung rückgängig machen.
        </p>
        <div className="mt-4 grid gap-2">
          <button type="button" className={knopf('sekundaer')} onClick={() => sichern(false)}>
            Vorher sichern
          </button>
          <button type="button" className={knopf('rot')} onClick={zuruecksetzen}>
            Zurücksetzen
          </button>
          <button type="button" className={knopf('leise')} onClick={() => setZuruecksetzenOffen(false)}>
            Abbrechen
          </button>
        </div>
      </Dialog>
    </Seite>
  );
}
