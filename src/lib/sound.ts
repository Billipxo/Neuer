/** Kurze Signaltöne (Timer, Training). Audio muss einmal durch eine Nutzeraktion freigeschaltet werden. */
let audioCtx: AudioContext | null = null

/** Beim Start eines Timers bzw. Trainings aufrufen (innerhalb eines Klicks) */
export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    audioCtx ??= new AC()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
  } catch {
    /* kein Ton möglich */
  }
}

/** Pieptöne: `times` kurze Töne in der Höhe `frequency` */
export function beep(times = 3, frequency = 880, length = 0.25) {
  try {
    if (!audioCtx) return
    const t0 = audioCtx.currentTime
    for (let i = 0; i < times; i++) {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency
      const start = t0 + i * (length + 0.1)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
      osc.connect(gain).connect(audioCtx.destination)
      osc.start(start)
      osc.stop(start + length + 0.05)
    }
  } catch {
    /* ignorieren */
  }
}

/** Vibration – nur nach einer Nutzeraktion erlaubt */
export function vibrate(pattern: number | number[]) {
  const activated = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true
  if (activated) navigator.vibrate?.(pattern)
}
