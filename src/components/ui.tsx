import { useEffect, type ReactNode } from 'react';
import type { LernStatus } from '../types';
import type { Verteilung } from '../logic/sitzung';

export type KnopfVariante = 'primaer' | 'sekundaer' | 'gruen' | 'gelb' | 'rot' | 'leise';

const VARIANTEN: Record<KnopfVariante, string> = {
  primaer: 'bg-marke-400 text-slate-900 hover:bg-marke-500 active:bg-marke-600',
  sekundaer:
    'bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700',
  gruen: 'bg-green-600 text-white hover:bg-green-700',
  gelb: 'bg-amber-400 text-slate-900 hover:bg-amber-500',
  rot: 'bg-red-600 text-white hover:bg-red-700',
  leise: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
};

/** Klassen für große, daumenfreundliche Knöpfe (auch für Links nutzbar). */
export function knopf(variante: KnopfVariante = 'primaer', extra = ''): string {
  return `inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-lg font-semibold transition select-none disabled:pointer-events-none disabled:opacity-40 ${VARIANTEN[variante]} ${extra}`;
}

export const STATUS_INFO: Record<LernStatus, { text: string; farbe: string }> = {
  neu: { text: 'neu', farbe: 'bg-slate-400' },
  falsch: { text: 'falsch', farbe: 'bg-red-500' },
  einmal: { text: '1× richtig', farbe: 'bg-amber-400' },
  gelernt: { text: 'gelernt', farbe: 'bg-green-500' },
};

/** Farbiger Statuspunkt; ohne Text nur Dekoration (der umgebende Text nennt den Status). */
export function StatusPunkt({ status, mitText = true }: { status: LernStatus; mitText?: boolean }) {
  const info = STATUS_INFO[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block size-2.5 rounded-full ${info.farbe}`} aria-hidden />
      {mitText && info.text}
    </span>
  );
}

/** Ampelbalken: grün = gelernt, gelb = 1× richtig, rot = falsch, grau = neu */
export function Ampelbalken({ v, hoehe = 'h-2.5' }: { v: Verteilung; hoehe?: string }) {
  const anteil = (n: number) => (v.gesamt ? `${(n / v.gesamt) * 100}%` : '0%');
  return (
    <div
      className={`flex w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${hoehe}`}
      role="img"
      aria-label={`${v.gelernt} gelernt, ${v.einmal} einmal richtig, ${v.falsch} falsch, ${v.neu} neu`}
    >
      <div className="bg-green-500" style={{ width: anteil(v.gelernt) }} />
      <div className="bg-amber-400" style={{ width: anteil(v.einmal) }} />
      <div className="bg-red-500" style={{ width: anteil(v.falsch) }} />
    </div>
  );
}

export function AmpelLegende({ v }: { v: Verteilung }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
      <span><StatusPunkt status="gelernt" mitText={false} /> {v.gelernt} gelernt</span>
      <span><StatusPunkt status="einmal" mitText={false} /> {v.einmal} 1× richtig</span>
      <span><StatusPunkt status="falsch" mitText={false} /> {v.falsch} falsch</span>
      <span><StatusPunkt status="neu" mitText={false} /> {v.neu} neu</span>
    </div>
  );
}

export function Dialog({
  offen,
  titel,
  onSchliessen,
  children,
}: {
  offen: boolean;
  titel: string;
  onSchliessen: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!offen) return;
    const taste = (e: KeyboardEvent) => e.key === 'Escape' && onSchliessen();
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [offen, onSchliessen]);

  if (!offen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={onSchliessen}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">{titel}</h2>
          <button type="button" onClick={onSchliessen} className="-mt-1 -mr-1 flex size-10 shrink-0 items-center justify-center rounded-full text-xl text-slate-500" aria-label="Schließen">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Ein/Aus-Schalter mit Beschriftung */
export function Schalter({
  an,
  onChange,
  titel,
  text,
}: {
  an: boolean;
  onChange: (an: boolean) => void;
  titel: string;
  text?: ReactNode;
}) {
  return (
    <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <span className="flex-1">
        <span className="block font-medium">{titel}</span>
        {text && <span className="block text-sm text-slate-500 dark:text-slate-400">{text}</span>}
      </span>
      <input type="checkbox" role="switch" checked={an} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-8 w-14 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-green-600 peer-focus-visible:ring-2 peer-focus-visible:ring-marke-500 after:absolute after:top-1 after:left-1 after:size-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-6 dark:bg-slate-700"
      />
    </label>
  );
}

/** Kleine Auswahl-Schaltfläche („Chip“), z. B. für Filter */
export function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={aktiv}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium ring-1 transition ${
        aktiv
          ? 'bg-slate-900 text-white ring-slate-900 dark:bg-marke-400 dark:text-slate-900 dark:ring-marke-400'
          : 'bg-white text-slate-700 ring-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
