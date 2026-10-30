import type { CSSProperties } from 'react';
import type { Ergebnis } from '../logic/leitner';
import type { AntwortEreignis } from '../logic/motivation';
import { istSerienMeilenstein } from '../logic/toene';

/**
 * Rückmeldung nach einer Antwort: grün mit Häkchen und Funken oder rot mit leichtem Wackeln.
 * Mit `ereignis` (Lernrunde) zusätzlich XP und Serienbonus.
 */
export function ErgebnisBanner({
  ergebnis,
  wiederEingereiht = false,
  ereignis = null,
}: {
  ergebnis: Ergebnis;
  wiederEingereiht?: boolean;
  ereignis?: AntwortEreignis | null;
}) {
  const ok = ergebnis === 'richtig';
  const xp = ereignis?.xp;
  const meilenstein = ok && !!ereignis && istSerienMeilenstein(ereignis.serie);
  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-2xl p-4 ${ok ? 'anim-richtig bg-green-700 text-white' : 'anim-falsch bg-red-600 text-white'}`}
    >
      <span className="relative text-3xl" aria-hidden>
        <span className={`inline-block ${ok ? 'anim-haken' : ''}`}>{ok ? '✓' : '✗'}</span>
        {ok && <Funken anzahl={meilenstein ? 14 : 8} />}
      </span>
      <div className="flex-1">
        <p className="text-lg font-bold">{ok ? 'Richtig!' : 'Leider falsch'}</p>
        {wiederEingereiht && <p className="text-sm">Die Frage kommt in dieser Runde gleich noch einmal.</p>}
        {ok && xp && xp.serienBonus > 0 && (
          <p className="text-sm">
            🔥 {ereignis.serie} richtige in Folge · +{xp.serienBonus} Bonus
          </p>
        )}
        {ok && xp?.gedrosselt && <p className="text-sm">Heute schon richtig beantwortet</p>}
      </div>
      {xp && xp.gesamt > 0 && <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 font-bold">+{xp.gesamt} XP</span>}
    </div>
  );
}

const FUNKEN_FARBEN = ['bg-marke-400', 'bg-white', 'bg-green-200'];

/** Kleine Punkte, die bei einer richtigen Antwort vom Häkchen wegfliegen (aus bei „Bewegung reduzieren“). */
function Funken({ anzahl }: { anzahl: number }) {
  return (
    <>
      {Array.from({ length: anzahl }, (_, i) => {
        const winkel = (i / anzahl) * 2 * Math.PI;
        const weite = i % 2 ? 26 : 40;
        const richtung = {
          '--dx': `${Math.round(Math.cos(winkel) * weite)}px`,
          '--dy': `${Math.round(Math.sin(winkel) * weite)}px`,
        } as CSSProperties;
        return <span key={i} className={`anim-spritzer absolute top-1/2 left-1/2 size-1.5 rounded-full ${FUNKEN_FARBEN[i % 3]}`} style={richtung} />;
      })}
    </>
  );
}
