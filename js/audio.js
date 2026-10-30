'use strict';
// Klang: Musik und Geräusche werden live mit der Web-Audio-API erzeugt (keine Audiodateien nötig).
(function () {
  const A = (G.Audio = { music: 0.5, sfx: 0.7, muted: false, ctx: null, theme: null, intensity: 0 });
  let ctx, master, musicBus, sfxBus, noiseBuf, verb;
  const lastPlay = {};

  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = A.ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    musicBus = ctx.createGain(); sfxBus = ctx.createGain();
    // Einfacher Hall aus abklingendem Rauschen
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5); }
    verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.28;
    musicBus.connect(master); musicBus.connect(verb); sfxBus.connect(master); sfxBus.connect(verb); verb.connect(wet); wet.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    A.apply();
    setInterval(schedule, 50);
  };
  A.apply = function () {
    if (!ctx) return;
    master.gain.value = A.muted ? 0 : 1;
    musicBus.gain.value = A.music * 0.55;
    sfxBus.gain.value = A.sfx * 0.8;
  };

  // --- Bausteine ------------------------------------------------------------
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(bus, freq, t, dur, type, peak, opts) {
    opts = opts || {};
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opts.slide), t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    let node = o;
    if (opts.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.lp; o.connect(f); node = f; }
    node.connect(g); g.connect(opts.pan !== undefined && ctx.createStereoPanner ? panner(opts.pan, bus) : bus);
    env(g, t, opts.a || 0.005, peak, dur);
    o.start(t); o.stop(t + (opts.a || 0.005) + dur + 0.05);
  }
  function noise(bus, t, dur, peak, type, freq, q, opts) {
    opts = opts || {};
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + dur);
    const g = ctx.createGain();
    s.connect(f); f.connect(g); g.connect(opts.pan !== undefined && ctx.createStereoPanner ? panner(opts.pan, bus) : bus);
    env(g, t, opts.a || 0.003, peak, dur);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.1);
  }
  function panner(v, bus) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, v)); p.connect(bus); return p; }

  // --- Geräusche ------------------------------------------------------------
  const SFX = {
    schwert(t, v, pan) { // Klingen-Klirren + dumpfer Treffer
      const f = 1800 + Math.random() * 1600;
      tone(sfxBus, f, t, 0.12, 'triangle', 0.10 * v, { pan, slide: 0.9 });
      tone(sfxBus, f * 1.47, t, 0.08, 'sine', 0.06 * v, { pan });
      noise(sfxBus, t, 0.06, 0.22 * v, 'bandpass', 3500, 2, { pan });
      noise(sfxBus, t, 0.09, 0.25 * v, 'lowpass', 400, 1, { pan });
    },
    treffer(t, v, pan) { noise(sfxBus, t, 0.14, 0.35 * v, 'lowpass', 600, 1, { pan }); tone(sfxBus, 90, t, 0.12, 'sine', 0.2 * v, { pan, slide: 0.6 }); },
    pfeil(t, v, pan) { noise(sfxBus, t, 0.16, 0.12 * v, 'bandpass', 2400, 3, { pan, sweep: 900 }); tone(sfxBus, 260, t, 0.06, 'triangle', 0.05 * v, { pan, slide: 0.7 }); },
    zauber(t, v, pan) { tone(sfxBus, 500, t, 0.35, 'sawtooth', 0.05 * v, { pan, slide: 2.2, lp: 2200 }); tone(sfxBus, 760, t, 0.3, 'sine', 0.06 * v, { pan, slide: 1.8 }); },
    feuer(t, v, pan) { noise(sfxBus, t, 0.4, 0.18 * v, 'lowpass', 1200, 1, { pan, sweep: 300, a: 0.03 }); },
    kanone(t, v, pan) { noise(sfxBus, t, 0.3, 0.4 * v, 'lowpass', 500, 1, { pan, sweep: 120 }); tone(sfxBus, 70, t, 0.25, 'sine', 0.3 * v, { pan, slide: 0.5 }); },
    explosion(t, v, pan) { noise(sfxBus, t, 0.7, 0.5 * v, 'lowpass', 900, 0.7, { pan, sweep: 80 }); tone(sfxBus, 55, t, 0.5, 'sine', 0.35 * v, { pan, slide: 0.5 }); },
    tod(t, v, pan) { // Stöhnen: absinkender, gefilterter Ton + Röcheln
      const f = 140 + Math.random() * 90;
      tone(sfxBus, f, t, 0.45, 'sawtooth', 0.09 * v, { pan, slide: 0.55, lp: 900, a: 0.02 });
      noise(sfxBus, t + 0.02, 0.25, 0.12 * v, 'bandpass', 700, 2, { pan, sweep: 300 });
      noise(sfxBus, t, 0.08, 0.22 * v, 'lowpass', 300, 1, { pan });
    },
    einsturz(t, v, pan) { for (let i = 0; i < 5; i++) noise(sfxBus, t + i * 0.09, 0.5, 0.35 * v, 'lowpass', 500 - i * 60, 0.8, { pan, sweep: 90 }); },
    bau(t, v, pan) { for (let i = 0; i < 3; i++) { tone(sfxBus, 420, t + i * 0.16, 0.07, 'square', 0.06 * v, { pan, lp: 1400 }); noise(sfxBus, t + i * 0.16, 0.05, 0.15 * v, 'bandpass', 1800, 2, { pan }); } },
    fertig(t, v) { [0, 4, 7, 12].forEach((s, i) => tone(sfxBus, mtof(72 + s), t + i * 0.08, 0.3, 'triangle', 0.08 * v)); },
    level(t, v) { [0, 4, 7, 11, 14].forEach((s, i) => tone(sfxBus, mtof(76 + s), t + i * 0.06, 0.4, 'sine', 0.09 * v)); },
    kauf(t, v) { tone(sfxBus, 1900, t, 0.12, 'sine', 0.1 * v); tone(sfxBus, 2530, t + 0.07, 0.25, 'sine', 0.09 * v); },
    heilung(t, v, pan) { [0, 7, 12].forEach((s, i) => tone(sfxBus, mtof(81 + s), t + i * 0.05, 0.4, 'sine', 0.05 * v, { pan })); },
    beschwoerung(t, v, pan) { tone(sfxBus, 180, t, 0.6, 'sawtooth', 0.06 * v, { pan, slide: 2.5, lp: 900, a: 0.1 }); noise(sfxBus, t, 0.5, 0.08 * v, 'bandpass', 600, 4, { pan, sweep: 2400, a: 0.1 }); },
    faehigkeit(t, v, pan) { tone(sfxBus, 220, t, 0.8, 'sawtooth', 0.08 * v, { pan, lp: 1600, a: 0.05 }); tone(sfxBus, 330, t + 0.05, 0.8, 'sawtooth', 0.06 * v, { pan, lp: 1600, a: 0.05 }); noise(sfxBus, t, 0.6, 0.1 * v, 'highpass', 3000, 1, { pan, a: 0.2 }); },
    horn(t, v) { [0, 0.45].forEach((d, i) => { tone(sfxBus, mtof(50 + i * 7), t + d, 0.9, 'sawtooth', 0.12 * v, { lp: 900, a: 0.08 }); tone(sfxBus, mtof(62 + i * 7), t + d, 0.9, 'sawtooth', 0.06 * v, { lp: 1200, a: 0.08 }); }); },
    alarm(t, v) { for (let i = 0; i < 3; i++) tone(sfxBus, 660, t + i * 0.3, 0.2, 'square', 0.07 * v, { lp: 1800 }); },
  };
  const MIN_GAP = { schwert: 0.05, treffer: 0.08, pfeil: 0.06, zauber: 0.08, feuer: 0.15, kanone: 0.1, explosion: 0.08, tod: 0.07, einsturz: 0.3, bau: 0.3 };

  // Positionsbezogen: nur hörbar, wenn im Bild; Lautstärke nach Entfernung zur Kameramitte
  G.sfx = function (name, x, y, vol, global) {
    if (!ctx || A.muted || !SFX[name] || !G.R || !G.R.ready()) return;
    const now = ctx.currentTime;
    if (lastPlay[name] && now - lastPlay[name] < (MIN_GAP[name] || 0.05)) return;
    let v = vol === undefined ? 1 : vol, pan = 0;
    if (!global && x !== undefined) {
      if (G.visibleAt && G.S && !G.visibleAt(x, y)) return; // im Nebel bleibt es still
      const cam = G.R.cam, vw = G.R.viewW(), vh = G.R.viewH();
      const cx = cam.x + vw / 2, cy = cam.y + vh / 2;
      const dx = (x - cx) / (vw / 2), dy = (y - cy) / (vh / 2);
      const d = Math.hypot(dx, dy);
      if (d > 1.4) return;
      v *= Math.max(0.15, 1 - d * 0.6) * Math.min(1.2, cam.z);
      pan = Math.max(-0.8, Math.min(0.8, dx * 0.7));
    }
    lastPlay[name] = now;
    SFX[name](now + 0.01, v, pan);
  };

  // --- Musik ------------------------------------------------------------------
  // Generative Begleitung je Kartenthema: Flächenklang, Melodie und Trommeln (stärker bei Kämpfen).
  let nextBeat = 0, beat = 0, phrase = [], chordRoot = 0;
  A.setTheme = function (key) { A.theme = key ? G.THEMES[key].music : null; beat = 0; nextBeat = ctx ? ctx.currentTime + 0.3 : 0; };
  function lead(kind, f, t, dur, v) {
    switch (kind) {
      case 'laute': tone(musicBus, f, t, dur * 0.9, 'triangle', 0.09 * v); tone(musicBus, f * 2, t, dur * 0.4, 'sine', 0.03 * v); break;
      case 'harfe': tone(musicBus, f, t, dur * 1.6, 'sine', 0.08 * v); tone(musicBus, f * 3, t, dur * 0.5, 'sine', 0.015 * v); break;
      case 'glocke': tone(musicBus, f, t, dur * 2.2, 'sine', 0.07 * v); tone(musicBus, f * 2.76, t, dur, 'sine', 0.025 * v); break;
      case 'horn': tone(musicBus, f, t, dur * 1.1, 'sawtooth', 0.05 * v, { lp: 1100, a: 0.06 }); tone(musicBus, f / 2, t, dur * 1.1, 'sawtooth', 0.03 * v, { lp: 700, a: 0.06 }); break;
    }
  }
  function pad(kind, f, t, dur) {
    const p = kind === 'glas' ? { type: 'sine', lp: 3000, v: 0.035 } : kind === 'dunkel' ? { type: 'sawtooth', lp: 500, v: 0.03 } : { type: 'triangle', lp: 1400, v: 0.035 };
    [1, 1.5, 2].forEach((m, i) => tone(musicBus, f * m, t, dur, p.type, p.v / (i + 1), { lp: p.lp, a: dur * 0.35, detune: (i - 1) * 6 }));
  }
  function drum(kind, step, t, inten) {
    if (kind === 'keine' && inten < 0.3) return;
    const heavy = kind === 'schwer' || kind === 'kriegstrommel';
    if (step % 8 === 0 || (heavy && step % 8 === 3) || (inten > 0.5 && step % 4 === 2)) {
      tone(musicBus, heavy ? 55 : 75, t, 0.35, 'sine', (heavy ? 0.28 : 0.16) * (0.6 + inten), { slide: 0.5 });
      noise(musicBus, t, 0.12, 0.08 * (0.5 + inten), 'lowpass', 300, 1);
    }
    if ((heavy || inten > 0.3) && step % 2 === 1) noise(musicBus, t, 0.05, 0.03 * (0.4 + inten), 'highpass', 5000, 1);
  }
  function schedule() {
    if (!ctx || !A.theme || A.muted) return;
    const m = A.theme;
    const stepDur = 60 / m.tempo / 2;
    if (nextBeat < ctx.currentTime) nextBeat = ctx.currentTime + 0.05;
    while (nextBeat < ctx.currentTime + 0.25) {
      const t = nextBeat, step = beat % 16, sc = m.scale;
      const inten = A.intensity;
      if (beat % 32 === 0) {
        chordRoot = [0, 3, 4, 0, 5, 3][Math.floor(beat / 32) % 6] % sc.length;
        pad(m.pad, mtof(m.root - 12 + sc[chordRoot]), t, stepDur * 32);
        // neue Phrase: zufällige Schritte durch die Tonleiter
        phrase = []; let idx = chordRoot + sc.length;
        for (let i = 0; i < 16; i++) { idx = Math.max(0, Math.min(sc.length * 3 - 1, idx + Math.floor(Math.random() * 5) - 2)); phrase.push(Math.random() < (0.45 + inten * 0.3) ? idx : null); }
      }
      const n = phrase[step];
      if (n !== null && n !== undefined && (step % 2 === 0 || inten > 0.4)) {
        const midi = m.root + sc[n % sc.length] + 12 * Math.floor(n / sc.length) - 12;
        lead(m.lead, mtof(midi), t, stepDur * 2, 0.7 + inten * 0.4);
      }
      if (step % 8 === 0) tone(musicBus, mtof(m.root - 24 + sc[chordRoot]), t, stepDur * 7, 'triangle', 0.07, { lp: 400, a: 0.05 });
      drum(m.drums, step, t, inten);
      nextBeat += stepDur; beat++;
    }
  }
})();
