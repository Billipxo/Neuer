import { KLAENGE, type TonArt } from '../logic/toene';

let kontext: AudioContext | null = null;
let pause: number | undefined;

/** Audio-Kontext holen und aufwecken. Im Klick aufrufen – Android erlaubt Töne nur nach einer Berührung. */
export function tonVorbereiten(): AudioContext | null {
  const Kontext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Kontext) return null;
  try {
    kontext ??= new Kontext();
    window.clearTimeout(pause);
    if (kontext.state === 'suspended') kontext.resume().catch(() => {});
    return kontext;
  } catch {
    return null;
  }
}

/** Spielt einen kurzen Ton. Klappt das nicht (kein Web Audio), bleibt es still – Töne sind nur Beiwerk. */
export function spieleTon(art: TonArt) {
  const ctx = tonVorbereiten();
  if (!ctx) return;
  const { form, lautstaerke, noten } = KLAENGE[art];
  const beginn = ctx.currentTime + 0.02;
  let ende = 0;
  try {
    for (const n of noten) {
      const start = beginn + n.start;
      const osc = ctx.createOscillator();
      const huelle = ctx.createGain();
      osc.type = form;
      osc.frequency.setValueAtTime(n.hz, start);
      if (n.bisHz) osc.frequency.exponentialRampToValueAtTime(n.bisHz, start + n.dauer);
      huelle.gain.setValueAtTime(0.0001, start);
      huelle.gain.exponentialRampToValueAtTime(lautstaerke, start + 0.012);
      huelle.gain.exponentialRampToValueAtTime(0.0001, start + n.dauer);
      osc.connect(huelle);
      huelle.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + n.dauer + 0.03);
      ende = Math.max(ende, n.start + n.dauer);
    }
  } catch {
    return;
  }
  // Danach schlafen legen, damit das Handy den Lautsprecher nicht offen hält (Akku)
  pause = window.setTimeout(() => {
    kontext?.suspend().catch(() => {});
  }, (ende + 1) * 1000);
}
