'use strict';
// Landschaft zeichnen: Pflanzen und Steine (mit Wind), große Geländemerkmale (Teiche, Mondseen, Moore, Wasserlöcher,
// Eisseen, Lavaseen, Felsgruppen, Tafelberge, Felsnadeln, Eis- und Obsidianspitzen, Kristalle, Urbäume, Steinkreise,
// Ruinen, Schlote, Blumenwiesen, Feenringe, Knochenfelder, Gerippe, Schneewehen, Glutspalten) und eine Luftschicht
// voller Leben (Schmetterlinge, Enten, Fische, Irrlichter, Staubteufel, Glut, Rauch, Blätter, Lichtschein).
// Der Boden unter den Merkmalen wird einmal vorgezeichnet (so erscheinen sie auch auf der Minikarte), Bewegtes jedes Bild.
(function () {
  const R = G.R, lib = R.lib, INK = lib.INK;
  const L = (R.L = {});
  const TAU = Math.PI * 2;
  let ctx = null; // aktueller Zeichenkontext (Spielfeld oder Menü-Vorschau)

  // --- Werkzeuge ---------------------------------------------------------------
  function outline(w) { ctx.lineWidth = w || 2.5; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); }
  function circ(x, y, r, fill, lw) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill(); if (lw) outline(lw); }
  function shadow(x, y, rx, ry, a) { ctx.fillStyle = `rgba(0,0,0,${a || 0.28})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); }
  function star(x, y, r, col) { // Funkeln: vierzackiger Lichtpunkt
    ctx.strokeStyle = col || '#ffffff'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r * 0.7); ctx.lineTo(x, y + r * 0.7); ctx.stroke();
  }
  function srand(seed) { let s = (Math.floor(seed * 2147483646) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  const frac = (v) => v - Math.floor(v);
  // feste Zufallsanordnung je Merkmal (Seerosen, Felsbrocken, Säulen …), einmal berechnet
  const lays = new WeakMap();
  function lay(f, make) { let o = lays.get(f); if (!o) { o = make(srand(frac(f.seed * 7.31) + 0.0001)); lays.set(f, o); } return o; }

  // Unregelmäßiger Umriss (nur Einbuchtungen – das Kollisions-Oval wird nie überschritten)
  const blobs = new WeakMap();
  function blobPts(f) {
    let p = blobs.get(f);
    if (p) return p;
    const r = srand(f.seed), n = 28, p1 = r() * TAU, p2 = r() * TAU, a1 = 0.05 + r() * 0.06, a2 = 0.02 + r() * 0.04;
    p = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, k = 1 - a1 * (0.5 + 0.5 * Math.sin(2 * a + p1)) - a2 * (0.5 + 0.5 * Math.sin(5 * a + p2));
      p.push(Math.cos(a) * k, Math.sin(a) * k);
    }
    blobs.set(f, p);
    return p;
  }
  function blobPath(c, f, sx, sy, oy) { // weicher, geschlossener Umriss
    const p = blobPts(f), n = p.length / 2, o = oy || 0;
    const X = (j) => f.x + p[2 * (j % n)] * f.rx * sx, Y = (j) => f.y + o + p[2 * (j % n) + 1] * f.ry * sy;
    c.beginPath();
    c.moveTo((X(n - 1) + X(0)) / 2, (Y(n - 1) + Y(0)) / 2);
    for (let j = 0; j < n; j++) c.quadraticCurveTo(X(j), Y(j), (X(j) + X(j + 1)) / 2, (Y(j) + Y(j + 1)) / 2);
    c.closePath();
  }
  const inside = (r, lim) => { for (;;) { const u = r() * 2 - 1, v = r() * 2 - 1; if (u * u + v * v < lim * lim) return [u, v]; } };
  const sound = (name, x, y, v) => { if (G.sfx) G.sfx(name, x, y, v); };

  // =============================================================================
  // Pflanzen und Steine
  const SWAY = (t, d, sp, amp) => Math.sin(t * sp + d.seed * 40) * amp * d.s;
  const FLORA = {
    eiche(d, x, y, s, t, c) {
      const sw = SWAY(t, d, 1.1, 1.6);
      shadow(x + 6, y + 6, 24 * s, 10 * s);
      ctx.fillStyle = '#5a3a22'; ctx.fillRect(x - 3 * s, y - 6 * s, 6 * s, 14 * s); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x - 3 * s, y - 6 * s, 6 * s, 14 * s);
      circ(x - 9 * s + sw * 0.6, y - 14 * s, 13 * s, c[d.v % 2], 2.5); circ(x + 9 * s + sw * 0.7, y - 15 * s, 13 * s, c[(d.v + 1) % 2], 2.5); circ(x + sw, y - 26 * s, 15 * s, c[0], 2.5);
      ctx.fillStyle = 'rgba(255,255,200,0.18)'; ctx.beginPath(); ctx.arc(x - 4 * s + sw, y - 31 * s, 7 * s, 0, TAU); ctx.fill();
    },
    birke(d, x, y, s, t) {
      const sw = SWAY(t, d, 1.3, 1.8);
      shadow(x + 5, y + 5, 16 * s, 7 * s);
      ctx.fillStyle = '#ece6da'; ctx.fillRect(x - 2.5 * s, y - 24 * s, 5 * s, 30 * s); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.strokeRect(x - 2.5 * s, y - 24 * s, 5 * s, 30 * s);
      ctx.fillStyle = '#2a2420'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 2.5 * s + (i % 2) * 2.5 * s, y - (2 + i * 6) * s, 2.5 * s, 1.4 * s);
      circ(x - 7 * s + sw * 0.6, y - 26 * s, 9 * s, '#76a43c', 1.8); circ(x + 7 * s + sw * 0.7, y - 28 * s, 9 * s, '#88b648', 1.8); circ(x + sw, y - 37 * s, 10 * s, '#98c656', 1.8);
      ctx.fillStyle = 'rgba(255,255,210,0.22)'; ctx.beginPath(); ctx.arc(x - 3 * s + sw, y - 40 * s, 4.5 * s, 0, TAU); ctx.fill();
    },
    busch(d, x, y, s, t) {
      const sw = SWAY(t, d, 1.5, 0.8);
      shadow(x + 4, y + 3, 15 * s, 6 * s);
      circ(x - 7 * s, y - 6 * s, 8 * s, '#3f6a2a', 2); circ(x + 7 * s, y - 6 * s, 8 * s, '#3f6a2a', 2); circ(x + sw, y - 11 * s, 9 * s, '#4f7d33', 2);
      ctx.fillStyle = 'rgba(255,255,200,0.16)'; ctx.beginPath(); ctx.arc(x - 3 * s + sw, y - 14 * s, 4 * s, 0, TAU); ctx.fill();
      if (d.v < 2) for (let i = 0; i < 5; i++) circ(x + (hash(i, d.seed * 50) - 0.5) * 18 * s + sw, y - 5 * s - hash(i + 3, d.seed * 50) * 10 * s, 1.7 * s, d.v ? '#f4f0ff' : '#d8283a');
    },
    blumen(d, x, y, s, t) {
      const cols = ['#f4e36a', '#ffffff', '#e86a8a', '#9ab0ff', '#ff9a4a'];
      ctx.strokeStyle = '#3f7a2a'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        const bx = x + (hash(i, d.seed * 70) - 0.5) * 16 * s, h = (6 + hash(i + 9, d.seed * 70) * 7) * s, sw = Math.sin(t * 2 + i + d.seed * 30) * 1.5 * s;
        ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx, y - h * 0.6, bx + sw, y - h); ctx.stroke();
        circ(bx + sw, y - h, 2.2 * s, cols[(i + d.v) % cols.length], 1);
        ctx.strokeStyle = '#3f7a2a'; ctx.lineWidth = 1.2;
      }
    },
    gras(d, x, y, s, t) {
      const cols = G.S.theme === 'steppe' ? ['#b8964a', '#d0ae62', '#9a7a3a'] : ['#4f8a2a', '#6aa23a', '#3f7022'];
      ctx.lineWidth = 1.7; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const bx = x + (i - 3) * 2.2 * s, h = (9 + hash(i, d.seed * 90) * 9) * s, lean = (i - 3) * 1.6 * s + Math.sin(t * 1.8 + d.seed * 30 + i * 0.3) * 2.4 * s;
        ctx.strokeStyle = cols[i % 3]; ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx + lean * 0.3, y - h * 0.6, bx + lean, y - h); ctx.stroke();
      }
      ctx.lineCap = 'butt';
    },
    stein(d, x, y, s) {
      shadow(x + 4, y + 3, 11 * s, 4.5 * s);
      ctx.beginPath(); ctx.moveTo(x - 10 * s, y + 1 * s); ctx.lineTo(x - 7 * s, y - 7 * s); ctx.lineTo(x + 1 * s, y - 11 * s); ctx.lineTo(x + 9 * s, y - 6 * s); ctx.lineTo(x + 11 * s, y + 1 * s); ctx.closePath();
      ctx.fillStyle = d.v ? '#8e8c84' : '#a2a098'; ctx.fill(); outline(2);
      ctx.fillStyle = '#5a8a3a'; ctx.beginPath(); ctx.ellipse(x - 1 * s, y - 9 * s, 5 * s, 2.2 * s, -0.3, 0, TAU); ctx.fill();
    },
    stumpf(d, x, y, s) {
      shadow(x + 4, y + 3, 11 * s, 4.5 * s);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 7 * s, y - 1 * s); ctx.lineTo(x - 12 * s, y + 2 * s); ctx.moveTo(x + 7 * s, y - 1 * s); ctx.lineTo(x + 12 * s, y + 1 * s); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(x - 8 * s, y); ctx.lineTo(x - 7 * s, y - 9 * s); ctx.lineTo(x + 7 * s, y - 9 * s); ctx.lineTo(x + 8 * s, y); ctx.closePath(); ctx.fillStyle = '#6a4a2a'; ctx.fill(); outline(2);
      ctx.beginPath(); ctx.ellipse(x, y - 9 * s, 7 * s, 3.2 * s, 0, 0, TAU); ctx.fillStyle = '#c8a070'; ctx.fill(); outline(1.6);
      ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - 9 * s, 3.5 * s, 1.5 * s, 0, 0, TAU); ctx.stroke();
    },
    hochbaum(d, x, y, s, t, c) {
      const sw = SWAY(t, d, 0.9, 1.5);
      shadow(x + 6, y + 6, 18 * s, 8 * s);
      ctx.fillStyle = '#c8c0b0'; ctx.fillRect(x - 3 * s, y - 10 * s, 6 * s, 18 * s); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x - 3 * s, y - 10 * s, 6 * s, 18 * s);
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x + sw * (0.4 + i * 0.3), y - (16 + i * 14) * s, (16 - i * 3) * s, 10 * s, 0, 0, TAU); ctx.fillStyle = c[i % 2]; ctx.fill(); outline(2); }
      ctx.fillStyle = c[2]; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 2 + d.seed * 10);
      ctx.beginPath(); ctx.arc(x + 8 * s + sw * 0.7, y - 20 * s, 2.5 * s, 0, TAU); ctx.moveTo(x - 5 * s + sw, y - 34 * s); ctx.arc(x - 7 * s + sw, y - 34 * s, 2 * s, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    },
    farn(d, x, y, s, t) {
      ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.42 + Math.sin(t * 1.4 + d.seed * 20 + i) * 0.06, len = (12 + (i % 3) * 3) * s;
        const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len * 0.8;
        ctx.strokeStyle = i % 2 ? '#3f8a52' : '#5aa86a'; ctx.lineWidth = 2.2 * s;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.6, y + Math.sin(a) * len * 0.4 - 3 * s, ex, ey); ctx.stroke();
        ctx.lineWidth = 1.2 * s; ctx.beginPath();
        for (let k = 1; k < 3; k++) { const q = k / 3, px = x + (ex - x) * q, py = y + (ey - y) * q - 2 * s; ctx.moveTo(px - 2.6 * s, py - 1.4 * s); ctx.lineTo(px + 2.6 * s, py + 1.4 * s); }
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    },
    leuchtpilz(d, x, y, s, t) {
      const gl = 0.55 + 0.45 * Math.sin(t * 2.2 + d.seed * 30);
      for (let i = 0; i < 3; i++) {
        const mx = x + (i - 1) * 6 * s, h = (5 + (i % 2) * 4) * s, r = (4 + (i % 2)) * s;
        ctx.fillStyle = '#e8f0e0'; ctx.fillRect(mx - 1 * s, y - h, 2 * s, h);
        ctx.globalAlpha = 0.28 * gl; circ(mx, y - h, r * 2.3, '#7af0ff'); ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.ellipse(mx, y - h, r, r * 0.65, 0, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = '#4ad8ea'; ctx.fill(); outline(1.3);
        circ(mx - r * 0.3, y - h - r * 0.3, 0.9 * s, `rgba(235,255,255,${0.4 + 0.6 * gl})`);
      }
    },
    moosstein(d, x, y, s, t) {
      shadow(x + 4, y + 4, 14 * s, 5 * s);
      ctx.beginPath(); ctx.moveTo(x - 13 * s, y + 1 * s); ctx.quadraticCurveTo(x - 12 * s, y - 13 * s, x, y - 15 * s); ctx.quadraticCurveTo(x + 13 * s, y - 13 * s, x + 13 * s, y + 1 * s); ctx.closePath();
      ctx.fillStyle = '#7a8a84'; ctx.fill(); outline(2);
      ctx.fillStyle = '#3f7a4a'; ctx.beginPath(); ctx.ellipse(x - 2 * s, y - 12 * s, 9 * s, 4 * s, -0.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(150,255,240,${0.35 + 0.45 * Math.sin(t * 1.6 + d.seed * 20)})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - 3 * s, y - 2 * s); ctx.lineTo(x, y - 7 * s); ctx.lineTo(x + 3 * s, y - 2 * s); ctx.moveTo(x, y - 7 * s); ctx.lineTo(x, y - 1 * s); ctx.stroke();
    },
    totbaum(d, x, y, s, t) {
      const sw = SWAY(t, d, 0.7, 0.8);
      shadow(x + 6, y + 4, 16 * s, 6 * s);
      ctx.lineCap = 'round';
      const br = () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 26 * s); ctx.moveTo(x, y - 16 * s); ctx.lineTo(x - 12 * s + sw, y - 30 * s); ctx.moveTo(x, y - 22 * s); ctx.lineTo(x + 13 * s + sw, y - 34 * s); ctx.moveTo(x - 6 * s, y - 24 * s); ctx.lineTo(x - 4 * s + sw, y - 38 * s); ctx.stroke(); };
      ctx.strokeStyle = INK; ctx.lineWidth = 7 * s; br(); ctx.strokeStyle = '#3a3430'; ctx.lineWidth = 4 * s; br(); ctx.lineCap = 'butt';
      if (d.v === 1) { ctx.strokeStyle = 'rgba(120,140,90,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 10 * s + sw, y - 28 * s); ctx.quadraticCurveTo(x - 11 * s + sw * 1.5, y - 20 * s, x - 9 * s + sw * 2, y - 16 * s); ctx.stroke(); } // Moosfäden
    },
    grabstein(d, x, y, s) {
      shadow(x + 3, y + 4, 12 * s, 5 * s);
      ctx.save(); ctx.translate(x, y); ctx.rotate((d.v - 1) * 0.12);
      if (d.v === 2) { // Keltenkreuz
        ctx.beginPath(); ctx.rect(-2.5 * s, -22 * s, 5 * s, 22 * s); ctx.rect(-8 * s, -17 * s, 16 * s, 5 * s); ctx.fillStyle = '#6a6a72'; ctx.fill(); outline(2);
        ctx.beginPath(); ctx.arc(0, -14.5 * s, 5.5 * s, 0, TAU); ctx.lineWidth = 2.2; ctx.strokeStyle = '#6a6a72'; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(-8 * s, 0); ctx.lineTo(-8 * s, -14 * s); ctx.arc(0, -14 * s, 8 * s, Math.PI, 0); ctx.lineTo(8 * s, 0); ctx.closePath();
        ctx.fillStyle = '#6a6a72'; ctx.fill(); outline(2);
        ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -18 * s); ctx.lineTo(0, -8 * s); ctx.moveTo(-4 * s, -14 * s); ctx.lineTo(4 * s, -14 * s); ctx.stroke();
        ctx.fillStyle = 'rgba(90,120,70,0.7)'; ctx.beginPath(); ctx.ellipse(-3 * s, -1 * s, 6 * s, 2 * s, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    },
    schilf(d, x, y, s, t) {
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const bx = x + (i - 2.5) * 2.4 * s, h = (14 + hash(i, d.seed * 40) * 10) * s, sw = Math.sin(t * 1.3 + d.seed * 20 + i * 0.4) * 2.2 * s;
        ctx.strokeStyle = i % 2 ? '#4a5a2a' : '#5e6e34'; ctx.lineWidth = 1.8 * s;
        ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx, y - h * 0.6, bx + sw, y - h); ctx.stroke();
        if (i === 1 || i === 4) { ctx.fillStyle = '#5a3a1e'; ctx.beginPath(); ctx.ellipse(bx + sw * 0.9, y - h * 0.85, 1.8 * s, 4 * s, 0, 0, TAU); ctx.fill(); }
      }
      ctx.lineCap = 'butt';
    },
    fliegenpilz(d, x, y, s) {
      for (let i = 0; i < 2 + (d.v % 2); i++) {
        const mx = x + (i - 0.5) * 8 * s, h = (5 + i * 2) * s, r = (5 - i) * s;
        ctx.fillStyle = '#f0ead8'; ctx.fillRect(mx - 1.4 * s, y - h, 2.8 * s, h);
        ctx.beginPath(); ctx.ellipse(mx, y - h, r, r * 0.7, 0, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = '#d8282a'; ctx.fill(); outline(1.4);
        circ(mx - r * 0.4, y - h - r * 0.35, 0.9 * s, '#ffffff'); circ(mx + r * 0.3, y - h - r * 0.45, 0.8 * s, '#ffffff');
      }
    },
    wurzel(d, x, y, s) {
      shadow(x + 3, y + 3, 16 * s, 5 * s);
      ctx.lineCap = 'round';
      for (const [w, col] of [[7 * s, INK], [4.5 * s, '#4a3a2a']]) {
        ctx.strokeStyle = col; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(x - 14 * s, y); ctx.bezierCurveTo(x - 10 * s, y - 16 * s, x + 6 * s, y - 18 * s, x + 12 * s, y);
        ctx.moveTo(x - 4 * s, y - 11 * s); ctx.quadraticCurveTo(x - 2 * s, y - 20 * s, x + 4 * s, y - 22 * s); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x + (i - 1) * 5 * s, y - 13 * s + (i % 2) * 2 * s, 3 * s, 1.8 * s, 0, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = '#c8b48a'; ctx.fill(); outline(1); }
    },
    fels(d, x, y, s, t, c) {
      shadow(x + 5, y + 4, 18 * s, 7 * s);
      ctx.beginPath(); ctx.moveTo(x - 16 * s, y + 2 * s); ctx.lineTo(x - 12 * s, y - 12 * s); ctx.lineTo(x - 2 * s, y - 20 * s); ctx.lineTo(x + 12 * s, y - 14 * s); ctx.lineTo(x + 17 * s, y + 2 * s); ctx.closePath();
      ctx.fillStyle = c[d.v % 2]; ctx.fill(); outline(2.5);
      ctx.fillStyle = 'rgba(255,230,200,0.25)'; ctx.beginPath(); ctx.moveTo(x - 12 * s, y - 12 * s); ctx.lineTo(x - 2 * s, y - 20 * s); ctx.lineTo(x + 2 * s, y - 8 * s); ctx.closePath(); ctx.fill();
    },
    knochen(d, x, y, s) {
      shadow(x + 4, y + 3, 14 * s, 5 * s);
      ctx.lineCap = 'round';
      ctx.strokeStyle = INK; ctx.lineWidth = 5 * s;
      ctx.beginPath(); ctx.moveTo(x - 12 * s, y - 2 * s); ctx.lineTo(x + 12 * s, y - 8 * s); ctx.moveTo(x - 8 * s, y - 10 * s); ctx.lineTo(x + 10 * s, y + 2 * s); ctx.stroke();
      ctx.strokeStyle = G.S.theme === 'asche' ? '#8a7e72' : '#e8e0d0'; ctx.lineWidth = 3 * s; ctx.stroke(); ctx.lineCap = 'butt';
    },
    dornbusch(d, x, y, s, t) {
      const sw = SWAY(t, d, 1.4, 1);
      shadow(x + 3, y + 3, 13 * s, 4.5 * s);
      ctx.lineCap = 'round';
      const br = [[0, -14, -9, -20], [0, -12, 8, -19], [-4, -8, -13, -11], [4, -7, 13, -10], [0, -6, -2, -22]];
      for (const [w, col] of [[3.2 * s, INK], [1.8 * s, '#6a4a2e']]) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
        for (const [ax, ay, bx, by] of br) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + ax * s, y + ay * s, x + bx * s + sw, y + by * s); }
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      if (d.v !== 2) for (let i = 0; i < 4; i++) circ(x + (hash(i, d.seed * 9) - 0.5) * 22 * s + sw, y - (10 + hash(i + 2, d.seed * 9) * 10) * s, 1.6 * s, d.v ? '#e84a3a' : '#f4e06a');
    },
    akazie(d, x, y, s, t) {
      const sw = SWAY(t, d, 0.8, 1.4);
      shadow(x + 10, y + 6, 30 * s, 9 * s);
      ctx.lineCap = 'round';
      for (const [w, col] of [[6 * s, INK], [3.6 * s, '#5a3a24']]) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x, y - 14 * s); ctx.lineTo(x - 10 * s + sw * 0.5, y - 28 * s); ctx.moveTo(x, y - 14 * s); ctx.lineTo(x + 11 * s + sw * 0.5, y - 26 * s); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.ellipse(x + sw, y - 30 * s, 30 * s, 8 * s, 0, 0, TAU); ctx.fillStyle = '#5e6e26'; ctx.fill(); outline(2.2);
      ctx.beginPath(); ctx.ellipse(x - 4 * s + sw, y - 34 * s, 21 * s, 6 * s, 0, 0, TAU); ctx.fillStyle = '#76883a'; ctx.fill(); outline(1.8);
      ctx.fillStyle = 'rgba(255,240,180,0.18)'; ctx.beginPath(); ctx.ellipse(x - 8 * s + sw, y - 36 * s, 9 * s, 2.5 * s, 0, 0, TAU); ctx.fill();
    },
    schaedel(d, x, y, s) {
      shadow(x + 3, y + 3, 11 * s, 4 * s);
      ctx.lineCap = 'round';
      for (const [w, col] of [[4.5 * s, INK], [2.6 * s, '#e8dcc0']]) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
        ctx.moveTo(x - 4 * s, y - 8 * s); ctx.quadraticCurveTo(x - 14 * s, y - 12 * s, x - 13 * s, y - 20 * s);
        ctx.moveTo(x + 4 * s, y - 8 * s); ctx.quadraticCurveTo(x + 14 * s, y - 12 * s, x + 13 * s, y - 20 * s); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(x - 6 * s, y - 10 * s); ctx.quadraticCurveTo(x, y - 14 * s, x + 6 * s, y - 10 * s); ctx.lineTo(x + 3 * s, y); ctx.lineTo(x - 3 * s, y); ctx.closePath();
      ctx.fillStyle = '#efe6d0'; ctx.fill(); outline(1.8);
      circ(x - 2.5 * s, y - 8 * s, 1.6 * s, INK); circ(x + 2.5 * s, y - 8 * s, 1.6 * s, INK);
    },
    tanne(d, x, y, s, t, c) {
      const sw = SWAY(t, d, 0.9, 1.2);
      shadow(x + 6, y + 5, 18 * s, 7 * s);
      ctx.fillStyle = '#4a3020'; ctx.fillRect(x - 3 * s, y - 6 * s, 6 * s, 10 * s);
      for (let i = 0; i < 3; i++) {
        const yy = y - 6 * s - i * 12 * s, w = (18 - i * 4) * s, ox = sw * (i + 1) * 0.4;
        ctx.beginPath(); ctx.moveTo(x - w + ox * 0.5, yy); ctx.lineTo(x + ox, yy - 18 * s); ctx.lineTo(x + w + ox * 0.5, yy); ctx.closePath();
        ctx.fillStyle = c[i % 2]; ctx.fill(); outline(2);
        ctx.beginPath(); ctx.moveTo(x - w * 0.45 + ox * 0.7, yy - 10 * s); ctx.lineTo(x + ox, yy - 18 * s); ctx.lineTo(x + w * 0.45 + ox * 0.7, yy - 10 * s); ctx.closePath(); ctx.fillStyle = c[2]; ctx.fill();
      }
    },
    schneefels(d, x, y, s) {
      shadow(x + 5, y + 4, 17 * s, 6 * s);
      ctx.beginPath(); ctx.moveTo(x - 15 * s, y + 2 * s); ctx.lineTo(x - 11 * s, y - 11 * s); ctx.lineTo(x - 1 * s, y - 18 * s); ctx.lineTo(x + 11 * s, y - 12 * s); ctx.lineTo(x + 16 * s, y + 2 * s); ctx.closePath();
      ctx.fillStyle = d.v ? '#6e7680' : '#7e8690'; ctx.fill(); outline(2.3);
      ctx.beginPath(); ctx.moveTo(x - 12 * s, y - 9 * s); ctx.lineTo(x - 1 * s, y - 18 * s); ctx.lineTo(x + 11 * s, y - 12 * s); ctx.lineTo(x + 7 * s, y - 9 * s); ctx.lineTo(x + 2 * s, y - 11 * s); ctx.lineTo(x - 4 * s, y - 8 * s); ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#9ab0c4'; ctx.stroke();
    },
    eiskristall(d, x, y, s, t) {
      for (let i = 0; i < 3; i++) {
        const bx = x + (i - 1) * 5 * s, h = (8 + ((i + d.v) % 3) * 4) * s, w = 2.6 * s, lean = (i - 1) * 2 * s;
        ctx.beginPath(); ctx.moveTo(bx - w, y); ctx.lineTo(bx + lean, y - h); ctx.lineTo(bx + w, y); ctx.closePath();
        ctx.fillStyle = 'rgba(200,236,255,0.92)'; ctx.fill(); ctx.lineWidth = 1.3; ctx.strokeStyle = '#4a7a9a'; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(bx - w * 0.4, y - 1); ctx.lineTo(bx + lean * 0.8, y - h * 0.85); ctx.stroke();
      }
      const tw = Math.sin(t * 3 + d.seed * 50);
      if (tw > 0.6) star(x + 2 * s, y - 12 * s, (tw - 0.6) * 10 * s);
    },
    frostbusch(d, x, y, s) {
      shadow(x + 4, y + 3, 14 * s, 5 * s);
      circ(x - 6 * s, y - 6 * s, 7.5 * s, '#2e5444', 2); circ(x + 6 * s, y - 6 * s, 7.5 * s, '#2e5444', 2); circ(x, y - 11 * s, 8.5 * s, '#3a6454', 2);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y - 17 * s, 6 * s, 2.6 * s, 0, 0, TAU); ctx.moveTo(x - 3 * s, y - 11 * s); ctx.ellipse(x - 7 * s, y - 11 * s, 4 * s, 1.8 * s, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 6; i++) circ(x + (hash(i, d.seed * 7) - 0.5) * 18 * s, y - 4 * s - hash(i + 4, d.seed * 7) * 12 * s, 1.2 * s, '#e8f6ff');
    },
    obsidian(d, x, y, s, t, c) {
      shadow(x + 5, y + 4, 14 * s, 6 * s);
      ctx.beginPath(); ctx.moveTo(x - 10 * s, y + 2 * s); ctx.lineTo(x - 4 * s, y - 30 * s); ctx.lineTo(x + 2 * s, y - 10 * s); ctx.lineTo(x + 8 * s, y - 22 * s); ctx.lineTo(x + 12 * s, y + 2 * s); ctx.closePath();
      ctx.fillStyle = c[d.v % 2]; ctx.fill(); outline(2.5);
      ctx.strokeStyle = '#a88ae0'; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 8 * s, y); ctx.lineTo(x - 4 * s, y - 28 * s); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ff6a1a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 4 * s, y - 24 * s); ctx.lineTo(x - 2 * s, y - 6 * s); ctx.stroke();
    },
    glutloch(d, x, y, s, t) {
      ctx.beginPath(); ctx.ellipse(x, y, 20 * s, 10 * s, 0, 0, TAU); ctx.fillStyle = '#ff7a2a'; ctx.fill(); outline(2.5);
      ctx.fillStyle = '#ffd04a'; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 3 + d.seed * 9); ctx.beginPath(); ctx.ellipse(x - 4 * s, y - 2 * s, 8 * s, 3 * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      const ph = frac(t * 0.45 + d.seed * 5); // Blase steigt auf und platzt
      if (ph < 0.8) circ(x + 6 * s * Math.sin(d.seed * 20), y + 1 * s, (1 + ph * 3.5) * s, '#ffe48a', 1);
    },
    kohlebaum(d, x, y, s, t) {
      shadow(x + 6, y + 4, 16 * s, 6 * s);
      ctx.lineCap = 'round';
      const br = () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1 * s, y - 24 * s); ctx.moveTo(x, y - 14 * s); ctx.lineTo(x - 11 * s, y - 26 * s); ctx.lineTo(x - 15 * s, y - 24 * s); ctx.moveTo(x + 1 * s, y - 20 * s); ctx.lineTo(x + 12 * s, y - 32 * s); ctx.moveTo(x - 5 * s, y - 22 * s); ctx.lineTo(x - 3 * s, y - 34 * s); ctx.stroke(); };
      ctx.strokeStyle = INK; ctx.lineWidth = 7.5 * s; br(); ctx.strokeStyle = '#2a201c'; ctx.lineWidth = 4.5 * s; br();
      ctx.lineCap = 'butt';
      const gl = 0.45 + 0.4 * Math.sin(t * 2.4 + d.seed * 30);
      ctx.strokeStyle = `rgba(255,120,30,${gl})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y - 3 * s); ctx.lineTo(x + 1 * s, y - 10 * s); ctx.lineTo(x - 0.5 * s, y - 16 * s); ctx.stroke();
      circ(x - 11 * s, y - 26 * s, 1.3 * s, `rgba(255,170,60,${gl})`);
    },
    glutpilz(d, x, y, s, t) {
      const gl = 0.5 + 0.5 * Math.sin(t * 2.8 + d.seed * 40);
      for (let i = 0; i < 3; i++) {
        const mx = x + (i - 1) * 6 * s, h = (4 + (i % 2) * 4) * s, r = (3.6 + (i % 2)) * s;
        ctx.fillStyle = '#3a2a24'; ctx.fillRect(mx - 1 * s, y - h, 2 * s, h);
        ctx.globalAlpha = 0.3 * gl; circ(mx, y - h, r * 2, '#ff7a1a'); ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.ellipse(mx, y - h, r, r * 0.65, 0, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = '#2a1612'; ctx.fill(); outline(1.3);
        const sp = `rgb(255,${Math.round(140 + 80 * gl)},40)`;
        circ(mx - r * 0.35, y - h - r * 0.3, 0.9 * s, sp); circ(mx + r * 0.3, y - h - r * 0.2, 0.8 * s, sp);
      }
    },
  };
  // ältere Spielstände kennen nur eine Pflanzenart je Karte (mit Varianten)
  function legacyKind(d, th) {
    switch (th.decor) {
      case 'totbaum': return d.v === 0 ? 'grabstein' : 'totbaum';
      case 'fels': return d.v === 2 ? 'knochen' : 'fels';
      case 'lava': return d.v === 0 ? 'glutloch' : 'obsidian';
      default: return th.decor;
    }
  }
  L.flora = function (d, th) {
    ctx = lib.ctx();
    const k = d.k || legacyKind(d, th);
    if (G.FLORA_SMALL && G.FLORA_SMALL[k] && R.lodSimple) return; // Kleinkram nur in der Nähe
    const fn = FLORA[k];
    if (fn) fn(d, d.x, d.y, d.s, G.S.time, th.decorCols);
  };

  // =============================================================================
  // Gewässer, Eis und Lava
  const POOL = {
    teich:      { shore: '#b49a68', shore2: '#7a8a4a', center: '#2a6a8a', edge: '#5aaac4', reed: ['#4a7a2a', '#5e8e34'], ripple: 'rgba(230,250,255,0.8)', pads: 1, ducks: 1, fish: 1 },
    mondsee:    { shore: '#8aa89a', shore2: '#4a7a5a', center: '#1e5060', edge: '#6ac4d0', reed: ['#7ab89a', '#9ad0b8'], ripple: 'rgba(200,255,255,0.8)', moon: 1 },
    moor:       { shore: '#3e3a26', shore2: '#2c3020', center: '#1e2a16', edge: '#4a5a2e', reed: ['#3e4a22', '#55603a'], bog: 1 },
    wasserloch: { shore: '#9a6a3a', shore2: '#8a6a3a', center: '#2e6878', edge: '#62a4b0', reed: ['#8a8a3a', '#a09a48'], ripple: 'rgba(230,250,255,0.75)', fish: 1 },
    eissee:     { shore: '#f4f8fb', shore2: '#c8d8e4', center: '#e8f8ff', edge: '#94c4de', ice: 1 },
    lavasee:    { shore: '#2a1c18', shore2: '#120c0a', center: '#ffb43a', edge: '#b0280a', lava: 1 },
  };
  function bakePool(g, f, P) {
    g.globalAlpha = 0.45; g.fillStyle = P.shore2; blobPath(g, f, 1.34, 1.42); g.fill();
    g.globalAlpha = 0.95; g.fillStyle = P.shore; blobPath(g, f, 1.13, 1.2); g.fill();
    g.globalAlpha = 1;
    const gr = g.createRadialGradient(f.x - f.rx * 0.15, f.y - f.ry * 0.2, 0, f.x, f.y, f.rx);
    gr.addColorStop(0, P.center); gr.addColorStop(1, P.edge);
    g.fillStyle = gr; blobPath(g, f, 1, 1); g.fill();
    const r = srand(f.seed + 0.71);
    if (P.ice) { // Risse im Eis
      g.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        let [u, v] = inside(r, 0.5);
        g.strokeStyle = i % 2 ? 'rgba(255,255,255,0.9)' : 'rgba(90,140,180,0.55)'; g.lineWidth = i % 2 ? 2.2 : 1.4;
        g.beginPath(); g.moveTo(f.x + u * f.rx, f.y + v * f.ry);
        for (let k = 0; k < 4; k++) { u += (r() - 0.5) * 0.35; v += (r() - 0.5) * 0.35; g.lineTo(f.x + u * f.rx * 0.95, f.y + v * f.ry * 0.95); }
        g.stroke();
      }
    }
    if (P.bog) { // Algenteppich
      for (let i = 0; i < 9; i++) {
        const [u, v] = inside(r, 0.75);
        g.fillStyle = i % 3 ? 'rgba(90,120,40,0.45)' : 'rgba(120,140,60,0.4)';
        g.beginPath(); g.ellipse(f.x + u * f.rx, f.y + v * f.ry, f.rx * (0.08 + r() * 0.12), f.ry * (0.06 + r() * 0.1), r() * 3, 0, TAU); g.fill();
      }
    }
    if (P.lava) { g.lineWidth = 9; g.strokeStyle = 'rgba(20,10,8,0.85)'; blobPath(g, f, 1.04, 1.05); g.stroke(); }
    if (P.ice) for (let i = 0; i < 7; i++) { // Schneehaufen am Ufer
      const a = r() * TAU;
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(f.x + Math.cos(a) * f.rx * 1.02, f.y + Math.sin(a) * f.ry * 1.04, 12 + r() * 14, 6 + r() * 5, 0, 0, TAU); g.fill();
    }
  }
  function poolLayout(f, P) {
    return lay(f, (r) => {
      const o = { pads: [], reeds: [], bubbles: [], stumps: [], plates: [], last: {} };
      if (P.pads) for (let i = 0; i < 4 + Math.floor(r() * 4); i++) { const [u, v] = inside(r, 0.68); o.pads.push({ u, v, r: 6 + r() * 5, a: r() * TAU, fl: r() < 0.35, ph: r() * 6 }); }
      if (P.reed) {
        const n = Math.round(5 + f.rx / 18);
        for (let i = 0; i < n; i++) { const a = r() * TAU; if (Math.sin(a) > 0.55 && r() < 0.6) continue; o.reeds.push({ a, n: 3 + Math.floor(r() * 3), h: 14 + r() * 10, cat: r() < 0.6 }); }
      }
      if (P.bog || P.lava) for (let i = 0; i < 4; i++) o.bubbles.push({ per: 1.8 + r() * 1.8, off: r() });
      if (P.bog) for (let i = 0; i < 2; i++) { const [u, v] = inside(r, 0.55); o.stumps.push({ u, v, h: 8 + r() * 8 }); }
      if (P.lava) for (let i = 0; i < 7; i++) {
        const pts = []; for (let k = 0; k < 6; k++) pts.push(0.65 + r() * 0.35);
        o.plates.push({ a0: r() * TAU, rr: 0.22 + r() * 0.5, sz: 0.1 + r() * 0.09, sp: (r() < 0.5 ? -1 : 1) * (0.03 + r() * 0.04), pts });
      }
      return o;
    });
  }
  function drawPool(f, P, t) {
    const o = poolLayout(f, P), lo = R.lodSimple;
    ctx.save();
    blobPath(ctx, f, 1, 1); ctx.clip();
    if (P.lava) { // glühende Oberfläche mit treibenden Krusten
      const pulse = 0.82 + 0.18 * Math.sin(t * 1.7 + f.seed * 9);
      const gr = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.rx);
      gr.addColorStop(0, '#fff07a'); gr.addColorStop(0.35, '#ffb43a'); gr.addColorStop(0.75, '#ff6a1a'); gr.addColorStop(1, '#b0280a');
      ctx.globalAlpha = pulse; ctx.fillStyle = gr; ctx.fillRect(f.x - f.rx, f.y - f.ry, f.rx * 2, f.ry * 2); ctx.globalAlpha = 1;
      for (const pl of o.plates) {
        const a = pl.a0 + t * pl.sp, px = f.x + Math.cos(a) * pl.rr * f.rx, py = f.y + Math.sin(a) * pl.rr * f.ry, sz = pl.sz * f.rx;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) { const b = (k / 6) * TAU + a * 0.5, q = sz * pl.pts[k]; const xx = px + Math.cos(b) * q, yy = py + Math.sin(b) * q * 0.62; if (k) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
        ctx.closePath(); ctx.fillStyle = '#3a1a10'; ctx.fill(); ctx.strokeStyle = '#ff9a3a'; ctx.lineWidth = 1.6; ctx.stroke();
      }
    } else if (P.ice) { // Lichtreflex wandert über das Eis
      const ph = frac(t / 6 + f.seed * 3);
      if (ph < 0.5) {
        const bx = f.x - f.rx * 1.4 + ph * 2 * f.rx * 2.8;
        const gr = ctx.createLinearGradient(bx - 30, 0, bx + 30, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(bx - 30, f.y + f.ry); ctx.lineTo(bx + 10, f.y + f.ry); ctx.lineTo(bx + 50, f.y - f.ry); ctx.lineTo(bx + 10, f.y - f.ry); ctx.closePath(); ctx.fill();
      }
    }
    if (!P.lava && !P.ice && !P.bog) { // Wellenringe
      ctx.strokeStyle = P.ripple; ctx.lineWidth = 1.3;
      for (let i = 0; i < 3; i++) {
        const per = 3 + i * 0.7, z = t / per + i * 0.37 + f.seed * 5, ph = frac(z), cyc = Math.floor(z);
        const u = (hash(cyc, i + f.seed * 13) - 0.5) * 1.1, v = (hash(i + 5, cyc + f.seed * 3) - 0.5) * 1.1, rr = 3 + ph * 20;
        ctx.globalAlpha = (1 - ph) * 0.55; ctx.beginPath(); ctx.ellipse(f.x + u * f.rx, f.y + v * f.ry, rr, rr * 0.5, 0, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (P.moon) { // Spiegelung des Mondes
      const pa = 0.5 + 0.15 * Math.sin(t * 0.8 + f.seed * 5), mx = f.x + f.rx * 0.18, my = f.y - f.ry * 0.12;
      const gr = ctx.createRadialGradient(mx, my, 0, mx, my, f.ry * 0.7);
      gr.addColorStop(0, `rgba(235,255,255,${pa})`); gr.addColorStop(1, 'rgba(235,255,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(mx - f.ry, my - f.ry, f.ry * 2, f.ry * 2);
      ctx.fillStyle = `rgba(255,255,255,${pa + 0.3})`; ctx.beginPath(); ctx.ellipse(mx, my, f.ry * 0.2, f.ry * 0.11, 0, 0, TAU); ctx.fill();
    }
    if (P.bog || P.lava) { // Blasen steigen auf und platzen
      o.bubbles.forEach((b, i) => {
        const z = t / b.per + b.off, ph = frac(z), cyc = Math.floor(z);
        const u = (hash(cyc, i + f.seed * 9) - 0.5) * 1.1, v = (hash(i + 2, cyc + f.seed * 4) - 0.5) * 1.1;
        const x = f.x + u * f.rx, y = f.y + v * f.ry;
        if (ph < 0.8) circ(x, y, 1.5 + ph * (P.lava ? 6 : 4.5), P.lava ? '#ffe070' : 'rgba(150,170,100,0.85)', 1.2);
        else {
          const k = (ph - 0.8) / 0.2;
          ctx.globalAlpha = 1 - k; ctx.strokeStyle = P.lava ? '#ffd04a' : 'rgba(170,190,120,0.9)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(x, y, 6 + k * 10, 3 + k * 5, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
          if (o.last[i] !== cyc) { o.last[i] = cyc; if (P.lava) { burst(x, y, 4); sound('blubb', x, y, 0.32); } else if (i === 0) sound('blubb', x, y, 0.22); }
        }
      });
    }
    if (!lo && !P.lava) { // Funkeln
      for (let i = 0; i < 5; i++) {
        const a = Math.sin(t * 2.2 + i * 2.1 + f.seed * 20);
        if (a < 0.35) continue;
        ctx.globalAlpha = Math.min(1, (a - 0.35) * 1.6);
        star(f.x + (hash(i, f.seed * 31) - 0.5) * 1.3 * f.rx, f.y + (hash(i + 7, f.seed * 17) - 0.5) * 1.3 * f.ry, 2 + a * 2.5);
      }
      ctx.globalAlpha = 1;
    }
    if (P.pads) for (const pd of o.pads) { // Seerosen
      const x = f.x + pd.u * f.rx, y = f.y + pd.v * f.ry + Math.sin(t * 0.9 + pd.ph) * 0.8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.ellipse(x, y, pd.r, pd.r * 0.72, 0, pd.a + 0.35, pd.a + TAU - 0.35); ctx.closePath();
      ctx.fillStyle = '#4a8a3a'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#1e3a14'; ctx.stroke();
      if (pd.fl) { circ(x + 1.5, y - 1.5, 3, '#f4a0c8', 1.1); circ(x + 1.5, y - 1.5, 1.1, '#ffe066'); }
    }
    if (P.bog) for (const st of o.stumps) { // tote Stümpfe im Moor
      const x = f.x + st.u * f.rx, y = f.y + st.v * f.ry;
      ctx.strokeStyle = 'rgba(160,180,120,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 9 + Math.sin(t * 1.3 + st.h) * 1.5, 4, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 3, y - st.h); ctx.lineTo(x - 1, y - st.h + 3); ctx.lineTo(x + 1, y - st.h - 2); ctx.lineTo(x + 4, y); ctx.closePath();
      ctx.fillStyle = '#2e2620'; ctx.fill(); outline(1.6);
    }
    if (P.ducks) for (let i = 0; i < 2; i++) { // Enten ziehen ihre Kreise
      const dir = i ? -1 : 1, a = t * 0.12 * dir + i * 2.6 + f.seed * 6;
      const x = f.x + Math.cos(a) * f.rx * 0.48, y = f.y + Math.sin(a) * f.ry * 0.48;
      const ang = Math.atan2(Math.cos(a) * f.ry * dir, -Math.sin(a) * f.rx * dir);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(-16, -8); ctx.moveTo(-6, 3); ctx.lineTo(-16, 8); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 4.5, 0, 0, TAU); ctx.fillStyle = i ? '#8a6a4a' : '#f4f0e8'; ctx.fill(); outline(1.4);
      circ(5, 0, 3, i ? '#2f6a3a' : '#f4f0e8', 1.2);
      ctx.fillStyle = '#f0a020'; ctx.beginPath(); ctx.moveTo(7.6, -1.2); ctx.lineTo(10.6, 0); ctx.lineTo(7.6, 1.2); ctx.fill();
      ctx.restore();
    }
    if (P.fish) { // ein Fisch springt
      const z = t / 7 + f.seed * 3, ph = frac(z), cyc = Math.floor(z);
      if (ph < 0.1) {
        const k = ph / 0.1, u = (hash(cyc, f.seed * 21) - 0.5) * 0.9, v = (hash(cyc + 3, f.seed * 11) - 0.5) * 0.7;
        const x0 = f.x + u * f.rx, y0 = f.y + v * f.ry, x = x0 + k * 26, y = y0 - Math.sin(k * Math.PI) * 16;
        if (o.last.fish !== cyc) { o.last.fish = cyc; sound('platsch', x0, y0, 0.35); }
        ctx.strokeStyle = 'rgba(230,250,255,0.8)'; ctx.lineWidth = 1.3;
        if (k < 0.35) { ctx.beginPath(); ctx.ellipse(x0, y0, 4 + k * 20, 2 + k * 10, 0, 0, TAU); ctx.stroke(); }
        if (k > 0.75) { const q = (k - 0.75) * 4; ctx.beginPath(); ctx.ellipse(x0 + 26, y0, 3 + q * 9, 1.5 + q * 4.5, 0, 0, TAU); ctx.stroke(); }
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(-Math.cos(k * Math.PI) * 16, 26 / Math.PI) * 0.9);
        ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.2, 0, 0, TAU); ctx.fillStyle = '#f08a3a'; ctx.fill(); outline(1.1);
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-8, -2.5); ctx.lineTo(-8, 2.5); ctx.closePath(); ctx.fill(); outline(1);
        ctx.restore();
      }
    }
    ctx.restore();
    // Uferkante
    blobPath(ctx, f, 1, 1);
    if (P.lava) { ctx.lineWidth = 4; ctx.strokeStyle = '#140a08'; ctx.stroke(); blobPath(ctx, f, 0.97, 0.955); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,150,50,0.75)'; ctx.stroke(); }
    else {
      ctx.lineWidth = 2.4; ctx.strokeStyle = P.ice ? '#5a7e98' : INK; ctx.stroke();
      blobPath(ctx, f, 0.94, 0.92); ctx.lineWidth = 1.5; ctx.strokeStyle = P.ice ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.22)'; ctx.stroke();
    }
    if (!lo && P.reed) { // Schilf am Ufer, wiegt sich im Wind
      ctx.lineCap = 'round';
      for (const rd of o.reeds) {
        const bx = f.x + Math.cos(rd.a) * f.rx * 0.93, by = f.y + Math.sin(rd.a) * f.ry * 0.93;
        for (let j = 0; j < rd.n; j++) {
          const x = bx + (j - rd.n / 2) * 3, h = rd.h - j * 2, sw = Math.sin(t * 1.5 + rd.a * 3 + j) * 2.5;
          ctx.strokeStyle = P.reed[j % 2]; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(x, by); ctx.quadraticCurveTo(x, by - h * 0.6, x + sw, by - h); ctx.stroke();
          if (rd.cat && j === 1) { ctx.fillStyle = P.moon ? '#c8fff0' : '#5a3a1e'; ctx.beginPath(); ctx.ellipse(x + sw * 0.9, by - h * 0.85, 1.8, 4, 0, 0, TAU); ctx.fill(); }
        }
      }
      ctx.lineCap = 'butt';
    }
  }

  // =============================================================================
  // Felsen, Formationen, Urbäume, Steinkreise, Ruinen, Schlote
  function boulder(x, y, s, pts, col, top) { // Felsbrocken als hohe Kuppel; top: Moos oder Schnee
    const n = pts.length, P = (k, sc) => { const a = Math.PI + (k / (n - 1)) * Math.PI, q = pts[k] * sc; return [x + Math.cos(a) * s * q, y + Math.sin(a) * s * 1.05 * q]; };
    ctx.beginPath();
    for (let k = 0; k < n; k++) { const [px, py] = P(k, 1); if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.quadraticCurveTo(x, y + s * 0.22, x - s * pts[0], y);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); outline(2.4);
    // Schattenseite und Lichtkante
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.moveTo(x + s * 0.1, y - s * 0.95); ctx.lineTo(...P(n - 2, 1)); ctx.lineTo(...P(n - 1, 1)); ctx.quadraticCurveTo(x + s * 0.4, y + s * 0.15, x + s * 0.15, y + s * 0.12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.17)'; ctx.beginPath(); ctx.ellipse(x - s * 0.38, y - s * 0.55, s * 0.28, s * 0.2, -0.6, 0, TAU); ctx.fill();
    if (top) { // Moospolster bzw. Schneekappe folgt der Kuppel
      ctx.beginPath();
      for (let k = 1; k < n - 1; k++) { const [px, py] = P(k, 1); if (k > 1) ctx.lineTo(px, py + 1); else ctx.moveTo(px, py + 1); }
      for (let k = n - 2; k >= 1; k--) { const [px, py] = P(k, 0.7); ctx.lineTo(px, py - s * 0.05 + Math.sin(k * 2.7) * s * 0.08); }
      ctx.closePath(); ctx.fillStyle = top; ctx.fill();
    }
  }
  function drawRocks(f, t, snowy) {
    const o = lay(f, (r) => {
      const rocks = [];
      for (let i = 0; i < 3 + Math.floor(r() * 3); i++) { const [u, v] = inside(r, 0.5); const pts = []; for (let k = 0; k < 7; k++) pts.push(0.8 + r() * 0.22); rocks.push({ u, v, s: (0.42 + r() * 0.22) * f.rx, pts, c: r() }); }
      rocks.sort((a, b) => a.v - b.v);
      const peb = []; for (let i = 0; i < 6; i++) { const a = r() * TAU; peb.push({ a, d: 0.85 + r() * 0.3, s: 2 + r() * 3 }); }
      return { rocks, peb };
    });
    shadow(f.x + 10, f.y + f.ry * 0.25, f.rx * 1.02, f.ry * 0.8, 0.22);
    for (const p of o.peb) circ(f.x + Math.cos(p.a) * f.rx * p.d, f.y + Math.sin(p.a) * f.ry * p.d, p.s, snowy ? '#8a94a0' : '#8e8c80', 1.2);
    for (const b of o.rocks) {
      const col = snowy ? (b.c < 0.5 ? '#78808c' : '#6a727e') : (b.c < 0.5 ? '#9a988c' : '#888678');
      boulder(f.x + b.u * f.rx, f.y + b.v * f.ry, b.s, b.pts, col, snowy ? '#ffffff' : '#5a8a3a');
    }
  }
  function drawMesa(f) { // Tafelberg: Gesteinsschichten zur Spitze hin schmaler, flaches Plateau
    const h = 30 + f.rx * 0.22, N = 7, strata = ['#a85a32', '#b8693a', '#9a4e2c', '#c27a44'];
    shadow(f.x + 16, f.y + 8, f.rx * 1.12, f.ry * 0.95, 0.3);
    for (let k = 0; k <= N; k++) {
      const q = k / N, sxy = 1 - 0.17 * q;
      ctx.fillStyle = k === N ? '#d0905a' : strata[k % 4];
      blobPath(ctx, f, sxy, sxy, -h * q); ctx.fill();
      if (k === 0) outline(2.6);
    }
    blobPath(ctx, f, 0.83, 0.83, -h); outline(2.6);
    // Risse in der Steilwand und etwas Bewuchs oben
    const o = lay(f, (r) => { const c = [], tufts = []; for (let i = 0; i < 4; i++) c.push(r() * 1.2 - 0.6); for (let i = 0; i < 5; i++) tufts.push(inside(r, 0.6)); return { c, tufts }; });
    ctx.strokeStyle = 'rgba(60,24,10,0.55)'; ctx.lineWidth = 1.5;
    for (const u of o.c) { const x = f.x + u * f.rx * 0.9, y0 = f.y + f.ry * Math.sqrt(1 - u * u) * 0.86; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + 3, y0 - h * 0.35); ctx.lineTo(x - 1, y0 - h * 0.7); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,230,190,0.22)'; blobPath(ctx, f, 0.5, 0.45, -h - f.ry * 0.12); ctx.fill();
    ctx.strokeStyle = '#8a7a3a'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (const [u, v] of o.tufts) { const x = f.x + u * f.rx * 0.8, y = f.y - h + v * f.ry * 0.7; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x - 4, y - 5); ctx.moveTo(x, y); ctx.lineTo(x, y - 7); ctx.moveTo(x + 3, y); ctx.lineTo(x + 4, y - 5); ctx.stroke(); }
    ctx.lineCap = 'butt';
  }
  const SPIRE = {
    felsnadeln:      { light: '#dc9a62', dark: '#9a5a32', band: 'rgba(110,50,20,0.45)', cap: '#b8743f', hMul: 1, column: 1 },
    eisspitzen:      { light: '#f2fbff', dark: '#8ec8ea', edge: '#ffffff', hMul: 1.1, sparkle: 1, line: '#4a7a9a' },
    obsidianspitzen: { light: '#5a4a6a', dark: '#16101c', edge: '#b89af0', hMul: 1.15, ember: 1 },
    kristalle:       { light: '#e8d6ff', dark: '#7a52d0', edge: '#ffffff', hMul: 0.85, glow: '#c8a8ff', sparkle: 1, line: '#4a2a8a' },
  };
  const k2col = (st, a) => (Math.sin(a * 3) > 0 ? st.light : st.dark);
  function drawSpires(f, t, st) {
    const o = lay(f, (r) => {
      const sp = [];
      for (let i = 0; i < 4 + Math.floor(r() * 4); i++) { const [u, v] = inside(r, 0.6); sp.push({ u, v, h: (0.7 + r() * 0.9) * f.rx * st.hMul, w: (0.2 + r() * 0.12) * f.rx, lean: (r() - 0.5) * 0.3 }); }
      sp.sort((a, b) => a.v - b.v);
      const rub = []; for (let i = 0; i < 8; i++) { const a = r() * TAU; rub.push({ a, d: 0.7 + r() * 0.4, s: 3 + r() * 4, rot: r() * 3 }); }
      return { sp, rub };
    });
    shadow(f.x + 12, f.y + f.ry * 0.2, f.rx * 1.05, f.ry * 0.8, 0.24);
    for (const p of o.rub) { // Geröll: kantige Brocken
      const x = f.x + Math.cos(p.a) * f.rx * p.d, y = f.y + Math.sin(p.a) * f.ry * p.d;
      ctx.beginPath(); for (let k = 0; k < 4; k++) { const b = p.rot + (k / 4) * TAU; ctx.lineTo(x + Math.cos(b) * p.s, y + Math.sin(b) * p.s * 0.6); } ctx.closePath();
      ctx.fillStyle = k2col(st, p.a); ctx.fill(); outline(1.4);
    }
    const glow = st.glow && R.fxHigh;
    for (const s of o.sp) {
      const bx = f.x + s.u * f.rx, by = f.y + s.v * f.ry, tx = bx + s.lean * s.h, ty = by - s.h, w = s.w, mx = bx + w * 0.15, my = by + w * 0.25;
      if (st.column) { // Säule mit Deckstein (Hoodoo): fast parallele Flanken, Gesteinsbänder, breiter Hut
        const tw = w * 0.62;
        ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.quadraticCurveTo(bx - w * 0.55 + (tx - bx) * 0.5, by - s.h * 0.5, tx - tw, ty + tw * 0.5); ctx.lineTo(tx, ty + tw * 0.5); ctx.lineTo(mx, my); ctx.closePath(); ctx.fillStyle = st.light; ctx.fill();
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(tx, ty + tw * 0.5); ctx.lineTo(tx + tw, ty + tw * 0.5); ctx.quadraticCurveTo(bx + w * 0.55 + (tx - bx) * 0.5, by - s.h * 0.5, bx + w, by); ctx.closePath(); ctx.fillStyle = st.dark; ctx.fill();
        ctx.strokeStyle = st.band; ctx.lineWidth = 2;
        for (let k = 1; k < 4; k++) { const q = k / 4.3, cx = bx + (tx - bx) * q, hw = w + (tw - w) * q; ctx.beginPath(); ctx.moveTo(cx - hw * 0.95, by - s.h * q); ctx.lineTo(cx + hw * 0.95, by - s.h * q + 1.5); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.quadraticCurveTo(bx - w * 0.55 + (tx - bx) * 0.5, by - s.h * 0.5, tx - tw, ty + tw * 0.5); ctx.lineTo(tx + tw, ty + tw * 0.5); ctx.quadraticCurveTo(bx + w * 0.55 + (tx - bx) * 0.5, by - s.h * 0.5, bx + w, by); ctx.lineTo(mx, my); ctx.closePath(); outline(2.2);
        ctx.beginPath(); ctx.ellipse(tx, ty + tw * 0.3, tw * 1.55, tw * 0.62, s.lean, 0, TAU); ctx.fillStyle = st.cap; ctx.fill(); outline(2);
        ctx.fillStyle = 'rgba(255,230,190,0.25)'; ctx.beginPath(); ctx.ellipse(tx - tw * 0.4, ty + tw * 0.1, tw * 0.7, tw * 0.25, s.lean, 0, TAU); ctx.fill();
        continue;
      }
      if (glow) { ctx.save(); ctx.shadowColor = st.glow; ctx.shadowBlur = 10 + 5 * Math.sin(t * 2 + s.u * 5); }
      ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.lineTo(tx, ty); ctx.lineTo(mx, my); ctx.closePath(); ctx.fillStyle = st.light; ctx.fill();
      if (glow) ctx.restore();
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(tx, ty); ctx.lineTo(bx + w, by); ctx.closePath(); ctx.fillStyle = st.dark; ctx.fill();
      if (st.band) { // Gesteinsbänder
        ctx.strokeStyle = st.band; ctx.lineWidth = 2;
        for (let k = 1; k < 4; k++) { const q = k / 4.5, lx = bx - w + (tx - bx + w) * q, rx2 = bx + w + (tx - bx - w) * q, yy = by + (ty - by) * q; ctx.beginPath(); ctx.moveTo(lx, yy); ctx.lineTo(rx2, yy + 1); ctx.stroke(); }
      }
      ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.lineTo(tx, ty); ctx.lineTo(bx + w, by); ctx.lineTo(mx, my); ctx.closePath(); outline(2.2);
      if (st.cap) { ctx.beginPath(); ctx.ellipse(tx, ty + 2, w * 0.9, w * 0.38, 0, 0, TAU); ctx.fillStyle = st.cap; ctx.fill(); outline(1.8); }
      if (st.edge) { ctx.strokeStyle = st.edge; ctx.globalAlpha = 0.75; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx - w * 0.55, by - 2); ctx.lineTo(tx - 1, ty + 3); ctx.stroke(); ctx.globalAlpha = 1; }
      if (st.ember) { const gl = 0.4 + 0.4 * Math.sin(t * 2.5 + s.u * 9); ctx.strokeStyle = `rgba(255,110,30,${gl})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(bx + w * 0.3, by - 2); ctx.lineTo(bx + w * 0.1, by - s.h * 0.3); ctx.stroke(); }
      if (st.sparkle && !R.lodSimple) { const a = Math.sin(t * 2.6 + s.u * 13 + s.v * 7); if (a > 0.55) star(tx + (bx - tx) * 0.3, ty + s.h * 0.25, (a - 0.55) * 12); }
    }
  }
  function drawUrbaum(f, t) {
    const o = lay(f, (r) => {
      const blobs2 = []; for (let i = 0; i < 9; i++) { const a = r() * TAU, d = r() * 0.55; blobs2.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.6, r: 0.45 + r() * 0.25, c: r() }); }
      blobs2.sort((a, b) => a.y - b.y);
      const orbs = []; for (let i = 0; i < 6; i++) orbs.push({ x: r() * 1.6 - 0.8, l: 8 + r() * 16, ph: r() * 6 });
      const roots = []; for (let i = 0; i < 6; i++) roots.push({ a: Math.PI * (0.05 + 0.9 * (i / 5)) + (r() - 0.5) * 0.2, l: 0.8 + r() * 0.5 });
      return { blobs: blobs2, orbs, roots };
    });
    const W = f.rx * 0.42, H = 62, Rc = f.rx * 1.25, cy = f.y - H - Rc * 0.35, sw = Math.sin(t * 0.6 + f.seed * 10) * 2;
    shadow(f.x + 22, f.y + 8, Rc * 1.25, Rc * 0.45, 0.3);
    ctx.lineCap = 'round';
    for (const [w, col] of [[9, INK], [6, '#6a5a4a']]) { // Wurzeln
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
      for (const rt of o.roots) { const ex = f.x - Math.cos(rt.a) * f.rx * rt.l, ey = f.y + Math.sin(rt.a) * f.ry * rt.l * 0.7; ctx.moveTo(f.x + (ex - f.x) * 0.15, f.y - 6); ctx.quadraticCurveTo(f.x + (ex - f.x) * 0.55, f.y - 2, ex, ey); }
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(f.x - W * 1.25, f.y); ctx.quadraticCurveTo(f.x - W * 0.7, f.y - H * 0.5, f.x - W * 0.75, f.y - H);
    ctx.lineTo(f.x + W * 0.75, f.y - H); ctx.quadraticCurveTo(f.x + W * 0.7, f.y - H * 0.5, f.x + W * 1.25, f.y); ctx.closePath();
    ctx.fillStyle = '#7a6e62'; ctx.fill(); outline(2.6);
    ctx.strokeStyle = 'rgba(40,30,24,0.45)'; ctx.lineWidth = 1.6;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(f.x + i * W * 0.3, f.y - 4); ctx.quadraticCurveTo(f.x + i * W * 0.22 + 3, f.y - H * 0.5, f.x + i * W * 0.25, f.y - H + 4); ctx.stroke(); }
    const ra = 0.45 + 0.45 * Math.sin(t * 1.4 + f.seed * 8); // leuchtende Runen
    ctx.strokeStyle = `rgba(120,255,230,${ra})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(f.x - 6, f.y - 20); ctx.lineTo(f.x - 1, f.y - 30); ctx.lineTo(f.x + 4, f.y - 20); ctx.moveTo(f.x - 1, f.y - 30); ctx.lineTo(f.x - 1, f.y - 16);
    ctx.moveTo(f.x - 5, f.y - 40); ctx.lineTo(f.x + 5, f.y - 46); ctx.moveTo(f.x - 5, f.y - 46); ctx.lineTo(f.x + 5, f.y - 40); ctx.stroke();
    for (const b of o.blobs) circ(f.x + b.x * Rc + sw * (1 + b.y), cy + b.y * Rc, b.r * Rc, b.c < 0.4 ? '#24503a' : b.c < 0.75 ? '#2f6a48' : '#3a7a54', 2.4);
    ctx.fillStyle = 'rgba(200,255,230,0.16)'; ctx.beginPath(); ctx.ellipse(f.x - Rc * 0.3 + sw, cy - Rc * 0.35, Rc * 0.35, Rc * 0.18, -0.3, 0, TAU); ctx.fill();
    for (const ob of o.orbs) { // leuchtende Früchte an Ranken
      const x = f.x + ob.x * Rc * 0.85 + sw, y0 = cy + Rc * 0.3, y = y0 + ob.l + Math.sin(t * 1.2 + ob.ph) * 2;
      ctx.strokeStyle = 'rgba(40,80,60,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y); ctx.stroke();
      const gl = 0.5 + 0.5 * Math.sin(t * 2 + ob.ph);
      ctx.globalAlpha = 0.35 * gl; circ(x, y, 7, '#a8fff0'); ctx.globalAlpha = 1; circ(x, y, 2.6, '#e8fff8', 1);
    }
  }
  function drawSteinkreis(f, t) {
    const o = lay(f, (r) => {
      const stones = [], n = 8;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU + (r() - 0.5) * 0.2; stones.push({ a, h: 24 + r() * 12, w: 11 + r() * 4, tilt: (r() - 0.5) * 0.15, c: r() }); }
      return { stones };
    });
    const stone = (s) => {
      const x = f.x + Math.cos(s.a) * f.rx * 0.8, y = f.y + Math.sin(s.a) * f.ry * 0.8;
      ctx.save(); ctx.translate(x, y); ctx.rotate(s.tilt);
      shadow(5, 2, s.w * 0.9, s.w * 0.35, 0.25);
      ctx.beginPath(); ctx.moveTo(-s.w / 2, 0); ctx.lineTo(-s.w / 2, -s.h + s.w / 2); ctx.arc(0, -s.h + s.w / 2, s.w / 2, Math.PI, 0); ctx.lineTo(s.w / 2, 0); ctx.closePath();
      ctx.fillStyle = s.c < 0.5 ? '#9a9890' : '#8a8880'; ctx.fill(); outline(2.2);
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-s.w / 2 + 2, -s.h + s.w / 2, s.w * 0.25, s.h - s.w / 2 - 3);
      ctx.fillStyle = '#5a8a3a'; ctx.beginPath(); ctx.ellipse(0, -s.h + s.w * 0.45, s.w * 0.42, s.w * 0.22, 0, Math.PI, TAU); ctx.fill();
      ctx.restore();
    };
    for (const s of o.stones) if (Math.sin(s.a) < 0) stone(s);
    // Altarstein mit Runenring
    ctx.beginPath(); ctx.ellipse(f.x, f.y, f.rx * 0.28, f.ry * 0.28, 0, 0, TAU); ctx.fillStyle = '#8e8c86'; ctx.fill(); outline(2.2);
    const gl = 0.4 + 0.4 * Math.sin(t * 1.3 + f.seed * 6);
    ctx.strokeStyle = `rgba(255,220,120,${gl})`; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + t * 0.2; ctx.beginPath(); ctx.ellipse(f.x, f.y, f.rx * 0.2, f.ry * 0.2, 0, a, a + 0.6); ctx.stroke(); }
    for (const s of o.stones) if (Math.sin(s.a) >= 0) stone(s);
  }
  function drawRuine(f, t) {
    const o = lay(f, (r) => {
      const tiles = []; for (let i = 0; i < 8; i++) { const [u, v] = inside(r, 0.75); tiles.push({ u, v, w: 10 + r() * 10, rot: (r() - 0.5) * 0.6 }); }
      const cols = []; for (let i = 0; i < 3; i++) { const [u, v] = inside(r, 0.55); cols.push({ u, v, h: 16 + r() * 34, k: r() }); }
      cols.sort((a, b) => a.v - b.v);
      return { tiles, cols, fall: { u: r() * 0.6 - 0.3, v: 0.35 + r() * 0.2, rot: (r() - 0.5) * 0.8 }, wall: { u: (r() - 0.5) * 0.5, v: -0.4 } };
    });
    for (const tl of o.tiles) { // zerbrochene Bodenplatten
      ctx.save(); ctx.translate(f.x + tl.u * f.rx, f.y + tl.v * f.ry); ctx.rotate(tl.rot);
      ctx.fillStyle = '#6e746c'; ctx.fillRect(-tl.w / 2, -tl.w * 0.3, tl.w, tl.w * 0.6); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.strokeRect(-tl.w / 2, -tl.w * 0.3, tl.w, tl.w * 0.6);
      ctx.restore();
    }
    // Mauerstück mit Bogen
    const wx = f.x + o.wall.u * f.rx, wy = f.y + o.wall.v * f.ry;
    shadow(wx + 6, wy + 3, 26, 6, 0.25);
    ctx.beginPath(); ctx.moveTo(wx - 22, wy); ctx.lineTo(wx - 22, wy - 30); ctx.lineTo(wx - 8, wy - 34); ctx.lineTo(wx + 4, wy - 28); ctx.lineTo(wx + 22, wy - 31); ctx.lineTo(wx + 22, wy); ctx.closePath();
    ctx.fillStyle = '#7c8278'; ctx.fill(); outline(2.2);
    ctx.beginPath(); ctx.moveTo(wx - 8, wy); ctx.lineTo(wx - 8, wy - 14); ctx.arc(wx, wy - 14, 8, Math.PI, 0); ctx.lineTo(wx + 8, wy); ctx.closePath(); ctx.fillStyle = '#1e221e'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wx - 22, wy - 10); ctx.lineTo(wx - 8, wy - 10); ctx.moveTo(wx + 8, wy - 18); ctx.lineTo(wx + 22, wy - 18); ctx.stroke();
    ctx.strokeStyle = '#4a7a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx + 14, wy - 30); ctx.quadraticCurveTo(wx + 18, wy - 18, wx + 13, wy - 6); ctx.stroke();
    // umgestürzte Säule
    ctx.save(); ctx.translate(f.x + o.fall.u * f.rx, f.y + o.fall.v * f.ry); ctx.rotate(o.fall.rot);
    ctx.fillStyle = '#8a8e86'; ctx.fillRect(-20, -6, 40, 12); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeRect(-20, -6, 40, 12);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-6, 6); ctx.moveTo(8, -6); ctx.lineTo(8, 6); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(20, 0, 3.5, 6, 0, 0, TAU); ctx.fillStyle = '#a2a69e'; ctx.fill(); outline(1.6);
    ctx.restore();
    for (const c of o.cols) { // stehende Säulen mit abgebrochenen Köpfen
      const x = f.x + c.u * f.rx, y = f.y + c.v * f.ry, w = 7;
      shadow(x + 6, y + 2, 10, 4, 0.25);
      ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w, y - c.h); ctx.lineTo(x - 3, y - c.h - 4); ctx.lineTo(x + 1, y - c.h + 1); ctx.lineTo(x + w, y - c.h - 3); ctx.lineTo(x + w, y); ctx.closePath();
      ctx.fillStyle = c.k < 0.5 ? '#8e928a' : '#80847c'; ctx.fill(); outline(2);
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 2.5, y - 2); ctx.lineTo(x - 2.5, y - c.h + 2); ctx.moveTo(x + 2.5, y - 2); ctx.lineTo(x + 2.5, y - c.h + 2); ctx.stroke();
      ctx.fillStyle = '#4e7a3a'; ctx.beginPath(); ctx.ellipse(x, y - c.h + 1, w * 0.9, 2.6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#3e6a2e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - w, y - c.h * 0.8); ctx.quadraticCurveTo(x + w * 1.4, y - c.h * 0.5, x - w * 0.4, y - c.h * 0.15); ctx.stroke();
    }
  }
  function drawSchlot(f, t) {
    const h = 26 + f.rx * 0.35, tr = f.rx * 0.42, tyy = f.y - h;
    shadow(f.x + 12, f.y + 4, f.rx * 1.2, f.ry * 0.7, 0.3);
    ctx.beginPath(); ctx.moveTo(f.x - f.rx, f.y); ctx.lineTo(f.x - tr, tyy); ctx.lineTo(f.x + tr, tyy); ctx.lineTo(f.x + f.rx, f.y); ctx.ellipse(f.x, f.y, f.rx, f.ry * 0.5, 0, 0, Math.PI); ctx.closePath();
    const gr = ctx.createLinearGradient(f.x - f.rx, 0, f.x + f.rx, 0); gr.addColorStop(0, '#54443c'); gr.addColorStop(1, '#1e1614');
    ctx.fillStyle = gr; ctx.fill(); outline(2.6);
    const gl = 0.55 + 0.4 * Math.sin(t * 2.2 + f.seed * 7);
    ctx.strokeStyle = `rgba(255,110,30,${gl})`; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f.x - tr * 0.4, tyy + 3); ctx.quadraticCurveTo(f.x - tr * 0.6, f.y - h * 0.5, f.x - f.rx * 0.55, f.y - 2); ctx.moveTo(f.x + tr * 0.5, tyy + 3); ctx.lineTo(f.x + f.rx * 0.35, f.y - h * 0.35); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.ellipse(f.x, tyy, tr, tr * 0.42, 0, 0, TAU); ctx.fillStyle = '#ff6a1a'; ctx.fill(); outline(2.2);
    ctx.fillStyle = `rgba(255,224,110,${gl})`; ctx.beginPath(); ctx.ellipse(f.x, tyy, tr * 0.6, tr * 0.25, 0, 0, TAU); ctx.fill();
  }
  function drawGerippe(f) { // Gerippe einer riesigen Bestie, halb im Sand
    const o = lay(f, (r) => ({ flip: r() < 0.5 ? -1 : 1, bend: (r() - 0.5) * 0.3 }));
    const dir = o.flip, bone = '#ece2c8';
    const sp = (q) => ({ x: f.x + dir * (q - 0.5) * f.rx * 1.7, y: f.y + Math.sin(q * Math.PI) * f.ry * o.bend * 2 });
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) { // Rippenbögen
      const q = 0.3 + i * 0.09, p = sp(q), hgt = f.ry * (1.05 - Math.abs(i - 2.5) * 0.12);
      for (const [w, col] of [[5, INK], [3, bone]]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + dir * 10, p.y - hgt * 1.1, p.x + dir * 4, p.y - hgt * 0.15); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + dir * 12, p.y + hgt * 0.6, p.x + dir * 6, p.y + hgt * 0.55); ctx.stroke(); }
    }
    for (let i = 0; i <= 14; i++) { const p = sp(i / 14); circ(p.x, p.y, 3.4 - Math.abs(i - 6) * 0.12, bone, 1.4); } // Wirbelsäule
    const hd = sp(1.04); // Schädel mit Hörnern
    for (const [w, col] of [[5, INK], [3, bone]]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(hd.x, hd.y - 6); ctx.quadraticCurveTo(hd.x + dir * 6, hd.y - 26, hd.x + dir * 20, hd.y - 24); ctx.stroke(); }
    ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.ellipse(hd.x + dir * 6, hd.y, 13, 8, 0, 0, TAU); ctx.fillStyle = bone; ctx.fill(); outline(2);
    circ(hd.x + dir * 9, hd.y - 2, 2.6, INK); circ(hd.x + dir * 16, hd.y + 2, 1.4, INK);
  }

  // =============================================================================
  // Begehbare Bodenflächen (lebendige Teile)
  function drawWiese(f, t) {
    const o = lay(f, (r) => { const fl = []; for (let i = 0; i < 14; i++) { const [u, v] = inside(r, 0.85); fl.push({ u, v, h: 10 + r() * 9, c: Math.floor(r() * 4) }); } return { fl }; });
    if (R.lodSimple) return;
    const cols = ['#f4e36a', '#ffffff', '#e86a8a', '#b088ff'];
    for (const p of o.fl) {
      const x = f.x + p.u * f.rx, y = f.y + p.v * f.ry, sw = Math.sin(t * 1.9 + p.u * 7) * 2.2;
      ctx.strokeStyle = '#3f7a2a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x, y - p.h * 0.6, x + sw, y - p.h); ctx.stroke();
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; circ(x + sw + Math.cos(a) * 2.4, y - p.h + Math.sin(a) * 2.4, 1.9, cols[p.c]); }
      circ(x + sw, y - p.h, 1.4, '#ffb030');
    }
  }
  function drawPilzring(f, t) {
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + f.seed * 3, x = f.x + Math.cos(a) * f.rx * 0.8, y = f.y + Math.sin(a) * f.ry * 0.8;
      const gl = 0.5 + 0.5 * Math.sin(t * 2.2 - i * 0.7), col = i % 2 ? '#8af0ff' : '#d0a0ff', s = 0.9 + hash(i, f.seed * 9) * 0.5;
      ctx.globalAlpha = 0.35 * gl; circ(x, y - 5 * s, 10 * s, col); ctx.globalAlpha = 1;
      ctx.fillStyle = '#efe8dc'; ctx.fillRect(x - 1.2 * s, y - 6 * s, 2.4 * s, 6 * s);
      ctx.beginPath(); ctx.ellipse(x, y - 6 * s, 4.5 * s, 3 * s, 0, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); outline(1.3);
      circ(x - 1.3 * s, y - 7.5 * s, 0.9 * s, `rgba(255,255,255,${0.5 + 0.5 * gl})`);
    }
  }
  function drawKnochenfeld(f) {
    const o = lay(f, (r) => { const b = []; for (let i = 0; i < 12; i++) { const [u, v] = inside(r, 0.85); b.push({ u, v, k: Math.floor(r() * 3), rot: r() * TAU, s: 0.8 + r() * 0.5 }); } return { b }; });
    if (R.lodSimple) return;
    for (const b of o.b) {
      const x = f.x + b.u * f.rx, y = f.y + b.v * f.ry, s = b.s;
      if (b.k === 0) { // Schädel
        circ(x, y - 4 * s, 5 * s, '#e0d8c4', 1.5); ctx.fillStyle = '#e0d8c4'; ctx.fillRect(x - 3 * s, y - 1 * s, 6 * s, 3 * s);
        circ(x - 2 * s, y - 4.5 * s, 1.3 * s, INK); circ(x + 2 * s, y - 4.5 * s, 1.3 * s, INK);
      } else if (b.k === 1) { // Knochen
        ctx.save(); ctx.translate(x, y); ctx.rotate(b.rot);
        ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(-7 * s, 0); ctx.lineTo(7 * s, 0); ctx.stroke();
        ctx.strokeStyle = '#e0d8c4'; ctx.lineWidth = 2.4 * s; ctx.stroke(); ctx.lineCap = 'butt';
        ctx.restore();
      } else { // Rippen
        ctx.strokeStyle = '#e0d8c4'; ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + k * 4 * s, y, 5 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      }
    }
  }
  function crackPts(f) {
    return lay(f, (r) => {
      const main = []; let v = (r() - 0.5) * 0.6;
      for (let i = 0; i <= 10; i++) { v = Math.max(-0.8, Math.min(0.8, v + (r() - 0.5) * 0.6)); main.push([-0.95 + i * 0.19, v]); }
      const br = []; for (let b = 0; b < 2; b++) { const i0 = 2 + Math.floor(r() * 6), pts = [main[i0]]; let [u, w] = main[i0]; for (let k = 0; k < 3; k++) { u += 0.1 + r() * 0.1; w += (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.2); pts.push([u, Math.max(-1, Math.min(1, w))]); } br.push(pts); }
      return { lines: [main, ...br] };
    });
  }
  function strokeCracks(c, f, lines) {
    c.beginPath();
    for (const ln of lines) ln.forEach(([u, v], i) => { const x = f.x + u * f.rx, y = f.y + v * f.ry; if (i) c.lineTo(x, y); else c.moveTo(x, y); });
    c.stroke();
  }
  function drawSpalte(f, t) {
    const o = crackPts(f), gl = 0.55 + 0.35 * Math.sin(t * 2 + f.seed * 6);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(255,100,20,${gl * 0.5})`; ctx.lineWidth = 6; strokeCracks(ctx, f, o.lines);
    ctx.strokeStyle = `rgba(255,140,40,${gl})`; ctx.lineWidth = 2.6; strokeCracks(ctx, f, o.lines);
    ctx.strokeStyle = `rgba(255,230,120,${gl})`; ctx.lineWidth = 1; strokeCracks(ctx, f, o.lines);
    ctx.lineCap = 'butt';
  }
  function drawSchneewehe(f, t) {
    if (R.lodSimple) return;
    for (let i = 0; i < 6; i++) {
      const a = Math.sin(t * 1.8 + i * 2.3 + f.seed * 17);
      if (a < 0.5) continue;
      ctx.globalAlpha = Math.min(1, (a - 0.5) * 2);
      star(f.x + (hash(i, f.seed * 13) - 0.5) * 1.5 * f.rx, f.y + (hash(i + 4, f.seed * 5) - 0.5) * 1.4 * f.ry, 2 + a * 2.5);
    }
    ctx.globalAlpha = 1;
  }

  // =============================================================================
  // Boden vorzeichnen (einmal je Partie; erscheint auch auf der Minikarte)
  function rngFor(seed) { return srand(seed); }
  L.bakeGround = function (g, S, sc) {
    const th = G.THEMES[S.theme], r = rngFor(0.4321), W = S.w, H = S.h;
    g.save(); g.setTransform(sc, 0, 0, sc, 0, 0);
    // großflächige Farbwechsel
    for (let i = 0; i < 24 + Math.round((W * H) / 450000); i++) {
      const x = r() * W, y = r() * H, rad = 160 + r() * 280, col = th.ground[1 + Math.floor(r() * 3)];
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, col); gr.addColorStop(1, rgba(col, 0));
      g.globalAlpha = 0.35; g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.globalAlpha = 1;
    // feine Details in wenigen Strichen je Farbe (schnell)
    const DET = {
      auen: [['#5a7e36', 'halm'], ['#86a85a', 'halm'], ['#6a8a3e', 'halm']],
      silberwald: [['#36603e', 'halm'], ['#5a8a62', 'halm'], ['#9ac8b0', 'punkt']],
      suempfe: [['#3a4034', 'halm'], ['#56604a', 'punkt'], ['#2e3428', 'punkt']],
      steppe: [['#c89a62', 'halm'], ['#8a6038', 'punkt'], ['#d8b07a', 'punkt']],
      frost: [['#ffffff', 'punkt'], ['#a8b8c6', 'punkt'], ['#e8eef2', 'halm']],
      asche: [['#5a4a42', 'punkt'], ['#2a1e1a', 'punkt'], ['#ff7a2a', 'glut']],
    }[S.theme] || [];
    const n = Math.round((W * H) / 900);
    for (const [col, kind] of DET) {
      g.beginPath();
      const m = kind === 'glut' ? n / 40 : n / DET.length;
      for (let i = 0; i < m; i++) {
        const x = r() * W, y = r() * H;
        if (kind === 'halm') { const h = 4 + r() * 6, l = (r() - 0.5) * 4; g.moveTo(x, y); g.lineTo(x + l, y - h); }
        else { const rad = kind === 'glut' ? 1.3 : 1 + r() * 1.6; g.moveTo(x + rad, y); g.arc(x, y, rad, 0, TAU); }
      }
      if (kind === 'halm') { g.strokeStyle = col; g.lineWidth = 1.6; g.globalAlpha = 0.5; g.stroke(); }
      else { g.fillStyle = col; g.globalAlpha = kind === 'glut' ? 0.8 : 0.45; g.fill(); }
    }
    g.globalAlpha = 1;
    g.restore();
  };
  L.bakeFeatures = function (g, S, sc) {
    if (!S.terrain) return;
    g.save(); g.setTransform(sc, 0, 0, sc, 0, 0);
    const th = G.THEMES[S.theme];
    for (const f of S.terrain) {
      const P = POOL[f.kind], r = srand(f.seed + 0.29);
      if (P) { bakePool(g, f, P); continue; }
      switch (f.kind) {
        case 'wiese':
          g.globalAlpha = 0.3; g.fillStyle = '#a8c870'; blobPath(g, f, 1, 1); g.fill(); g.globalAlpha = 0.9;
          for (const col of ['#f4e36a', '#ffffff', '#e86a8a', '#b088ff', '#ff9a4a']) {
            g.fillStyle = col; g.beginPath();
            for (let i = 0; i < (f.rx * f.ry) / 260; i++) { const [u, v] = inside(r, 0.95), x = f.x + u * f.rx, y = f.y + v * f.ry, rad = 1.6 + r() * 1.2; g.moveTo(x + rad, y); g.arc(x, y, rad, 0, TAU); }
            g.fill();
          }
          g.globalAlpha = 1; break;
        case 'pilzring':
          g.globalAlpha = 0.35; g.strokeStyle = shadeHex(th.ground[0], -0.4); g.lineWidth = 14;
          g.beginPath(); g.ellipse(f.x, f.y, f.rx * 0.8, f.ry * 0.8, 0, 0, TAU); g.stroke(); g.globalAlpha = 1; break;
        case 'knochenfeld':
          g.globalAlpha = 0.45; g.fillStyle = '#5a5444'; blobPath(g, f, 1, 1); g.fill(); g.globalAlpha = 1; break;
        case 'gerippe':
          g.globalAlpha = 0.3; g.fillStyle = '#e8c89a'; blobPath(g, f, 1.1, 1.3); g.fill(); g.globalAlpha = 1; break;
        case 'schneewehe':
          for (let i = 0; i < 6; i++) { // weiche, vom Wind lang gezogene Verwehungen
            const [u, v] = inside(r, 0.6), x = f.x + u * f.rx, y = f.y + v * f.ry, w = f.rx * (0.35 + r() * 0.35), h = f.ry * (0.25 + r() * 0.2), rot = (r() - 0.5) * 0.3;
            g.fillStyle = 'rgba(120,150,185,0.28)'; g.beginPath(); g.ellipse(x + 5, y + h * 0.45, w, h * 0.9, rot, 0, TAU); g.fill();
            const gr = g.createRadialGradient(x - w * 0.2, y - h * 0.3, 0, x, y, w);
            gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
            g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, h / w); g.translate(-x, -y);
            g.fillStyle = gr; g.beginPath(); g.arc(x, y, w, 0, TAU); g.fill(); g.restore();
          }
          break;
        case 'spalte': {
          const o = crackPts(f);
          g.lineJoin = 'round'; g.lineCap = 'round';
          g.strokeStyle = 'rgba(20,8,4,0.35)'; g.lineWidth = 22; strokeCracks(g, f, o.lines);
          g.strokeStyle = '#140806'; g.lineWidth = 9; strokeCracks(g, f, o.lines);
          g.strokeStyle = '#5a1608'; g.lineWidth = 4; strokeCracks(g, f, o.lines);
          g.lineCap = 'butt'; break;
        }
        case 'schlot': {
          const gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.rx * 1.8);
          gr.addColorStop(0, 'rgba(10,6,4,0.75)'); gr.addColorStop(1, 'rgba(10,6,4,0)');
          g.fillStyle = gr; g.fillRect(f.x - f.rx * 2, f.y - f.rx * 2, f.rx * 4, f.rx * 4); break;
        }
        case 'steinkreis':
          g.globalAlpha = 0.4; g.fillStyle = shadeHex(th.ground[0], 0.15); g.beginPath(); g.ellipse(f.x, f.y, f.rx * 0.95, f.ry * 0.95, 0, 0, TAU); g.fill();
          g.globalAlpha = 0.5; g.strokeStyle = shadeHex(th.ground[0], -0.3); g.lineWidth = 6; g.beginPath(); g.ellipse(f.x, f.y, f.rx * 0.8, f.ry * 0.8, 0, 0, TAU); g.stroke(); g.globalAlpha = 1; break;
        default: // Felsen, Spitzen, Urbaum, Ruine: Fuß aus Geröll bzw. Wurzelerde
          g.globalAlpha = 0.28; g.fillStyle = shadeHex(th.ground[0], -0.3); blobPath(g, f, 1.08, 1.12); g.fill(); g.globalAlpha = 1;
      }
    }
    g.restore();
  };
  const shadeHex = (h, a) => lib.shade(h, a);

  // =============================================================================
  // Jedes Bild: flache Merkmale am Boden, hohe Merkmale in der Tiefensortierung
  const TALL = { felsen: 1, schneefelsen: 1, tafelberg: 1, felsnadeln: 1, eisspitzen: 1, obsidianspitzen: 1, kristalle: 1, urbaum: 1, steinkreis: 1, ruine: 1, schlot: 1, gerippe: 1 };
  L.ground = function (S, inView) {
    if (!S.terrain || !S.terrain.length) return;
    ctx = lib.ctx();
    const t = S.time;
    for (const f of S.terrain) {
      if (TALL[f.kind] || !inView(f.x, f.y, f.rx + 40)) continue;
      const P = POOL[f.kind];
      if (P) drawPool(f, P, t);
      else if (f.kind === 'wiese') drawWiese(f, t);
      else if (f.kind === 'pilzring') drawPilzring(f, t);
      else if (f.kind === 'knochenfeld') drawKnochenfeld(f);
      else if (f.kind === 'spalte') drawSpalte(f, t);
      else if (f.kind === 'schneewehe') drawSchneewehe(f, t);
    }
  };
  L.items = function (S, inView, list) {
    if (!S.terrain) return;
    for (const f of S.terrain) if (TALL[f.kind] && inView(f.x, f.y - 60, f.rx + 170)) list.push({ y: f.y + f.ry * (f.kind === 'gerippe' ? 0.2 : 0.55), tf: f });
  };
  L.tall = function (f) {
    ctx = lib.ctx();
    const t = G.S.time;
    switch (f.kind) {
      case 'felsen': drawRocks(f, t, false); break;
      case 'schneefelsen': drawRocks(f, t, true); break;
      case 'tafelberg': drawMesa(f); break;
      case 'urbaum': drawUrbaum(f, t); break;
      case 'steinkreis': drawSteinkreis(f, t); break;
      case 'ruine': drawRuine(f, t); break;
      case 'schlot': drawSchlot(f, t); break;
      case 'gerippe': drawGerippe(f); break;
      default: if (SPIRE[f.kind]) drawSpires(f, t, SPIRE[f.kind]);
    }
  };

  // =============================================================================
  // Luftschicht: Teilchen und Tiere über allem, dazu Lichtschein von Lava, Kristallen und Mondseen
  const amb = { S: null, parts: [], devils: [], birdT: 4, frogT: 6 };
  function ambFor(S) {
    if (amb.S !== S) {
      amb.S = S; amb.parts = []; amb.devils = []; amb.birdT = 4; amb.frogT = 6;
      if (S.theme === 'steppe') for (let i = 0; i < 3; i++) amb.devils.push({ x: Math.random() * S.w, y: Math.random() * S.h, a: Math.random() * TAU, ph: Math.random() * 6 });
    }
    return amb;
  }
  function spawn(p) { if (amb.parts.length < 170) amb.parts.push(p); }
  function burst(x, y, n) { if (!R.fxHigh) return; for (let i = 0; i < n; i++) spawn({ k: 'glut', x, y, vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 50, life: 0.6 + Math.random() * 0.6, max: 1.2, s: 1.4 + Math.random() }); }
  const chance = (rate, dt) => Math.random() < rate * dt;
  function light(x, y, rad, rgb, a) {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = gr; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  L.air = function (S, inView, rdt) {
    ctx = lib.ctx();
    const A = ambFor(S), t = S.time, dt = S.paused || S.over ? 0 : rdt * S.speed;
    const vis = (S.terrain || []).filter((f) => inView(f.x, f.y - 40, f.rx + 120));
    // Umgebungsgeräusche: Vögel in Wald und Auen, Frösche an Teich und Moor
    A.birdT -= dt; A.frogT -= dt;
    if (A.birdT <= 0) {
      A.birdT = 5 + Math.random() * 7;
      if (S.theme === 'auen' || S.theme === 'silberwald') for (let i = 0; i < 12; i++) { const d = S.decor[Math.floor(Math.random() * S.decor.length)]; if (d && (d.k === 'eiche' || d.k === 'birke' || d.k === 'hochbaum') && inView(d.x, d.y, 0)) { sound('zwitschern', d.x, d.y, 0.3); break; } }
    }
    if (A.frogT <= 0) { A.frogT = 4 + Math.random() * 6; const m = vis.find((f) => f.kind === 'moor' || f.kind === 'teich'); if (m) sound('quaken', m.x, m.y, 0.3); }
    if (!R.fxHigh) return;
    // Teilchen erzeugen
    for (const f of vis) {
      switch (f.kind) {
        case 'lavasee': if (chance(4, dt)) { const [u, v] = [Math.random() * 1.2 - 0.6, Math.random() * 1.2 - 0.6]; spawn({ k: 'glut', x: f.x + u * f.rx, y: f.y + v * f.ry, vx: (Math.random() - 0.5) * 14, vy: -25 - Math.random() * 30, life: 1.5 + Math.random(), max: 2.5, s: 1.3 + Math.random() * 1.2 }); } break;
        case 'schlot': {
          const ty = f.y - (26 + f.rx * 0.35);
          if (chance(3, dt)) spawn({ k: 'rauch', x: f.x + (Math.random() - 0.5) * 8, y: ty, vx: 6 + Math.random() * 6, vy: -22 - Math.random() * 10, life: 3, max: 3, s: 6 + Math.random() * 4 });
          if (chance(1.5, dt)) spawn({ k: 'glut', x: f.x, y: ty, vx: (Math.random() - 0.5) * 40, vy: -50 - Math.random() * 40, life: 1, max: 1, s: 1.5 });
          const z = t / 7 + f.seed * 4, cyc = Math.floor(z), lay2 = lay(f, () => ({ last: -1 }));
          if (frac(z) < 0.04 && lay2.last !== cyc) { lay2.last = cyc; burst(f.x, ty, 14); for (let i = 0; i < 4; i++) spawn({ k: 'rauch', x: f.x, y: ty, vx: (Math.random() - 0.5) * 20, vy: -40, life: 2.5, max: 2.5, s: 9 }); sound('zischen', f.x, ty, 0.4); }
          break;
        }
        case 'spalte': if (chance(1.2, dt)) { const o = crackPts(f), ln = o.lines[0], [u, v] = ln[Math.floor(Math.random() * ln.length)]; spawn({ k: 'glut', x: f.x + u * f.rx, y: f.y + v * f.ry, vx: (Math.random() - 0.5) * 10, vy: -20 - Math.random() * 20, life: 1.2, max: 1.2, s: 1.2 }); } break;
        case 'mondsee': if (chance(3, dt)) { const u = Math.random() * 1.4 - 0.7, v = Math.random() * 1.2 - 0.6; spawn({ k: 'motte', x: f.x + u * f.rx, y: f.y + v * f.ry, vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 12, life: 2.5, max: 2.5, s: 1.6 }); } break;
        case 'kristalle': case 'pilzring': case 'steinkreis': if (chance(f.kind === 'steinkreis' ? 0.8 : 1.8, dt)) spawn({ k: 'funke', x: f.x + (Math.random() - 0.5) * f.rx * 1.6, y: f.y - Math.random() * f.rx * (f.kind === 'kristalle' ? 1.4 : 0.6), vx: 0, vy: -6, life: 0.9, max: 0.9, s: 3 + Math.random() * 2, c: f.kind === 'pilzring' ? '#a8fff0' : f.kind === 'kristalle' ? '#ffffff' : '#ffe8a0' }); break;
        case 'urbaum': if (chance(1.2, dt)) { const Rc = f.rx * 1.25; spawn({ k: 'blatt', x: f.x + (Math.random() - 0.5) * Rc * 2, y: f.y - 62 - Rc * 0.2, vx: 8, vy: 14 + Math.random() * 8, life: 4, max: 4, s: 3, rot: Math.random() * 6, c: Math.random() < 0.5 ? '#a8d8c0' : '#3a7a54', floor: f.y + 20 + Math.random() * 40 }); } break;
      }
    }
    // Teilchen bewegen und zeichnen
    for (const q of A.parts) {
      q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.k === 'glut') q.vy += 18 * dt;
      else if (q.k === 'rauch') { q.s += 9 * dt; q.vx += 3 * dt; }
      else if (q.k === 'blatt') { q.rot += 2.5 * dt; q.vx = Math.sin(t * 2 + q.rot) * 16; if (q.y > q.floor) { q.vy = 0; q.vx = 0; } }
    }
    A.parts = A.parts.filter((q) => q.life > 0);
    for (const q of A.parts) {
      if (!inView(q.x, q.y, 30)) continue;
      const k = q.life / q.max;
      switch (q.k) {
        case 'glut': ctx.globalAlpha = Math.min(1, k * 1.5) * (0.7 + 0.3 * Math.sin(t * 20 + q.x)); circ(q.x, q.y, q.s, k > 0.5 ? '#ffd04a' : '#ff7a2a'); break;
        case 'rauch': ctx.globalAlpha = 0.32 * k; circ(q.x, q.y, q.s, '#4a4440'); break;
        case 'motte': ctx.globalAlpha = Math.sin(k * Math.PI) * 0.9; circ(q.x, q.y, q.s, '#c8fff8'); break;
        case 'funke': ctx.globalAlpha = Math.sin(k * Math.PI); star(q.x, q.y, q.s * Math.sin(k * Math.PI), q.c); break;
        case 'blatt': ctx.globalAlpha = Math.min(1, k * 3); ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(q.rot * 2))); ctx.beginPath(); ctx.ellipse(0, 0, q.s, q.s * 0.5, 0, 0, TAU); ctx.fillStyle = q.c; ctx.fill(); ctx.restore(); break;
      }
    }
    ctx.globalAlpha = 1;
    // Tiere und Geister
    for (const f of vis) {
      if (f.kind === 'wiese') for (let i = 0; i < 3; i++) { // Schmetterlinge
        const x = f.x + Math.sin(t * 0.37 + i * 2.3 + f.seed * 5) * f.rx * 0.7 + Math.sin(t * 1.9 + i) * 8;
        const y = f.y + Math.cos(t * 0.29 + i * 1.7 + f.seed * 3) * f.ry * 0.7 - 16 + Math.sin(t * 3.1 + i) * 5;
        const w = Math.abs(Math.sin(t * 15 + i * 2)), col = ['#ffd84a', '#ffffff', '#7ab0ff'][i];
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(x - 3 * w, y - 1, 3.5 * w + 0.5, 2.6, -0.3, 0, TAU); ctx.ellipse(x + 3 * w, y - 1, 3.5 * w + 0.5, 2.6, 0.3, 0, TAU); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 2); ctx.stroke();
      }
      if (f.kind === 'moor') {
        for (let i = 0; i < 3; i++) { // Nebelschwaden
          const x = f.x + Math.sin(t * 0.11 + i * 2.1 + f.seed * 4) * f.rx * 0.5, y = f.y + Math.cos(t * 0.09 + i * 1.3) * f.ry * 0.4, rad = f.rx * (0.55 + i * 0.12);
          light(x, y, rad, '150,190,140', 0.13);
        }
        for (let i = 0; i < 3; i++) { // Irrlichter
          const dir = i % 2 ? -1 : 1, a = t * (0.22 + i * 0.07) * dir + i * 2.1 + f.seed * 6, rad = (0.75 + 0.3 * Math.sin(t * 0.5 + i)) * f.rx;
          const x = f.x + Math.cos(a) * rad, y = f.y + Math.sin(a) * rad * 0.7 - 20 + Math.sin(t * 2 + i) * 4;
          const fl = 0.6 + 0.4 * Math.sin(t * 7 + i * 3);
          light(x, y, 15, '160,255,190', 0.5 * fl);
          circ(x, y, 2.5, `rgba(235,255,240,${fl})`);
        }
      }
    }
    if (A.devils.length) for (const d of A.devils) { // Staubteufel ziehen über die Steppe
      d.a += (Math.random() - 0.5) * 1.6 * dt; d.ph += dt;
      d.x += Math.cos(d.a) * 38 * dt; d.y += Math.sin(d.a) * 38 * dt;
      if (d.x < 0 || d.y < 0 || d.x > S.w || d.y > S.h) { d.x = Math.random() * S.w; d.y = Math.random() * S.h; }
      if (!inView(d.x, d.y - 40, 60)) continue;
      ctx.lineWidth = 3; ctx.strokeStyle = '#e8c89a';
      for (let k = 0; k < 6; k++) {
        const q = k / 5, w = 6 + q * 22, yy = d.y - q * 70, sw = Math.sin(t * 3 + q * 4 + d.ph) * 5 * q, rot = t * 7 + k;
        ctx.globalAlpha = 0.22 + 0.12 * (1 - q); ctx.beginPath(); ctx.ellipse(d.x + sw, yy, w, w * 0.3, 0, rot % TAU, (rot % TAU) + 4.2); ctx.stroke();
      }
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#c8a070';
      for (let k = 0; k < 6; k++) { const a = t * 5 + k * 1.05, rr = 10 + (k % 3) * 6; ctx.beginPath(); ctx.arc(d.x + Math.cos(a) * rr, d.y - 8 - k * 9 + Math.sin(a) * rr * 0.3, 1.3, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // Lichtschein (aufhellend)
    ctx.globalCompositeOperation = 'lighter';
    for (const f of vis) {
      const p = 0.75 + 0.25 * Math.sin(t * 1.7 + f.seed * 9);
      if (f.kind === 'lavasee') light(f.x, f.y, f.rx * 1.6, '255,110,30', 0.3 * p);
      else if (f.kind === 'schlot') light(f.x, f.y - (26 + f.rx * 0.35), 70, '255,110,30', 0.32 * p);
      else if (f.kind === 'spalte') light(f.x, f.y, f.rx * 0.9, '255,90,20', 0.16 * p);
      else if (f.kind === 'kristalle') light(f.x, f.y - f.rx * 0.5, f.rx * 1.5, '190,150,255', 0.22 * p);
      else if (f.kind === 'mondsee') light(f.x, f.y, f.rx * 1.25, '150,230,255', 0.14 * p);
      else if (f.kind === 'pilzring') light(f.x, f.y, f.rx * 1.2, '120,255,230', 0.12 * p);
    }
    ctx.globalCompositeOperation = 'source-over';
  };
})();
