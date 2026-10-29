import { useState } from 'react';
import { BEREICHE } from '../data/bereiche';
import { FORMELN } from '../data/formeln';
import { formelTeile, formelnFuer } from '../logic/formeln';
import type { FormelGruppe, Frage } from '../types';
import { Dialog, knopf } from './ui';

/**
 * Text mit Formelzeichen: „I_a“ wird als I mit tiefgestelltem a angezeigt, ein einzelnes „l“ (Länge)
 * in Schrift mit Serifen, damit es nicht wie ein großes „I“ (Strom) aussieht.
 */
export function FormelText({ text }: { text: string }) {
  return (
    <>
      {formelTeile(text).map((t, i) =>
        t.art === 'tief' ? (
          <sub key={i}>{t.text}</sub>
        ) : t.art === 'laenge' ? (
          <span key={i} className="font-serif italic">
            {t.text}
          </span>
        ) : (
          t.text
        ),
      )}
    </>
  );
}

/** Die Einträge einer Formelgruppe mit Formelzeichen-Erklärung. */
export function FormelGruppeAnzeige({ gruppe }: { gruppe: FormelGruppe }) {
  return (
    <div className="space-y-2">
      {gruppe.eintraege.map((e) => (
        <div key={e.name} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            <FormelText text={e.name} />
          </h4>
          <div className="mt-1 space-y-1">
            {e.formeln.map((f) => (
              <p key={f} className="font-serif text-lg leading-snug font-semibold tabular-nums">
                <FormelText text={f} />
              </p>
            ))}
          </div>
          {e.hinweis && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              <FormelText text={e.hinweis} />
            </p>
          )}
        </div>
      ))}
      {gruppe.groessen && (
        <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          <h4 className="mb-1 font-semibold">Formelzeichen</h4>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {gruppe.groessen.map((g) => (
              <div key={g.zeichen} className="contents">
                <dt className="font-serif font-semibold">
                  <FormelText text={g.zeichen} />
                </dt>
                <dd>
                  <FormelText text={g.bedeutung} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

/**
 * Knopf „📐 Formeln“ bei einer Aufgabe, die Formeln braucht. Öffnet die passenden Formeln in einem
 * Fenster – die Lernrunde bzw. Prüfung läuft dabei weiter. Ohne passende Formeln erscheint nichts.
 */
export function FormelKnopf({ frage }: { frage: Frage }) {
  const [offen, setOffen] = useState(false);
  const [alle, setAlle] = useState(false);
  const passend = formelnFuer(frage, FORMELN, BEREICHE);
  if (passend.length === 0) return null;
  const gezeigt = alle ? FORMELN : passend;
  return (
    <>
      <button type="button" className={knopf('sekundaer', 'mb-4', 'klein')} onClick={() => setOffen(true)}>
        📐 Formeln
      </button>
      <Dialog offen={offen} titel="Formeln" onSchliessen={() => setOffen(false)}>
        <div className="space-y-5">
          {gezeigt.map((g) => (
            <section key={g.id}>
              <h3 className="mb-2 font-semibold">{g.titel}</h3>
              <FormelGruppeAnzeige gruppe={g} />
            </section>
          ))}
        </div>
        <div className="mt-4 grid gap-2">
          {!alle && FORMELN.length > passend.length && (
            <button type="button" className={knopf('sekundaer', 'w-full', 'mittel')} onClick={() => setAlle(true)}>
              Ganze Formelsammlung zeigen
            </button>
          )}
          <button type="button" className={knopf('primaer', 'w-full', 'mittel')} onClick={() => setOffen(false)}>
            Zurück zur Aufgabe
          </button>
        </div>
      </Dialog>
    </>
  );
}
