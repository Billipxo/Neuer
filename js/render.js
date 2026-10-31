'use strict';
// Darstellung: Comic-Look mit kräftigen Konturen, einfacher Schattierung und Heimatkarten.
(function () {
  const R = (G.R = {});
  const T = G.TILE;
  const INK = '#1b1410';
  let canvas, ctx, dpr = 1, ground = null, groundScale = 0.5;
  R.cam = { x: 0, y: 0, z: 1 };
  R.touch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  R.mouse = { x: 0, y: 0, wx: 0, wy: 0, inside: false };

  R.init = function (c) {
    const first = !canvas;
    canvas = c;
    ctx = c.getContext('2d');
    resize();
    if (first) window.addEventListener('resize', resize);
  };
  R.ready = () => !!canvas;
  function resize() {
    dpr = Math.min(R.touch ? 1.5 : 2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
  }
  R.viewW = () => canvas.clientWidth / R.cam.z;
  R.viewH = () => canvas.clientHeight / R.cam.z;
  R.toWorld = (mx, my) => ({ x: R.cam.x + mx / R.cam.z, y: R.cam.y + my / R.cam.z });
  R.centerOn = function (x, y) {
    R.cam.x = x - R.viewW() / 2; R.cam.y = y - R.viewH() / 2; R.clampCam();
  };
  R.clampCam = function () {
    const S = G.S; if (!S) return;
    R.cam.x = G.clamp(R.cam.x, -200, S.w - R.viewW() + 200);
    R.cam.y = G.clamp(R.cam.y, -200, S.h - R.viewH() + 200);
  };

  // Deterministischer Zufall für die Bodentextur
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function shade(hex, amt) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const n = parseInt(c, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  R.shade = shade;

  // -------------------------------------------------------------------------
  // Boden vorrendern
  R.buildGround = function (S) {
    const th = G.THEMES[S.theme];
    const W = Math.ceil(S.w * groundScale), H = Math.ceil(S.h * groundScale);
    ground = document.createElement('canvas');
    ground.width = W; ground.height = H;
    const g = ground.getContext('2d');
    const rnd = rng(1234);
    g.fillStyle = th.ground[0];
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < (W * H) / 900; i++) {
      g.globalAlpha = 0.25 + rnd() * 0.25;
      g.fillStyle = th.ground[1 + Math.floor(rnd() * 3)];
      g.beginPath();
      g.ellipse(rnd() * W, rnd() * H, 8 + rnd() * 40, 6 + rnd() * 24, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    const sc = groundScale;
    R.L.bakeGround(g, S, sc); // großflächige Farbwechsel und feine Halme, Kiesel, Asche …
    // Wege zwischen Basen, Händlern und Kartenmitte (vom Spiel festgelegt; ältere Spielstände: wie früher ausgelost)
    let roads = S.roads;
    if (!roads) {
      const pts = S.players.map((p) => p.base), hub = { x: S.w / 2, y: S.h / 2 }, pairs = [];
      for (const p of pts) pairs.push([p, hub]);
      for (const s of S.shops) pairs.push([s, hub]);
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.abs(pts[i].x - pts[j].x) < 10 || Math.abs(pts[i].y - pts[j].y) < 10) pairs.push([pts[i], pts[j]]);
      roads = pairs.map(([a, b]) => ({ ax: a.x, ay: a.y, bx: b.x, by: b.y, mx: (a.x + b.x) / 2 + (rnd() - 0.5) * 200, my: (a.y + b.y) / 2 + (rnd() - 0.5) * 200 }));
    }
    g.lineCap = 'round';
    for (const r of roads) {
      for (const [w, col, al] of [[70, shade(th.road, -0.3), 0.35], [56, th.road, 0.6]]) {
        g.strokeStyle = col; g.globalAlpha = al; g.lineWidth = w * sc;
        g.beginPath(); g.moveTo(r.ax * sc, r.ay * sc); g.quadraticCurveTo(r.mx * sc, r.my * sc, r.bx * sc, r.by * sc); g.stroke();
      }
    }
    g.globalAlpha = 1;
    // Themenspezifische Details
    for (let i = 0; i < (W * H) / 5000; i++) {
      const x = rnd() * W, y = rnd() * H;
      switch (S.theme) {
        case 'auen':
          g.fillStyle = ['#f4e36a', '#ffffff', '#e86a8a', '#9ab0ff'][Math.floor(rnd() * 4)];
          g.globalAlpha = 0.8; g.beginPath(); g.arc(x, y, 1.3, 0, 7); g.fill(); break;
        case 'silberwald':
          g.fillStyle = '#a8e8d0'; g.globalAlpha = 0.25; g.beginPath(); g.arc(x, y, 2 + rnd() * 3, 0, 7); g.fill(); break;
        case 'suempfe':
          if (rnd() < 0.15) { g.fillStyle = '#2a3a3a'; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(x, y, 15 + rnd() * 25, 8 + rnd() * 12, rnd(), 0, 7); g.fill(); g.strokeStyle = '#6a8a7a'; g.globalAlpha = 0.4; g.lineWidth = 1; g.stroke(); }
          else { g.fillStyle = '#7a5a9a'; g.globalAlpha = 0.18; g.beginPath(); g.arc(x, y, 6 + rnd() * 10, 0, 7); g.fill(); }
          break;
        case 'steppe':
          g.strokeStyle = '#7a5032'; g.globalAlpha = 0.35; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y);
          g.lineTo(x + (rnd() - 0.5) * 20, y + (rnd() - 0.5) * 20); g.lineTo(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 30); g.stroke(); break;
        case 'frost':
          g.fillStyle = rnd() < 0.5 ? '#ffffff' : '#9ac8e8'; g.globalAlpha = 0.35; g.beginPath(); g.ellipse(x, y, 6 + rnd() * 18, 3 + rnd() * 8, rnd(), 0, 7); g.fill(); break;
        case 'asche':
          if (rnd() < 0.3) {
            g.strokeStyle = '#ff6a1a'; g.shadowColor = '#ff6a1a'; g.shadowBlur = 6; g.globalAlpha = 0.7; g.lineWidth = 1.2;
            g.beginPath(); g.moveTo(x, y); let cx = x, cy = y;
            for (let k = 0; k < 4; k++) { cx += (rnd() - 0.5) * 26; cy += (rnd() - 0.5) * 26; g.lineTo(cx, cy); }
            g.stroke(); g.shadowBlur = 0;
          }
          break;
      }
    }
    g.globalAlpha = 1;
    R.L.bakeFeatures(g, S, sc); // Ufer, Lavaränder, Blumenwiesen, Schneewehen, Felsfüße …
    // Basisplätze (gepflastert)
    for (const p of S.players) {
      const x = p.base.x * sc, y = p.base.y * sc, r = G.BASE_RADIUS * sc;
      g.fillStyle = shade(th.road, -0.1); g.globalAlpha = 0.5;
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.globalAlpha = 0.18; g.strokeStyle = INK; g.lineWidth = 0.6;
      for (let gx = -r; gx <= r; gx += T * sc) { g.beginPath(); g.moveTo(x + gx, y - r); g.lineTo(x + gx, y + r); g.stroke(); }
      for (let gy = -r; gy <= r; gy += T * sc) { g.beginPath(); g.moveTo(x - r, y + gy); g.lineTo(x + r, y + gy); g.stroke(); }
      g.globalAlpha = 0.8; g.strokeStyle = p.color; g.lineWidth = 2;
      g.setLineDash([6, 5]); g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.setLineDash([]);
    }
    for (const c of S.camps) {
      if (c.event) continue;
      g.globalAlpha = 0.35; g.fillStyle = shade(th.ground[0], -0.35);
      g.beginPath(); g.ellipse(c.x * sc, c.y * sc, 60 * sc, 40 * sc, 0, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
    R.groundAvg = th.ground[0];
  };

  // -------------------------------------------------------------------------
  // Dekoration
  function outline(w) { ctx.lineWidth = w || 2.5; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); }
  function circ(x, y, r, fill, lw) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); if (lw !== 0) outline(lw); }
  function shadow(x, y, rx, ry) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }

  // Pflanzen, Steine und Geländemerkmale zeichnet js/landschaft.js; hier nur die gemeinsamen Werkzeuge
  const drawDecor = (d, th) => R.L.flora(d, th);
  R.lib = { ctx: () => ctx, INK, shade, label };

  // -------------------------------------------------------------------------
  // Symbole
  function roleIcon(role, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();
    switch (role) {
      case 'tank': ctx.moveTo(-4, -4); ctx.lineTo(4, -4); ctx.lineTo(4, 0); ctx.quadraticCurveTo(4, 4, 0, 5); ctx.quadraticCurveTo(-4, 4, -4, 0); ctx.closePath(); ctx.fill(); break;
      case 'nahkampf': ctx.moveTo(-4, 4); ctx.lineTo(4, -4); ctx.moveTo(-4, -4); ctx.lineTo(4, 4); ctx.stroke(); break;
      case 'fernkampf': ctx.arc(0, 0, 4.5, -Math.PI / 2, Math.PI / 2); ctx.moveTo(0, -4.5); ctx.lineTo(0, 4.5); ctx.moveTo(-4, 0); ctx.lineTo(3, 0); ctx.stroke(); break;
      case 'magier': for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 0.4; ctx.lineTo(Math.cos(a) * 5, Math.sin(a) * 5); const b = a + Math.PI * 0.2; ctx.lineTo(Math.cos(b) * 2, Math.sin(b) * 2); } ctx.closePath(); ctx.fill(); break;
      case 'heiler': ctx.rect(-1.5, -4.5, 3, 9); ctx.rect(-4.5, -1.5, 9, 3); ctx.fill(); break;
      case 'support': ctx.moveTo(-3, 5); ctx.lineTo(-3, -5); ctx.lineTo(4, -3); ctx.lineTo(-3, -0.5); ctx.stroke(); ctx.fill(); break;
      case 'beschwoerer': for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 0.8; ctx.lineTo(Math.cos(a) * 5, Math.sin(a) * 5); } ctx.closePath(); ctx.stroke(); break;
      default: ctx.arc(0, 0, 2.5, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  R.roleIcon = roleIcon;

  function buildingIcon(type, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (type) {
      case 'haupthaus': ctx.moveTo(-9, 5); ctx.lineTo(-9, -4); ctx.lineTo(-5, 0); ctx.lineTo(0, -8); ctx.lineTo(5, 0); ctx.lineTo(9, -4); ctx.lineTo(9, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
      case 'goldmine': for (const [a, b] of [[-4, 2], [4, 2], [0, -4]]) { ctx.moveTo(a + 4, b); ctx.arc(a, b, 4, 0, 7); } ctx.fillStyle = '#ffd23a'; ctx.fill(); ctx.stroke(); break;
      case 'saegewerk': for (const [a, b] of [[-4, 3], [4, 3], [0, -4]]) { ctx.moveTo(a + 4, b); ctx.arc(a, b, 4, 0, 7); } ctx.fillStyle = '#c8935a'; ctx.fill(); ctx.stroke(); break;
      case 'unterkunft': ctx.moveTo(-7, 6); ctx.lineTo(-7, -1); ctx.lineTo(0, -8); ctx.lineTo(7, -1); ctx.lineTo(7, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
      case 'kaserne': ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.moveTo(-7, 7); ctx.lineTo(7, -7); ctx.moveTo(-7, -7); ctx.lineTo(7, 7); ctx.stroke(); break;
      case 'schiessstand': ctx.arc(0, 0, 8, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fillStyle = '#c03030'; ctx.fill(); break;
      case 'sanktum': for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 0.4; ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); const b = a + Math.PI * 0.2; ctx.lineTo(Math.cos(b) * 4, Math.sin(b) * 4); } ctx.closePath(); ctx.fill(); ctx.stroke(); break;
      case 'beschwoerung': ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.arc(0, 0, 9, 0, 7); ctx.stroke(); ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 0.8; ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); } ctx.closePath(); ctx.stroke(); break;
      case 'schmiede': ctx.moveTo(-9, -3); ctx.lineTo(8, -3); ctx.lineTo(5, 1); ctx.lineTo(2, 1); ctx.lineTo(4, 6); ctx.lineTo(-4, 6); ctx.lineTo(-2, 1); ctx.lineTo(-6, 1); ctx.closePath(); ctx.fillStyle = '#3a3a3e'; ctx.fill(); ctx.stroke(); break;
      default: ctx.arc(0, 0, 4, 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  R.buildingIcon = buildingIcon;

  // Farbpalette eines Spielers inkl. Skin
  R.palOf = function (p) {
    if (p._pal && p._palSkin === p.skin) return p._pal;
    const b = p.rd.palette;
    let pal = { ...b }, body = p.rd.color, glow = null;
    if (p.skin === 'veteran') { pal = { wall: shade(b.wall, -0.25), roof: shade(b.roof, -0.2), trim: '#c8d0d8' }; body = shade(body, -0.15); }
    else if (p.skin === 'elite') { pal = { wall: '#e6dfd0', roof: shade(b.roof, 0.12), trim: '#ffd23a' }; body = shade(body, 0.08); }
    else if (p.skin === 'legende') { glow = G.LEGEND_COLORS[p.race]; pal = { wall: shade(b.wall, -0.15), roof: shade(glow, -0.4), trim: glow }; }
    p._pal = { ...pal, body, glow }; p._palSkin = p.skin;
    return p._pal;
  };

  // Volksspezifisches Dach / Oberteil eines Gebäudes
  function drawRoof(race, type, x, y, hs, pal, flash, S) {
    const roof = flash ? '#fff' : pal.roof;
    const top = y - hs * 1.05, eave = y - hs * 0.3;
    ctx.beginPath();
    switch (race) {
      case 'elfen': { // Blätterkrone
        ctx.moveTo(x - hs + 2, eave); ctx.quadraticCurveTo(x, top - hs * 0.5, x + hs - 2, eave); ctx.closePath();
        ctx.fillStyle = roof; ctx.fill(); outline();
        for (const [dx, dy, r] of [[-0.45, -0.75, 0.32], [0.4, -0.8, 0.3], [0, -1.05, 0.34]]) circ(x + dx * hs, y + dy * hs, r * hs, shade(roof, dx * 0.2), 2);
        ctx.fillStyle = pal.trim; ctx.globalAlpha *= 0.8;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + Math.sin(S.time + i * 2) * hs * 0.6, y - hs * (0.7 + 0.2 * Math.cos(S.time * 1.3 + i)), 1.6, 0, 7); ctx.fill(); }
        ctx.globalAlpha /= 0.8;
        return;
      }
      case 'untote': { // Gotische Spitztürme
        ctx.moveTo(x - hs + 4, eave); ctx.lineTo(x - hs * 0.45, top - hs * 0.45); ctx.lineTo(x - hs * 0.1, eave - hs * 0.2);
        ctx.lineTo(x + hs * 0.1, eave - hs * 0.2); ctx.lineTo(x + hs * 0.45, top - hs * 0.45); ctx.lineTo(x + hs - 4, eave); ctx.closePath();
        ctx.fillStyle = roof; ctx.fill(); outline();
        ctx.save(); ctx.shadowColor = pal.trim; ctx.shadowBlur = 8; ctx.fillStyle = pal.trim;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * hs * 0.45, y - hs * 0.75, 2.5, 4.5, 0, 0, 7); ctx.fill(); }
        ctx.restore();
        return;
      }
      case 'orks': { // Fellzelt mit Hörnern
        ctx.moveTo(x - hs, eave + 2); ctx.lineTo(x, top - hs * 0.15); ctx.lineTo(x + hs, eave + 2); ctx.closePath();
        ctx.fillStyle = roof; ctx.fill(); outline();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x, top - hs * 0.1); ctx.lineTo(x + i * hs * 0.35, eave); ctx.stroke(); }
        for (const s of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(x + s * 3, top - hs * 0.05); ctx.quadraticCurveTo(x + s * hs * 0.5, top - hs * 0.5, x + s * hs * 0.3, top - hs * 0.75);
          ctx.lineTo(x + s * hs * 0.22, top - hs * 0.35); ctx.closePath(); ctx.fillStyle = '#e8dcc0'; ctx.fill(); outline(1.8);
        }
        return;
      }
      case 'zwerge': { // Flaches Steindach mit Zinnen und Esse
        ctx.rect(x - hs + 3, y - hs * 0.75, hs * 2 - 6, hs * 0.45); ctx.fillStyle = roof; ctx.fill(); outline();
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.rect(x - hs + 5 + i * (hs * 2 - 14) / 3, y - hs * 0.95, 8, hs * 0.22); ctx.fillStyle = shade(pal.wall, 0.1); ctx.fill(); outline(1.8); }
        ctx.beginPath(); ctx.rect(x + hs * 0.35, y - hs * 1.25, 9, hs * 0.55); ctx.fillStyle = shade(pal.wall, -0.2); ctx.fill(); outline(1.8);
        ctx.save(); ctx.fillStyle = '#9a9a9a';
        for (let i = 0; i < 3; i++) { const k = (S.time * 0.6 + i / 3) % 1; ctx.globalAlpha = 0.45 * (1 - k); ctx.beginPath(); ctx.arc(x + hs * 0.35 + 4 + k * 8, y - hs * 1.3 - k * 26, 3 + k * 6, 0, 7); ctx.fill(); }
        ctx.restore();
        return;
      }
      case 'daemonen': { // Gezackte Obsidianspitzen mit Glut
        ctx.moveTo(x - hs + 2, eave);
        const n = 5;
        for (let i = 0; i <= n; i++) { const px = x - hs + 2 + (i / n) * (hs * 2 - 4); ctx.lineTo(px - hs * 0.15, eave - hs * 0.3); ctx.lineTo(px, top - hs * (i % 2 ? 0.1 : 0.45)); }
        ctx.lineTo(x + hs - 2, eave); ctx.closePath();
        ctx.fillStyle = roof; ctx.fill(); outline();
        ctx.save(); ctx.shadowColor = pal.trim; ctx.shadowBlur = 10; ctx.strokeStyle = pal.trim; ctx.lineWidth = 1.5; ctx.globalAlpha *= 0.6 + 0.3 * Math.sin(S.time * 3);
        ctx.beginPath(); ctx.moveTo(x - hs * 0.4, eave); ctx.lineTo(x - hs * 0.2, y - hs * 0.7); ctx.lineTo(x + hs * 0.1, eave - 4); ctx.stroke(); ctx.restore();
        return;
      }
      default: { // Menschen: Satteldach bzw. Kuppel
        if (type === 'sanktum' || type === 'beschwoerung') { ctx.ellipse(x, eave - 1, hs * 0.85, hs * 0.75, 0, Math.PI, 0); ctx.closePath(); }
        else { ctx.moveTo(x - hs + 2, eave); ctx.lineTo(x - hs * 0.55, top); ctx.lineTo(x + hs * 0.55, top); ctx.lineTo(x + hs - 2, eave); ctx.closePath(); }
        ctx.fillStyle = roof; ctx.fill(); outline();
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(x - hs * 0.55, top + 2); ctx.lineTo(x - hs * 0.1, top + 2); ctx.lineTo(x - hs * 0.4, eave - 1); ctx.lineTo(x - hs + 8, eave - 1); ctx.closePath(); ctx.fill();
      }
    }
  }

  function drawWall(s) {
    const S = G.S, p = S.players[s.owner], pal = R.palOf(p);
    const flash = s.hitT > 0;
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.ang + Math.PI / 2);
    const col = flash ? '#fff' : s.level === 1 ? '#8a5a32' : s.level === 2 ? pal.wall : shade(pal.wall, -0.15);
    shadow(4, 8, 20, 7);
    if (s.level === 1) { // Holzpalisade: angespitzte Pfähle
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(i * 7 - 3.5, 6); ctx.lineTo(i * 7 - 3.5, -10); ctx.lineTo(i * 7, -16); ctx.lineTo(i * 7 + 3.5, -10); ctx.lineTo(i * 7 + 3.5, 6); ctx.closePath();
        ctx.fillStyle = i % 2 ? col : shade(col, 0.1); ctx.fill(); outline(1.6);
      }
    } else {
      roundRect(-18, -12, 36, 20, 2); ctx.fillStyle = col; ctx.fill(); outline(2);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(18, -2); ctx.moveTo(-6, -12); ctx.lineTo(-6, -2); ctx.moveTo(8, -2); ctx.lineTo(8, 8); ctx.stroke();
      const z = s.level === 3 ? 3 : 2;
      for (let i = 0; i < z; i++) { const w = 36 / (z * 2 - 1); roundRect(-18 + i * w * 2, -18, w, 7, 1); ctx.fillStyle = shade(col, 0.1); ctx.fill(); outline(1.5); }
      if (s.level === 3) { ctx.fillStyle = pal.trim; ctx.fillRect(-2, -10, 4, 4); }
    }
    ctx.restore();
    if (s.hp < s.maxHp) bar(s.x - 16, s.y - 26, 32, 3, s.hp / s.maxHp, hpCol(s));
  }

  function drawSite(s) {
    const x = s.x, y = s.y, S = G.S;
    shadow(x + 4, y + 10, 42, 14);
    for (const [dx, dy, r, c] of [[-22, 4, 14, '#6a6058'], [16, 8, 12, '#7a7068'], [0, -8, 16, '#5a524a'], [24, -6, 9, '#6a6058']]) {
      ctx.beginPath(); ctx.moveTo(x + dx - r, y + dy + r * 0.4); ctx.lineTo(x + dx - r * 0.6, y + dy - r * 0.7); ctx.lineTo(x + dx + r * 0.3, y + dy - r); ctx.lineTo(x + dx + r, y + dy + r * 0.4); ctx.closePath();
      ctx.fillStyle = c; ctx.fill(); outline(2);
    }
    ctx.save(); ctx.shadowColor = '#ffd23a'; ctx.shadowBlur = 8; ctx.fillStyle = '#ffd23a';
    for (const [dx, dy] of [[-18, 0], [-2, -12], [14, 4], [22, -8], [4, 2]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, 2.4, 0, 7); ctx.fill(); }
    const k = (S.time * 0.8) % 1;
    ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(x - 6 + k * 4, y - 14 - k * 10, 1.6, 0, 7); ctx.fill();
    ctx.restore();
    label('Goldader', x, y + 34, '#ffe066', 10);
  }


  // -------------------------------------------------------------------------
  // Ausbaustufen sichtbar machen: Fenster, Anbauten, Zierrat, Turmspitze
  function towerRoof(race, x, top, w, pal) {
    ctx.beginPath();
    if (race === 'elfen') ctx.ellipse(x, top, w * 0.75, w * 0.55, 0, 0, 7);
    else if (race === 'zwerge') ctx.rect(x - w * 0.6, top - 5, w * 1.2, 8);
    else if (race === 'orks') { ctx.moveTo(x - w * 0.65, top + 4); ctx.lineTo(x, top - w * 0.9); ctx.lineTo(x + w * 0.65, top + 4); ctx.closePath(); }
    else { ctx.moveTo(x - w * 0.6, top + 4); ctx.lineTo(x, top - w * (race === 'untote' || race === 'daemonen' ? 1.5 : 1.1)); ctx.lineTo(x + w * 0.6, top + 4); ctx.closePath(); }
    ctx.fillStyle = pal.roof; ctx.fill(); outline(2);
    if (race === 'orks') { ctx.beginPath(); ctx.moveTo(x - 2, top - w * 0.8); ctx.quadraticCurveTo(x + w * 0.6, top - w * 1.3, x + w * 0.5, top - w * 1.6); ctx.lineTo(x + 1, top - w * 0.95); ctx.closePath(); ctx.fillStyle = '#efe6d0'; ctx.fill(); outline(1.2); }
  }
  function drawAnnex(p, pal, ax, y, hs, L, flash) {
    const w = hs * 0.42, top = y - hs * (L >= 5 ? 1.25 : 1.05);
    ctx.fillStyle = flash ? '#fff' : shade(pal.wall, -0.08);
    roundRect(ax - w / 2, top, w, y + hs * 0.2 - top, 3); ctx.fill(); outline(2);
    ctx.fillStyle = p.race === 'untote' || p.race === 'daemonen' ? pal.trim : '#ffd27a';
    roundRect(ax - 2.5, top + 8, 5, 7, 2); ctx.fill();
    towerRoof(p.race, ax, top, w, pal);
  }
  function drawLevelDetails(b, p, pal, x, y, hs, S, flash) {
    const L = b.level;
    if (L < 2 || b.size < 2) return;
    const glow = p.race === 'untote' || p.race === 'daemonen' ? pal.trim : '#ffd27a';
    // Fenster mit warmem Licht
    ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 6; ctx.fillStyle = glow;
    for (const s2 of [-1, 1]) {
      const wx = x + s2 * hs * 0.58, wy = y + hs * 0.02;
      ctx.globalAlpha = 0.75 + 0.2 * Math.sin(S.time * 1.5 + b.id + s2);
      roundRect(wx - 3.5, wy - 5, 7, 10, 3); ctx.fill();
    }
    ctx.restore();
    for (const s2 of [-1, 1]) { const wx = x + s2 * hs * 0.58, wy = y + hs * 0.02; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; roundRect(wx - 3.5, wy - 5, 7, 10, 3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(wx, wy - 5); ctx.lineTo(wx, wy + 5); ctx.stroke(); }
    // Sockel aus Stein
    ctx.fillStyle = shade(pal.wall, -0.2);
    roundRect(x - hs + 4, y + hs * 0.72, hs * 2 - 8, hs * 0.14, 2); ctx.fill(); outline(1.5);
    if (L >= 4) { // Zierleiste an der Traufe und Feuerschalen am Eingang
      ctx.strokeStyle = pal.trim; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - hs + 6, y - hs * 0.33); ctx.lineTo(x + hs - 6, y - hs * 0.33); ctx.stroke();
      for (const s2 of [-1, 1]) {
        const fx = x + s2 * 13, fy = y + hs * 0.62;
        ctx.fillStyle = '#3a3a40'; ctx.beginPath(); ctx.moveTo(fx - 4, fy - 4); ctx.lineTo(fx + 4, fy - 4); ctx.lineTo(fx + 2, fy + 2); ctx.lineTo(fx - 2, fy + 2); ctx.closePath(); ctx.fill(); outline(1.2);
        const fl = 3 + Math.sin(S.time * 12 + b.id + s2) * 1.2;
        ctx.save(); ctx.shadowColor = '#ff8a2a'; ctx.shadowBlur = 8; ctx.fillStyle = p.race === 'untote' ? '#7aff9a' : '#ffb040';
        ctx.beginPath(); ctx.moveTo(fx - 3, fy - 4); ctx.quadraticCurveTo(fx, fy - 4 - fl * 2.4, fx + 3, fy - 4); ctx.fill(); ctx.restore();
      }
    }
    if (L >= 5) { // Turmspitze mit leuchtendem Juwel und Funkeln
      const top = y - hs * (p.race === 'zwerge' ? 1.0 : 1.1);
      ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top - 16); ctx.stroke();
      ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.shadowColor = pal.trim; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(x, top - 26); ctx.lineTo(x + 5, top - 19); ctx.lineTo(x, top - 13); ctx.lineTo(x - 5, top - 19); ctx.closePath();
      ctx.fillStyle = pal.trim; ctx.fill(); ctx.restore(); ctx.beginPath(); ctx.moveTo(x, top - 26); ctx.lineTo(x + 5, top - 19); ctx.lineTo(x, top - 13); ctx.lineTo(x - 5, top - 19); ctx.closePath(); outline(1.4);
      const k = (S.time * 0.7 + b.id * 0.13) % 1;
      ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = '#fff6c0';
      ctx.beginPath(); ctx.arc(x + Math.sin(b.id + S.time) * hs * 0.6, y - hs * 0.4 - k * 30, 1.6, 0, 7); ctx.fill(); ctx.restore();
    }
  }

  // Banner in Spielerfarbe (Form je nach freigeschaltetem Banner)
  function drawBanner(p, pal, fx, fy, ph) {
    const w = Math.sin(ph) * 1.5;
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy + 16); ctx.lineTo(fx, fy - 8); ctx.stroke();
    ctx.beginPath();
    if (p.banner === 'wimpel') {
      ctx.moveTo(fx, fy - 8); ctx.lineTo(fx + 15, fy - 6 + w); ctx.lineTo(fx + 9, fy - 2 + w); ctx.lineTo(fx + 15, fy + 2 + w); ctx.lineTo(fx, fy + 3);
    } else if (p.banner === 'standarte') {
      ctx.moveTo(fx - 1, fy - 8); ctx.lineTo(fx + 11, fy - 8 + w * 0.5); ctx.lineTo(fx + 11, fy + 6 + w); ctx.lineTo(fx + 5, fy + 3 + w); ctx.lineTo(fx - 1, fy + 6);
    } else { ctx.moveTo(fx, fy - 6); ctx.lineTo(fx + 12, fy - 2 + w); ctx.lineTo(fx, fy + 3); }
    ctx.closePath(); ctx.fillStyle = p.color; ctx.fill(); outline(1.5);
    if (p.banner === 'standarte') { circ(fx + 5, fy - 1 + w * 0.5, 2.5, pal.trim, 1); circ(fx, fy - 10, 2.2, '#ffd23a', 1); }
  }

  // -------------------------------------------------------------------------
  // Gebäude
  R._drawBuilding = (b) => drawBuilding(b); // für Vorschau und Tests
  function drawBuilding(b) {
    if (b.type === 'mauer') return drawWall(b);
    const S = G.S, p = S.players[b.owner], pal = R.palOf(p);
    const hs = b.size * T / 2, x = b.x, y = b.y;
    const constructing = b.level === 0;
    if (b.site) drawSite(b.site);
    ctx.save();
    if (constructing) ctx.globalAlpha = 0.55 + 0.4 * (b.upgrading ? b.upgrading.t / b.upgrading.total : 0);
    const L = b.level;
    shadow(x + 6, y + hs * 0.55, hs * (1.0 + L * 0.03), hs * 0.5);
    const grow = 0.94 + Math.max(1, L) * 0.025; // Stufe 1: 0,965 … Stufe 5: 1,065
    ctx.translate(x, y + hs * 0.6); ctx.scale(grow, grow); ctx.translate(-x, -(y + hs * 0.6));
    const flash = b.hitT > 0;
    if (b.type === 'turm' || b.type === 'kanone') {
      const r = hs * 0.95;
      if (L >= 2) { ctx.fillStyle = shade(pal.wall, -0.4); ctx.beginPath(); ctx.ellipse(x, y + 8, r * 1.12, r * 0.85, 0, 0, 7); ctx.fill(); outline(2); }
      ctx.fillStyle = shade(pal.wall, -0.25); ctx.beginPath(); ctx.ellipse(x, y + 4, r, r * 0.8, 0, 0, 7); ctx.fill(); outline();
      ctx.fillStyle = flash ? '#fff' : pal.wall; ctx.beginPath(); ctx.ellipse(x, y - 8, r * 0.9, r * 0.72, 0, 0, 7); ctx.fill(); outline();
      const teeth = L >= 3 ? 8 : 6;
      for (let i = 0; i < teeth; i++) { const a = (i / teeth) * Math.PI * 2; ctx.fillStyle = shade(pal.wall, 0.15); ctx.fillRect(x + Math.cos(a) * r * 0.7 - 2.5, y - 8 + Math.sin(a) * r * 0.55 - 2.5, 5, 5); }
      if (L >= 4) { ctx.strokeStyle = pal.trim; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 8, r * 0.9, r * 0.72, 0, 0.2, Math.PI - 0.2); ctx.stroke(); }
      if (L >= 5) { ctx.save(); ctx.shadowColor = pal.trim; ctx.shadowBlur = 12; circ(x + r * 0.55, y - 2, 2.5, pal.trim, 0); circ(x - r * 0.55, y - 2, 2.5, pal.trim, 0); ctx.restore(); }
      if (b.type === 'kanone') {
        const ang = b.lastAng !== undefined ? b.lastAng : -Math.PI / 4;
        ctx.save(); ctx.translate(x, y - 10); ctx.rotate(ang); ctx.fillStyle = '#2a2a2e'; ctx.fillRect(0, -3.5, 14, 7); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(0, -3.5, 14, 7); ctx.restore();
        circ(x, y - 10, 6, '#3a3a40', 2);
      } else {
        ctx.beginPath();
        if (p.race === 'elfen') { ctx.ellipse(x, y - 22, r * 0.7, r * 0.55, 0, 0, 7); }
        else if (p.race === 'zwerge') { ctx.rect(x - r * 0.6, y - 24, r * 1.2, 10); }
        else { ctx.moveTo(x - r * 0.6, y - 14); ctx.lineTo(x, y - (p.race === 'untote' || p.race === 'daemonen' ? 38 : 30)); ctx.lineTo(x + r * 0.6, y - 14); ctx.closePath(); }
        ctx.fillStyle = pal.roof; ctx.fill(); outline();
        if (p.race === 'daemonen' || p.race === 'untote') { ctx.save(); ctx.shadowColor = pal.trim; ctx.shadowBlur = 10; circ(x, y - 22, 3, pal.trim, 0); ctx.restore(); }
      }
    } else {
      if (L >= 3 && b.size >= 2) {
        drawAnnex(p, pal, x - hs * 0.78, y - hs * 0.15, hs, L, flash);
        if (b.type === 'haupthaus' || L >= 5) drawAnnex(p, pal, x + hs * 0.78, y - hs * 0.15, hs, L, flash);
      }
      ctx.fillStyle = shade(pal.wall, -0.35);
      roundRect(x - hs + 2, y - hs + 6, hs * 2 - 4, hs * 2 - 6, 6); ctx.fill(); outline();
      ctx.fillStyle = flash ? '#fff' : pal.wall;
      roundRect(x - hs + 6, y - hs * 0.35, hs * 2 - 12, hs * 1.15, 4); ctx.fill(); outline();
      if (p.race === 'zwerge' || p.race === 'menschen') { // Mauerwerk
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
        for (let r = 0; r < 3; r++) { const yy = y - hs * 0.35 + (r + 1) * hs * 0.3; ctx.beginPath(); ctx.moveTo(x - hs + 7, yy); ctx.lineTo(x + hs - 7, yy); ctx.stroke(); }
      }
      drawRoof(p.race, b.type, x, y, hs, pal, flash, S);
      drawLevelDetails(b, p, pal, x, y, hs, S, flash);
      ctx.fillStyle = INK; roundRect(x - 6, y + hs * 0.35, 12, hs * 0.45, 5); ctx.fill();
      if (p.race === 'untote' || p.race === 'daemonen') { ctx.save(); ctx.globalAlpha *= 0.5 + 0.3 * Math.sin(S.time * 2 + b.id); ctx.fillStyle = pal.trim; roundRect(x - 4, y + hs * 0.42, 8, hs * 0.35, 4); ctx.fill(); ctx.restore(); }
      buildingIcon(b.type, x, y + hs * 0.05, b.size === 3 ? 1.5 : 1.05, pal.trim);
      if (b.type === 'beschwoerung' && !constructing) {
        ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * Math.sin(S.time * 3); ctx.strokeStyle = '#c070ff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(x, y + hs * 0.6, hs * 0.9, hs * 0.35, 0, 0, 7); ctx.stroke(); ctx.restore();
      }
      if (b.type === 'schmiede' && !constructing) {
        ctx.save(); ctx.fillStyle = '#888';
        const t = S.time * 0.8;
        for (let i = 0; i < 3; i++) { const k = (t + i / 3) % 1; ctx.beginPath(); ctx.arc(x + hs * 0.5 + k * 10, y - hs * 1.1 - k * 30, 4 + k * 6, 0, 7); ctx.globalAlpha = 0.5 * (1 - k); ctx.fill(); }
        ctx.restore();
      }
    }
    drawBanner(p, pal, x + hs - 8, y - hs * (b.size === 1 ? 1.4 : 1.0), S.time * 4 + b.id);
    ctx.restore();

    if (constructing) {
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * hs * 0.7, y + hs * 0.8); ctx.lineTo(x + i * hs * 0.7, y - hs); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x - hs * 0.8, y); ctx.lineTo(x + hs * 0.8, y); ctx.moveTo(x - hs * 0.8, y - hs * 0.6); ctx.lineTo(x + hs * 0.8, y - hs * 0.6); ctx.stroke();
    }
    if (b.level > 0 && b.hp < b.maxHp * 0.6) { // Schaden: Rauch und ab 35 % Flammen
      const dmg = 1 - b.hp / b.maxHp, n = b.size >= 2 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const sx = x + (i - (n - 1) / 2) * hs * 0.6, sy = y - hs * 0.7;
        if (b.hp < b.maxHp * 0.35) {
          const fl = 0.7 + 0.3 * Math.sin(S.time * 14 + i * 2 + b.id);
          ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(sx - 5, sy + 4); ctx.quadraticCurveTo(sx - 2, sy - 10 * fl, sx, sy - 14 * fl); ctx.quadraticCurveTo(sx + 2, sy - 10 * fl, sx + 5, sy + 4); ctx.fill();
          ctx.fillStyle = '#ffd25a'; ctx.beginPath(); ctx.moveTo(sx - 2.5, sy + 3); ctx.quadraticCurveTo(sx, sy - 7 * fl, sx + 2.5, sy + 3); ctx.fill();
        }
        if (R.fxHigh) for (let j = 0; j < 3; j++) {
          const kk = (S.time * 0.5 + j / 3 + i * 0.37 + b.id * 0.11) % 1;
          ctx.globalAlpha = (0.35 + dmg * 0.3) * (1 - kk); ctx.fillStyle = '#3a3634';
          ctx.beginPath(); ctx.arc(sx + kk * 14 + Math.sin(kk * 6 + i) * 3, sy - 8 - kk * 46, 4 + kk * 10, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    if (b.upgrading) { // Hämmernde Baumeister
      const k = Math.abs(Math.sin(S.time * 8 + b.id));
      ctx.save(); ctx.translate(x - hs + 6, y + hs * 0.2); ctx.rotate(-0.8 + k * 0.9);
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -12); ctx.stroke();
      ctx.fillStyle = '#9a9aa0'; ctx.fillRect(-4, -15, 8, 5); ctx.restore();
    }
    // Stufen-Abzeichen
    if (b.level > 0) {
      for (let i = 0; i < b.level; i++) {
        const px = x - (b.level - 1) * 5 + i * 10, py = y + hs - 2;
        ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px + 4, py); ctx.lineTo(px, py + 4); ctx.lineTo(px - 4, py); ctx.closePath();
        ctx.fillStyle = '#ffd23a'; ctx.fill(); outline(1.2);
      }
    }
    if (b.upgrading) bar(x - hs, y + hs + 6, hs * 2, 5, b.upgrading.t / b.upgrading.total, '#ffd23a');
    if (b.prod) bar(x - hs, y + hs + 12, hs * 2, 4, b.prod.t / b.prod.total, '#7ac8ff');
    if (b.hp < b.maxHp) bar(x - hs, y - hs - (b.size === 1 ? 32 : hs * 0.2) - 4, hs * 2, 5, b.hp / b.maxHp, hpCol(b));
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function bar(x, y, w, h, f, col) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = col; ctx.fillRect(x, y, w * G.clamp(f, 0, 1), h);
  }
  function hpCol(e) {
    const S = G.S;
    if (e.owner < 0) return '#e0a030';
    const me = S.players[0];
    if (e.owner === 0) return '#5fe05f';
    return S.players[e.owner].team === me.team ? '#5fb0ff' : '#ff5050';
  }

  // -------------------------------------------------------------------------
  // Einheiten: gezeichnete Figuren je Volk und Rolle (Draufsicht im Comic-Stil)
  const RACE_LOOK = {
    menschen: { skin: '#f0c8a0', hair: '#6a4a2a', metal: '#b8bec8' },
    elfen:    { skin: '#f4dcc0', hair: '#efe6a8', metal: '#c8d8c0', ears: true },
    untote:   { skin: '#e4dfcc', hair: null, metal: '#7a7a82', skull: true, eye: '#7aff9a' },
    orks:     { skin: '#6f9a3c', hair: '#1e1a14', metal: '#8a7a6a', tusks: true },
    zwerge:   { skin: '#f0c09a', hair: '#b4602a', metal: '#a8a8b0', beard: true, short: true },
    daemonen: { skin: '#b4302e', hair: '#1a1010', metal: '#3a2a2a', horns: true, eye: '#ffb030', tail: true },
  };
  const ROLE_GEAR = {
    tank:        { menschen: 'sword', elfen: 'spear', untote: 'mace', orks: 'axe', zwerge: 'hammer', daemonen: 'axe', shield: true, heavy: true },
    nahkampf:    { menschen: 'sword', elfen: 'sword', untote: 'claws', orks: 'axe', zwerge: 'axe', daemonen: 'sword' },
    fernkampf:   { menschen: 'crossbow', elfen: 'bow', untote: 'bow', orks: 'spear', zwerge: 'musket', daemonen: 'bow' },
    magier:      { all: 'staff', robe: true, hood: true },
    heiler:      { all: 'staff', robe: true, hood: true, light: true },
    support:     { menschen: 'banner', elfen: 'banner', untote: 'staff', orks: 'drum', zwerge: 'banner', daemonen: 'staff' },
    beschwoerer: { all: 'staff', robe: true, hood: true, dark: true },
  };
  const HERO_WEAPON = { ilyria: 'bow', brokk: 'musket', mira: 'crossbow', aldric: 'hammer', thorgrim: 'hammer', urgash: 'axe', azgaroth: 'axe', varuk: 'axe', gareth: 'sword', faelar: 'sword', kael: 'sword', aerin: 'sword', vexa: 'sword' };
  const HERO_SHIELD = { aldric: 1, aerin: 1, thorgrim: 1 };
  const ORB = { magier: '#ff8a3a', heiler: '#7aff7a', support: '#ffe066', beschwoerer: '#c070ff' };

  function lookOf(e, p, pal) {
    const n = e.name || '';
    if (e.kind === 'creep') {
      switch (e.ctype) {
        case 'wolf': return { shape: 'beast', col: '#7c7a78', dark: '#4a4846' };
        case 'bandit': return { shape: 'human', race: 'menschen', cloth: '#6a4a2a', hood: '#3e3226', weapon: 'sword' };
        case 'schuetze': return { shape: 'human', race: 'menschen', cloth: '#5a4a32', hood: '#3e3226', weapon: 'bow' };
        case 'troll': return { shape: 'human', race: 'troll', skin: '#5a8a88', cloth: '#5a3a24', weapon: 'mace', tusks: true, big: true };
        case 'hexer': return { shape: 'human', race: 'troll', skin: '#4a7a92', cloth: '#3a2a4a', weapon: 'staff', orb: '#9ad8ff', tusks: true, robe: true };
        case 'golem': return { shape: 'golem', col: '#8a8478' };
        case 'drache': return { shape: 'dragon', col: '#a8322a', wing: '#7a2420' };
        case 'ogerkoenig': return { shape: 'human', race: 'troll', skin: '#8a9a5a', cloth: '#5a3a24', weapon: 'mace', tusks: true, big: true, crown: true };
        case 'koloss': return { shape: 'golem', col: '#6e6a5e' };
        case 'lindwurm': return { shape: 'dragon', col: '#3a7a4a', wing: '#2a5a34' };
        case 'wagen': return { shape: 'wagon' };
        case 'wache': return { shape: 'human', race: 'menschen', cloth: '#7a5a2a', hood: '#4a3a26', weapon: 'sword', shield: true };
        case 'armbrust': return { shape: 'human', race: 'menschen', cloth: '#6a4a2a', hood: '#4a3a26', weapon: 'crossbow' };
      }
    }
    if (e.role === 'summon') {
      if (/Knochendrache/.test(n)) return { shape: 'dragon', col: '#d8d0b8', wing: '#8a8478', bone: true };
      if (/Baumhirte/.test(n)) return { shape: 'golem', col: '#6a5a3a' };
      if (/Koloss/.test(n)) return { shape: 'golem', col: '#d8d0b8' };
      if (/Abgrundfürst/.test(n)) return { shape: 'golem', col: '#3a2a24', fire: true };
      if (/Belagerungskanone/.test(n)) return { shape: 'turret' };
      if (/Keiler/.test(n)) return { shape: 'beast', col: '#5a3e2a', dark: '#2e2016' };
      if (/Zombie/.test(n)) return { shape: 'human', race: 'untote', skin: '#7a9a6a', cloth: '#3a3a30', weapon: 'claws', skull: false };
      if (/Wolfsreiter/.test(n)) return { shape: 'beast', col: '#6a5a4a', dark: '#3a3028', rider: true };
      if (/Geisterwolf/.test(n)) return { shape: 'beast', col: '#9ad8ff', dark: '#5a8ab0', ghost: true };
      if (/wolf/i.test(n)) return { shape: 'beast', col: '#8a6a4a', dark: '#4a3a2a' };
      if (/bär/i.test(n)) return { shape: 'beast', col: '#6a4a2a', dark: '#3a2814', bear: true };
      if (/elementar/i.test(n)) return { shape: 'blob', col: '#5ab0e8' };
      if (/golem|infernal/i.test(n)) return { shape: 'golem', col: /Infernal/.test(n) ? '#3a2a24' : '#8a8478', fire: /Infernal/.test(n) };
      if (/Geschütz/.test(n)) return { shape: 'turret' };
      if (/Wichtel/.test(n)) return { shape: 'human', race: 'daemonen', cloth: '#5a1a1a', weapon: 'claws', wings: true, small: true };
      if (/Skelett|Knochen/.test(n)) return { shape: 'human', race: 'untote', cloth: '#4a4650', weapon: 'sword' };
      if (/Ghul/.test(n)) return { shape: 'human', race: 'untote', skin: '#9aa890', cloth: '#3a3a3a', weapon: 'claws', skull: false };
      if (/Geist/.test(n)) return { shape: 'human', race: p.race, cloth: '#bfe8ff', weapon: 'sword', ghost: true };
      if (/Teufelswache/.test(n)) return { shape: 'human', race: 'daemonen', cloth: '#3a1a1a', weapon: 'axe', shield: true, heavy: true, big: true };
      if (/Troll/.test(n)) return { shape: 'human', race: 'troll', skin: '#5a8a88', cloth: '#5a3a24', weapon: 'mace', tusks: true, big: true };
      return { shape: 'human', race: p.race, cloth: pal.roof, weapon: 'sword' };
    }
    if (e.kind === 'hero') {
      const d = e.def;
      return { shape: 'human', race: p.race, cloth: pal.roof, weapon: HERO_WEAPON[d.id] || (d.ranged ? 'staff' : 'sword'), shield: !!HERO_SHIELD[d.id],
        robe: d.ranged && !HERO_WEAPON[d.id], orb: pal.trim, hero: true, heavy: !d.ranged };
    }
    const g = ROLE_GEAR[e.role] || {};
    const look = { shape: 'human', race: p.race, cloth: g.light ? '#e8e0d0' : g.dark ? '#4a2a5a' : pal.roof, weapon: g[p.race] || g.all || 'sword',
      shield: g.shield, heavy: g.heavy, robe: g.robe, hood: g.hood && !RACE_LOOK[p.race].skull, orb: ORB[e.role] };
    if (e.role === 'support' && p.race === 'untote') { look.ghost = true; look.cloth = '#cfe8f0'; look.weapon = 'none'; }
    if (e.role === 'support' && p.race === 'daemonen') look.wings = true;
    return look;
  }

  // Waffen werden an der Hand gezeichnet (lokales Koordinatensystem: Hand im Ursprung, x zeigt nach vorne)
  function drawWeapon(w, k, swing, look, p) {
    ctx.lineCap = 'round';
    const line = (x1, y1, x2, y2, wd, col) => { ctx.strokeStyle = INK; ctx.lineWidth = wd + 2.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.stroke(); };
    switch (w) {
      case 'sword':
        ctx.rotate(-0.9 + swing);
        line(0, 0, k * 1.15, 0, 2.4, '#dfe3ea');
        line(k * 0.12, -k * 0.22, k * 0.12, k * 0.22, 2, '#8a6a3a');
        break;
      case 'axe':
        ctx.rotate(-0.9 + swing);
        line(-k * 0.1, 0, k * 1.0, 0, 2.2, '#7a5530');
        ctx.beginPath(); ctx.moveTo(k * 0.75, -k * 0.05); ctx.quadraticCurveTo(k * 0.85, -k * 0.55, k * 1.12, -k * 0.45); ctx.lineTo(k * 1.05, k * 0.05); ctx.closePath();
        ctx.fillStyle = '#c8ccd4'; ctx.fill(); outline(1.8);
        break;
      case 'hammer': case 'mace':
        ctx.rotate(-0.9 + swing);
        line(-k * 0.1, 0, k * 0.95, 0, 2.2, '#6a4a2a');
        ctx.beginPath(); ctx.rect(k * 0.8, -k * 0.28, k * 0.3, k * 0.56); ctx.fillStyle = w === 'mace' ? '#6a6a72' : '#a8acb4'; ctx.fill(); outline(1.8);
        break;
      case 'spear':
        ctx.rotate(-0.3 + swing * 0.5);
        line(-k * 0.5, 0, k * 1.35, 0, 1.8, '#8a6a3a');
        ctx.beginPath(); ctx.moveTo(k * 1.35, -k * 0.13); ctx.lineTo(k * 1.65, 0); ctx.lineTo(k * 1.35, k * 0.13); ctx.closePath(); ctx.fillStyle = '#d8dce4'; ctx.fill(); outline(1.5);
        break;
      case 'bow': {
        const pull = swing > 0 ? 0 : 0.18;
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-k * 0.1, 0, k * 0.75, -1.15, 1.15); ctx.stroke();
        ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(k * 0.2, -k * 0.68); ctx.lineTo(-k * (0.2 + pull), 0); ctx.lineTo(k * 0.2, k * 0.68); ctx.stroke();
        break;
      }
      case 'crossbow':
        line(-k * 0.2, 0, k * 0.85, 0, 2.6, '#7a5530');
        ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(k * 0.45, 0, k * 0.45, -1.4, 1.4); ctx.stroke();
        ctx.strokeStyle = '#9a9aa2'; ctx.lineWidth = 1.6; ctx.stroke();
        break;
      case 'musket':
        line(-k * 0.3, 0, k * 1.3, 0, 2.8, '#3a3a40');
        line(-k * 0.35, 0, k * 0.2, 0, 3.6, '#7a5530');
        if (swing > 0.6) { ctx.save(); ctx.shadowColor = '#ffb040'; ctx.shadowBlur = 10; circ(k * 1.45, 0, 3.5, '#ffd27a', 0); ctx.restore(); }
        break;
      case 'staff': {
        ctx.rotate(-1.35 + swing * 0.4);
        line(-k * 0.45, 0, k * 1.25, 0, 2.2, '#6a4a2a');
        const oc = look.orb || '#fff';
        ctx.save(); ctx.shadowColor = oc; ctx.shadowBlur = 10 + swing * 8; circ(k * 1.3, 0, k * 0.2, oc, 1.5); ctx.restore();
        break;
      }
      case 'banner': {
        ctx.rotate(-1.45);
        line(-k * 0.4, 0, k * 1.6, 0, 2, '#6a4a2a');
        const wv = Math.sin(G.S.time * 5 + k) * k * 0.08;
        ctx.beginPath(); ctx.moveTo(k * 1.55, 0); ctx.lineTo(k * 1.55, -k * 0.75 + wv); ctx.lineTo(k * 1.05, -k * 0.8 - wv); ctx.lineTo(k * 1.0, 0); ctx.closePath();
        ctx.fillStyle = p ? p.color : '#888'; ctx.fill(); outline(1.6);
        break;
      }
      case 'claws':
        ctx.rotate(-0.4 + swing * 0.8);
        for (const o of [-0.2, 0, 0.2]) line(k * 0.1, o * k, k * 0.55, o * k * 1.4, 1.2, '#e8e0c8');
        break;
    }
  }
  function drawShield(k, p, look) {
    ctx.beginPath(); ctx.moveTo(-k * 0.38, -k * 0.42); ctx.lineTo(k * 0.38, -k * 0.42); ctx.lineTo(k * 0.38, k * 0.1); ctx.quadraticCurveTo(k * 0.35, k * 0.45, 0, k * 0.6); ctx.quadraticCurveTo(-k * 0.35, k * 0.45, -k * 0.38, k * 0.1); ctx.closePath();
    ctx.fillStyle = p ? p.color : '#7a6a5a'; ctx.fill(); outline(2);
    ctx.strokeStyle = look.trim || '#e8d8a0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -k * 0.38); ctx.lineTo(0, k * 0.5); ctx.stroke();
    circ(0, -k * 0.02, k * 0.11, look.trim || '#e8d8a0', 1.2);
  }

  function drawHumanoid(e, look, x, y, k, face, flash, swing, p, pal) {
    const RL = RACE_LOOK[look.race] || { skin: look.skin, metal: '#8a8a8a' };
    const skin = flash ? '#fff' : (look.skin || RL.skin);
    const cloth = flash ? '#fff' : look.heavy ? shade(RL.metal, look.hero ? 0.1 : 0) : look.cloth;
    const fx = Math.cos(face), fy = Math.sin(face);
    const away = fy < -0.35;
    const short = RL.short ? 0.85 : 1;
    if (look.small) k *= 0.8;
    if (look.big) k *= 1.08;
    const ghost = look.ghost;
    if (ghost) { ctx.save(); ctx.globalAlpha *= 0.62; }
    // Hände
    const hR = { x: x + Math.cos(face + 1.25) * k * 0.72, y: y + Math.sin(face + 1.25) * k * 0.45 - k * 0.12 };
    const hL = { x: x + Math.cos(face - 1.25) * k * 0.72, y: y + Math.sin(face - 1.25) * k * 0.45 - k * 0.12 };
    const gear = () => {
      if (look.weapon && look.weapon !== 'none') { ctx.save(); ctx.translate(hR.x, hR.y); ctx.rotate(face); drawWeapon(look.weapon, k, swing, { ...look, trim: pal && pal.trim }, p); ctx.restore(); circ(hR.x, hR.y, k * 0.15, skin, 1.4); }
      if (look.shield) { ctx.save(); ctx.translate(hL.x + fx * k * 0.15, hL.y + fy * k * 0.1); drawShield(k * 0.9, p, { trim: pal && pal.trim }); ctx.restore(); }
      else circ(hL.x, hL.y, k * 0.15, skin, 1.4);
    };
    // Flügel (Wichtel, Schreckensbote)
    if (look.wings) for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x + s * k * 0.3, y - k * 0.3); ctx.lineTo(x + s * k * 1.15, y - k * 0.95 + Math.sin(G.S.time * 9) * 2); ctx.lineTo(x + s * k * 0.95, y - k * 0.2); ctx.lineTo(x + s * k * 1.05, y + k * 0.15); ctx.closePath();
      ctx.fillStyle = '#4a1414'; ctx.fill(); outline(1.6);
    }
    // Schwanz (Dämonen)
    if (RL.tail && !away) { ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - fx * k * 0.4, y + k * 0.3); ctx.quadraticCurveTo(x - fx * k * 1.1, y + k * 0.7, x - fx * k * 0.9 + Math.sin(G.S.time * 3) * 3, y + k * 0.1); ctx.stroke(); ctx.strokeStyle = skin; ctx.lineWidth = 1.5; ctx.stroke(); }
    if (away) gear();
    // Umhang (Held)
    if (look.hero) {
      ctx.beginPath(); ctx.moveTo(x - k * 0.6, y - k * 0.45); ctx.quadraticCurveTo(x - fx * k * 1.2 - k * 0.2, y + k * 0.9, x + 0, y + k * 0.75); ctx.quadraticCurveTo(x - fx * k * 1.2 + k * 0.2, y + k * 0.9, x + k * 0.6, y - k * 0.45); ctx.closePath();
      ctx.fillStyle = p.color; ctx.fill(); outline(2.2);
    }
    // Körper (Rüstung oder Robe)
    const ty = y - k * 0.05;
    ctx.beginPath();
    if (look.robe || ghost) { ctx.moveTo(x - k * 0.48, ty - k * 0.42); ctx.lineTo(x + k * 0.48, ty - k * 0.42); ctx.lineTo(x + k * 0.68, ty + k * 0.6 * short); if (ghost) { for (let i = 3; i >= -3; i--) ctx.lineTo(x + i * k * 0.22, ty + k * (0.6 + (i % 2 ? 0.2 : 0)) + Math.sin(G.S.time * 6 + i) * 2); } ctx.lineTo(x - k * 0.68, ty + k * 0.6 * short); }
    else ctx.ellipse(x, ty, k * 0.62, k * 0.55 * short, 0, 0, 7);
    ctx.closePath(); ctx.fillStyle = cloth; ctx.fill(); outline(look.hero ? 2.8 : 2.2);
    ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x + k * 0.15, ty - k, k, k * 2); ctx.restore();
    // Wappenrock bzw. Gürtel in Spielerfarbe
    if (p && !ghost) {
      if (!away) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(x - k * 0.17, ty - k * 0.38); ctx.lineTo(x + k * 0.17, ty - k * 0.38); ctx.lineTo(x + k * 0.13, ty + k * 0.45 * short); ctx.lineTo(x, ty + k * 0.55 * short); ctx.lineTo(x - k * 0.13, ty + k * 0.45 * short); ctx.closePath(); ctx.fill(); outline(1.2); }
      for (const s of [-1, 1]) circ(x + s * k * 0.52, ty - k * 0.3, k * 0.2, look.heavy ? (pal ? pal.trim : '#ccc') : p.color, 1.4); // Schulterstücke
    }
    if (look.weapon === 'drum') { ctx.beginPath(); ctx.ellipse(x + fx * k * 0.2, ty + k * 0.15, k * 0.38, k * 0.26, 0, 0, 7); ctx.fillStyle = '#9a6a3a'; ctx.fill(); outline(1.6); ctx.fillStyle = '#e8dcc0'; ctx.beginPath(); ctx.ellipse(x + fx * k * 0.2, ty + k * 0.08, k * 0.3, k * 0.14, 0, 0, 7); ctx.fill(); }
    // Kopf
    const hx = x + fx * k * 0.06, hy = y - k * 0.68 * short;
    const hr = k * (look.race === 'troll' ? 0.38 : 0.4);
    if (look.hood || look.hood === undefined && look.cloth && look.race === 'menschen' && e.kind === 'creep') {
      circ(hx, hy - k * 0.02, hr * 1.25, flash ? '#fff' : (typeof look.hood === 'string' ? look.hood : shade(look.cloth, -0.15)), 2);
    }
    const skull = look.skull !== undefined ? look.skull : RL.skull;
    circ(hx, hy, hr, skull ? (flash ? '#fff' : '#e4dfcc') : skin, 2);
    if (!away) {
      // Gesicht
      const ex = hx + fx * hr * 0.35, ey = hy + Math.max(0, fy) * hr * 0.15;
      if (skull) {
        for (const s of [-1, 1]) { circ(ex + s * hr * 0.38, ey - hr * 0.05, hr * 0.24, INK, 0); ctx.save(); ctx.shadowColor = RL.eye || '#7aff9a'; ctx.shadowBlur = 6; circ(ex + s * hr * 0.38, ey - hr * 0.05, hr * 0.1, RL.eye || '#7aff9a', 0); ctx.restore(); }
        ctx.strokeStyle = INK; ctx.lineWidth = 1; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(ex + i * hr * 0.14, ey + hr * 0.35); ctx.lineTo(ex + i * hr * 0.14, ey + hr * 0.55); ctx.stroke(); }
      } else {
        const ec = RL.eye || (look.race === 'troll' ? '#ffdd44' : null);
        for (const s of [-1, 1]) {
          if (ec) { ctx.save(); ctx.shadowColor = ec; ctx.shadowBlur = 5; circ(ex + s * hr * 0.36, ey - hr * 0.05, hr * 0.15, ec, 0); ctx.restore(); }
          else { circ(ex + s * hr * 0.36, ey - hr * 0.05, hr * 0.15, '#fff', 0); circ(ex + s * hr * 0.36 + fx * hr * 0.05, ey - hr * 0.03, hr * 0.09, INK, 0); }
          ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ex + s * hr * 0.15, ey - hr * 0.3); ctx.lineTo(ex + s * hr * 0.55, ey - hr * 0.22); ctx.stroke(); // grimmige Brauen
        }
        if (RL.tusks || look.tusks) for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(ex + s * hr * 0.28, ey + hr * 0.38); ctx.lineTo(ex + s * hr * 0.36, ey + hr * 0.05); ctx.lineTo(ex + s * hr * 0.16, ey + hr * 0.35); ctx.closePath(); ctx.fillStyle = '#f4ecd8'; ctx.fill(); outline(1); }
      }
      if (RL.beard) { ctx.beginPath(); ctx.moveTo(hx - hr * 0.85, hy + hr * 0.05); ctx.quadraticCurveTo(hx - hr * 0.7, hy + hr * 1.9, hx, hy + hr * 2.1); ctx.quadraticCurveTo(hx + hr * 0.7, hy + hr * 1.9, hx + hr * 0.85, hy + hr * 0.05); ctx.quadraticCurveTo(hx, hy + hr * 0.7, hx - hr * 0.85, hy + hr * 0.05); ctx.fillStyle = flash ? '#fff' : RL.hair; ctx.fill(); outline(1.6); }
    } else if (RL.hair && !look.heavy && !look.hood) { circ(hx, hy - hr * 0.1, hr * 0.92, RL.hair, 0); }
    // Ohren, Haare, Hörner, Helme
    if (RL.ears) for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + s * hr * 0.8, hy - hr * 0.05); ctx.lineTo(hx + s * hr * 1.7, hy - hr * 0.6); ctx.lineTo(hx + s * hr * 0.85, hy + hr * 0.3); ctx.closePath(); ctx.fillStyle = skin; ctx.fill(); outline(1.4); }
    if (RL.horns || look.wings) for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + s * hr * 0.45, hy - hr * 0.7); ctx.quadraticCurveTo(hx + s * hr * 1.4, hy - hr * 1.2, hx + s * hr * 1.1, hy - hr * 2.0); ctx.lineTo(hx + s * hr * 0.2, hy - hr * 0.85); ctx.closePath(); ctx.fillStyle = '#2a1a1a'; ctx.fill(); outline(1.4); }
    if (look.heavy && !look.hero) { // Helm
      ctx.beginPath(); ctx.arc(hx, hy, hr * 1.05, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fillStyle = flash ? '#fff' : RL.metal; ctx.fill(); outline(1.8);
      if (look.race === 'zwerge' || look.race === 'orks') for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + s * hr * 0.8, hy - hr * 0.5); ctx.quadraticCurveTo(hx + s * hr * 1.7, hy - hr * 0.8, hx + s * hr * 1.5, hy - hr * 1.6); ctx.lineTo(hx + s * hr * 0.6, hy - hr * 0.8); ctx.closePath(); ctx.fillStyle = '#efe6d0'; ctx.fill(); outline(1.2); }
    } else if (look.hood && !away) {
      ctx.beginPath(); ctx.arc(hx, hy, hr * 1.18, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(hx, hy - hr * 1.7); ctx.closePath(); ctx.fillStyle = flash ? '#fff' : shade(look.cloth, -0.1); ctx.fill(); outline(1.6);
    } else if (look.race === 'orks' && !look.heavy) { ctx.beginPath(); ctx.ellipse(hx, hy - hr * 0.95, hr * 0.22, hr * 0.45, 0, 0, 7); ctx.fillStyle = RL.hair; ctx.fill(); outline(1.2); }
    else if (look.race === 'elfen' && !away) { ctx.beginPath(); ctx.arc(hx, hy - hr * 0.1, hr * 1.0, Math.PI * 1.1, Math.PI * 1.9); ctx.strokeStyle = RL.hair; ctx.lineWidth = hr * 0.45; ctx.stroke(); }
    if (look.hero || look.crown) { // Krone
      ctx.beginPath(); const cy = hy - hr * 0.95, w = hr * 0.85;
      ctx.moveTo(hx - w, cy + 3); ctx.lineTo(hx - w, cy - 4); ctx.lineTo(hx - w / 2, cy - 1); ctx.lineTo(hx, cy - 6); ctx.lineTo(hx + w / 2, cy - 1); ctx.lineTo(hx + w, cy - 4); ctx.lineTo(hx + w, cy + 3); ctx.closePath();
      ctx.fillStyle = '#ffd23a'; ctx.fill(); outline(1.6);
    }
    if (!away) gear();
    if (ghost) ctx.restore();
    return hy - hr;
  }

  function drawBeast(e, look, x, y, k, face, flash, S) {
    const big = look.bear ? 1.25 : 1;
    k *= big;
    const fx = Math.cos(face), fy = Math.sin(face) * 0.75;
    const col = flash ? '#fff' : look.col;
    if (look.ghost) { ctx.save(); ctx.globalAlpha *= 0.7; ctx.shadowColor = look.col; ctx.shadowBlur = 10; }
    const step = e.moving ? Math.sin((e.walkT || 0) * 1.4) : 0;
    // Beine
    ctx.strokeStyle = INK; ctx.lineCap = 'round';
    for (const [o, s] of [[0.55, 1], [0.55, -1], [-0.45, 1], [-0.45, -1]]) {
      const bx = x + fx * k * o + (-fy) * s * k * 0.32, by = y + fy * k * o + fx * s * k * 0.2;
      const sw = step * s * (o > 0 ? 1 : -1) * k * 0.25;
      ctx.lineWidth = k * 0.22; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + fx * sw, by + k * 0.42); ctx.stroke();
      ctx.strokeStyle = look.dark; ctx.lineWidth = k * 0.12; ctx.stroke(); ctx.strokeStyle = INK;
    }
    // Schwanz
    if (!look.bear) { ctx.lineWidth = k * 0.2; ctx.beginPath(); ctx.moveTo(x - fx * k * 0.75, y - fy * k * 0.75); ctx.quadraticCurveTo(x - fx * k * 1.3, y - fy * k * 1.3 - k * 0.4, x - fx * k * 1.4 + Math.sin(S.time * 6 + e.id) * 2, y - fy * k * 1.2 - k * 0.15); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = k * 0.1; ctx.stroke(); }
    // Rumpf
    ctx.beginPath(); ctx.ellipse(x, y, k * 0.95, k * 0.55, Math.atan2(fy, fx), 0, 7); ctx.fillStyle = col; ctx.fill(); outline(2.2);
    ctx.beginPath(); ctx.ellipse(x - fy * k * 0.12, y - k * 0.12, k * 0.6, k * 0.25, Math.atan2(fy, fx), 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();
    // Kopf mit Schnauze und Ohren
    const hx = x + fx * k * 0.95, hy = y + fy * k * 0.95 - k * 0.25;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx - fy * s * k * 0.2 - fx * k * 0.1, hy - k * 0.15); ctx.lineTo(hx - fy * s * k * 0.32 - fx * k * 0.2, hy - k * (look.bear ? 0.42 : 0.6)); ctx.lineTo(hx - fy * s * k * 0.05, hy - k * 0.3); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); outline(1.4); }
    circ(hx, hy, k * 0.4, col, 2);
    ctx.beginPath(); ctx.ellipse(hx + fx * k * 0.32, hy + fy * k * 0.25 + k * 0.08, k * 0.24, k * 0.16, Math.atan2(fy, fx), 0, 7); ctx.fillStyle = shade(look.col, 0.15); ctx.fill(); outline(1.4);
    circ(hx + fx * k * 0.5, hy + fy * k * 0.35 + k * 0.05, k * 0.07, INK, 0);
    if (fy > -0.3) for (const s of [-1, 1]) { const ex = hx + fx * k * 0.1 - fy * s * k * 0.17, ey = hy - k * 0.08; ctx.save(); ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = e.kind === 'creep' ? 4 : 0; circ(ex, ey, k * 0.07, look.ghost ? '#fff' : '#ffd84a', 0); ctx.restore(); }
    if (look.ghost) ctx.restore();
    if (look.rider) { // Ork-Reiter
      circ(x - fx * k * 0.1, y - k * 0.55, k * 0.38, '#6a5040', 1.8);
      circ(x - fx * k * 0.05, y - k * 1.05, k * 0.27, '#6f9a3c', 1.6);
      ctx.save(); ctx.translate(x + (-fy) * k * 0.4, y - k * 0.7); ctx.rotate(face - 0.4); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(k * 1.1, 0); ctx.stroke(); ctx.restore();
    }
    return y - k * 0.8;
  }

  function drawGolem(e, look, x, y, k, face, flash, S) {
    k *= 1.1;
    const col = flash ? '#fff' : look.col;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.rect(x + s * k * 0.75 - k * 0.22, y - k * 0.35 + (e.swing > 0 && s > 0 ? -k * 0.3 : 0), k * 0.44, k * 0.8); ctx.fillStyle = shade(look.col, -0.15); ctx.fill(); outline(2); }
    roundRect(x - k * 0.6, y - k * 0.75, k * 1.2, k * 1.25, k * 0.2); ctx.fillStyle = col; ctx.fill(); outline(2.4);
    roundRect(x - k * 0.32, y - k * 1.15, k * 0.64, k * 0.5, k * 0.12); ctx.fillStyle = shade(look.col, 0.08); ctx.fill(); outline(2);
    ctx.save(); if (look.fire) { ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = 12; }
    ctx.strokeStyle = look.fire ? '#ff7a2a' : 'rgba(0,0,0,0.35)'; ctx.lineWidth = look.fire ? 2 : 1.3;
    ctx.beginPath(); ctx.moveTo(x - k * 0.3, y - k * 0.6); ctx.lineTo(x - k * 0.05, y - k * 0.2); ctx.lineTo(x - k * 0.25, y + k * 0.2); ctx.moveTo(x + k * 0.3, y - k * 0.5); ctx.lineTo(x + k * 0.15, y); ctx.stroke();
    const ec = look.fire ? '#ffb030' : '#7ad8ff'; ctx.shadowColor = ec; ctx.shadowBlur = 8;
    if (Math.sin(face) > -0.35) for (const s of [-1, 1]) circ(x + s * k * 0.13 + Math.cos(face) * k * 0.08, y - k * 0.92, k * 0.07, ec, 0);
    ctx.restore();
    return y - k * 1.15;
  }

  function drawDragon(e, look, x, y, r, face, flash, S) {
    const flap = Math.sin(S.time * 4) * 0.25;
    const col = flash ? '#fff' : look.col;
    for (const sgn of [-1, 1]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(face + sgn * (Math.PI / 2 + flap));
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 2.1, -r * 0.7); ctx.lineTo(r * 1.8, -r * 0.1); ctx.lineTo(r * 1.5, r * 0.25); ctx.lineTo(r * 1.1, r * 0.05); ctx.lineTo(r * 0.8, r * 0.3); ctx.closePath();
      ctx.fillStyle = look.wing; ctx.fill(); outline(2.5);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 1.8, -r * 0.1); ctx.moveTo(0, 0); ctx.lineTo(r * 1.5, r * 0.25); ctx.stroke();
      ctx.restore();
    }
    const fx = Math.cos(face), fy = Math.sin(face);
    ctx.strokeStyle = INK; ctx.lineWidth = r * 0.35; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - fx * r * 0.6, y - fy * r * 0.6); ctx.quadraticCurveTo(x - fx * r * 1.5 + Math.sin(S.time * 2) * 6, y - fy * r * 1.5 + 8, x - fx * r * 1.9, y - fy * r * 1.6); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = r * 0.22; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.95, r * 0.7, face, 0, 7); ctx.fillStyle = col; ctx.fill(); outline(3);
    if (look.bone) { ctx.strokeStyle = INK; ctx.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x - fy * r * 0.5 + fx * i * r * 0.2, y + fx * r * 0.5 + fy * i * r * 0.2); ctx.lineTo(x + fy * r * 0.5 + fx * i * r * 0.2, y - fx * r * 0.5 + fy * i * r * 0.2); ctx.stroke(); } }
    const hx = x + fx * r * 1.05, hy = y + fy * r * 1.05 - r * 0.15;
    ctx.beginPath(); ctx.ellipse(hx, hy, r * 0.55, r * 0.36, face, 0, 7); ctx.fillStyle = col; ctx.fill(); outline(2.5);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx - fy * s * r * 0.2, hy - r * 0.2); ctx.lineTo(hx - fx * r * 0.5 - fy * s * r * 0.35, hy - r * 0.7); ctx.lineTo(hx - fy * s * r * 0.05, hy - r * 0.25); ctx.closePath(); ctx.fillStyle = '#2a1a14'; ctx.fill(); outline(1.5); }
    ctx.save(); ctx.shadowColor = '#ffb030'; ctx.shadowBlur = 10;
    for (const s of [-1, 1]) circ(hx + fx * r * 0.15 - fy * s * r * 0.18, hy - r * 0.12, r * 0.08, look.bone ? '#7aff9a' : '#ffd23a', 0);
    if (e.swing > 0) { ctx.globalAlpha = 0.7; circ(hx + fx * r * 0.7, hy + fy * r * 0.5, r * 0.3, '#ff8a2a', 0); }
    ctx.restore();
    return y - r * 1.0;
  }

  // Vereinfachte Figur für große Schlachten oder weites Herauszoomen (spart Rechenzeit, v. a. am Handy)
  function drawSimple(e, look, x, y, k, face, flash, p) {
    const RL = RACE_LOOK[look.race] || {};
    const fx = Math.cos(face), fy = Math.sin(face);
    if (look.shape === 'beast') {
      ctx.beginPath(); ctx.ellipse(x, y, k * 0.95, k * 0.55, Math.atan2(fy * 0.75, fx), 0, 7); ctx.fillStyle = flash ? '#fff' : look.col; ctx.fill(); outline(1.8);
      circ(x + fx * k * 0.95, y + fy * k * 0.7 - k * 0.25, k * 0.38, flash ? '#fff' : look.col, 1.6);
      if (look.rider) circ(x, y - k * 0.7, k * 0.35, '#6f9a3c', 1.4);
      return y - k * 0.8;
    }
    const body = flash ? '#fff' : look.heavy ? (RL.metal || '#999') : look.cloth;
    ctx.beginPath(); ctx.ellipse(x, y - k * 0.05, k * 0.6, k * 0.55, 0, 0, 7); ctx.fillStyle = body; ctx.fill(); outline(1.8);
    if (p) { ctx.fillStyle = p.color; ctx.fillRect(x - k * 0.15, y - k * 0.4, k * 0.3, k * 0.75); }
    const hx = x + fx * k * 0.06, hy = y - k * 0.68;
    circ(hx, hy, k * 0.4, flash ? '#fff' : (look.skull !== undefined ? look.skull : RL.skull) ? '#e4dfcc' : (look.skin || RL.skin || '#c8a080'), 1.6);
    if (look.weapon && look.weapon !== 'none') { // Waffe als einfacher Strich
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath();
      ctx.moveTo(x + Math.cos(face + 1.2) * k * 0.6, y - k * 0.1); ctx.lineTo(x + Math.cos(face + 0.5) * k * 1.3, y - k * 0.1 + fy * k * 0.5 - k * 0.3); ctx.stroke();
    }
    if (look.shield && p) circ(x + Math.cos(face - 1.2) * k * 0.6, y - k * 0.05, k * 0.3, p.color, 1.4);
    return hy - k * 0.4;
  }

  R._drawMobile = (e) => drawMobile(e); // für Figuren-Vorschau und Tests

  // Kleine Szene fürs Menü: Volk (Held mit Gefolge) oder einzelner Held vor der Heimatkarte
  R.drawPreview = function (cv, race, mode, heroId, skin) {
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    const d2r = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * d2r)) { cv.width = Math.round(w * d2r); cv.height = Math.round(h * d2r); }
    const c2 = cv.getContext('2d');
    const prevCtx = ctx, prevS = G.S;
    const rd = G.RACES[race], th = G.THEMES[rd.map.theme];
    const t = performance.now() / 1000;
    const player = { race, rd, skin: skin || 'standard', color: G.PLAYER_COLORS[0], banner: 'standard' };
    ctx = c2;
    G.S = { time: t, players: [player] };
    try {
      c2.setTransform(d2r, 0, 0, d2r, 0, 0);
      const g = c2.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, shade(th.ground[3], -0.05)); g.addColorStop(1, shade(th.ground[0], -0.45));
      c2.fillStyle = g; c2.fillRect(0, 0, w, h);
      const rnd = rng(race.length * 131 + (heroId ? heroId.length * 17 : 3));
      for (let i = 0; i < 18; i++) {
        c2.globalAlpha = 0.35; c2.fillStyle = th.ground[1 + Math.floor(rnd() * 3)];
        c2.beginPath(); c2.ellipse(rnd() * w, h * 0.35 + rnd() * h * 0.7, 10 + rnd() * 30, 4 + rnd() * 10, 0, 0, 7); c2.fill();
      }
      c2.globalAlpha = 1;
      // Hintergrund-Deko an den Rändern
      for (const [dx, dy, sc] of [[0.08, 0.52, 0.9], [0.93, 0.48, 1.0]]) drawDecor({ x: w * dx, y: h * dy, s: sc * h / 120, v: 1, seed: dx }, th);
      const fig = (e, x, y, sc, off) => {
        const ph = (t + off) % 2.4;
        e.swing = ph < 0.22 ? 0.22 - ph : 0;
        Object.assign(e, { x: 0, y: 0, owner: 0, hp: 1, maxHp: 1, level: 1, m: {}, moving: false, preview: true, id: Math.round(off * 100) });
        c2.save(); c2.translate(x, y); c2.scale(sc, sc); drawMobile(e); c2.restore();
      };
      const hd = rd.heroes.find((x) => x.id === heroId) || rd.heroes[0];
      const hero = { kind: 'hero', def: hd, name: hd.name, r: 16, face: 1.35, range: hd.ranged ? 165 : 28, speed: 80 };
      const unit = (role) => ({ kind: 'unit', role, name: rd.units[role].name, r: G.UNIT_BASE[role].r, face: 1.35, range: G.UNIT_BASE[role].range, speed: 60 });
      const s0 = h / 120;
      if (mode === 'hero') fig(hero, w / 2, h * 0.66, s0 * 1.9, 0.3);
      else {
        fig(unit('tank'), w * 0.26, h * 0.52, s0 * 1.3, 0.9);
        fig(unit('fernkampf'), w * 0.74, h * 0.52, s0 * 1.3, 1.7);
        fig(unit('nahkampf'), w * 0.36, h * 0.78, s0 * 1.35, 1.2);
        fig(unit('magier'), w * 0.64, h * 0.78, s0 * 1.35, 2.0);
        fig(hero, w / 2, h * 0.62, s0 * 1.6, 0.3);
      }
      const v = c2.createRadialGradient(w / 2, h * 0.55, h * 0.3, w / 2, h * 0.55, w * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
      c2.fillStyle = v; c2.fillRect(0, 0, w, h);
    } finally { ctx = prevCtx; G.S = prevS; }
  };
  // Verwandelte Helden (ultimative Fähigkeit) erscheinen größer und mit leuchtender Aura
  function drawMobile(e) {
    if (!(e.avatarT > 0)) return drawMobileBody(e);
    const fy = e.y + e.r * 0.75, pulse = 0.75 + 0.25 * Math.sin(G.S.time * 6);
    ctx.save();
    ctx.globalAlpha = 0.35 * pulse; circ(e.x, e.y - e.r * 0.2, e.r * 2.2, e.avatarCol || '#ffe066', 0); ctx.globalAlpha = 1;
    ctx.translate(e.x, fy); ctx.scale(1.35, 1.35); ctx.translate(-e.x, -fy);
    drawMobileBody(e);
    ctx.restore();
  }
  function drawMobileBody(e) {
    const S = G.S;
    const p = e.owner >= 0 ? S.players[e.owner] : null;
    const r = e.r, face = e.face || 0;
    const pal = p ? R.palOf(p) : null;
    const lunge = e.swing > 0 && e.range < 60 ? Math.sin((e.swing / 0.22) * Math.PI) * 5 : 0;
    const bob = e.moving ? Math.abs(Math.sin((e.walkT || 0) * 1.0)) * -2 : Math.sin(S.time * 2.4 + (e.id || 0)) * 0.7;
    const kb = e.hitT > 0 && e.hitAng !== undefined ? (e.hitT / 0.12) * 2.5 : 0;
    const x = e.x + Math.cos(face) * lunge + Math.cos(e.hitAng || 0) * kb, y = e.y + Math.sin(face) * lunge + bob + Math.sin(e.hitAng || 0) * kb;
    const look = lookOf(e, p, pal);
    const flash = e.hitT > 0;
    const swing = e.swing > 0 ? Math.sin((e.swing / 0.22) * Math.PI) * 1.4 : 0;
    const k = r * 1.15;
    shadow(e.x, e.y + r * 0.75, r * (look.shape === 'dragon' ? 1.6 : 1.05), r * 0.45);
    if (e.boss && !e.preview) { ctx.save(); ctx.globalAlpha = 0.28 + 0.12 * Math.sin(S.time * 4); circ(e.x, e.y + r * 0.6, r * 1.5, '#ff3a2a', 0); ctx.restore(); } // Boss-Aura
    if (pal && pal.glow && !R.lodSimple) { ctx.save(); ctx.globalAlpha = 0.22 + 0.1 * Math.sin(S.time * 3 + e.id); ctx.shadowColor = pal.glow; ctx.shadowBlur = 16; circ(x, y - r * 0.3, r * 1.15, pal.glow, 0); ctx.restore(); }
    if (e.summoned && look.shape === 'human' && !look.ghost) { ctx.save(); ctx.globalAlpha = 0.3; circ(e.x, e.y + r * 0.6, r * 0.9, p.rd.palette.trim, 0); ctx.restore(); }
    let top;
    if (R.lodSimple && (look.shape === 'human' || look.shape === 'beast') && e.kind !== 'hero') top = drawSimple(e, look, x, y, k, face, flash, p);
    else if (look.shape === 'human') {
      if (e.speed > 0 && !look.ghost) { // Füße
        const step = e.moving ? Math.sin((e.walkT || 0) * 1.0) * k * 0.3 : 0;
        for (const sgn of [-1, 1]) {
          const fx = e.x + sgn * k * 0.26 + Math.cos(face) * step * sgn, fy = e.y + k * 0.48 + Math.sin(face) * step * sgn * 0.5;
          ctx.fillStyle = '#3a2a1e'; ctx.beginPath(); ctx.ellipse(fx, fy, k * 0.2, k * 0.14, 0, 0, 7); ctx.fill(); outline(1.4);
        }
      }
      top = drawHumanoid(e, look, x, y, k, face, flash, swing, p, pal);
    } else if (look.shape === 'beast') top = drawBeast(e, look, x, y, k, face, flash, S);
    else if (look.shape === 'golem') top = drawGolem(e, look, x, y, k, face, flash, S);
    else if (look.shape === 'dragon') top = drawDragon(e, look, x, y, r, face, flash, S);
    else if (look.shape === 'blob') {
      const wob = Math.sin(S.time * 5 + (e.id || 0)) * k * 0.08;
      ctx.save(); ctx.globalAlpha = 0.85; ctx.shadowColor = look.col; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(x - k * 0.7, y + k * 0.4); ctx.quadraticCurveTo(x - k * 0.8 - wob, y - k * 0.6, x, y - k * 1.1 - wob); ctx.quadraticCurveTo(x + k * 0.8 + wob, y - k * 0.6, x + k * 0.7, y + k * 0.4); ctx.closePath();
      ctx.fillStyle = flash ? '#fff' : look.col; ctx.fill(); outline(2); ctx.restore();
      for (const s of [-1, 1]) circ(x + s * k * 0.22, y - k * 0.45, k * 0.1, '#e8fbff', 0);
      top = y - k * 1.1;
    } else if (look.shape === 'wagon') top = drawWagon(e, x, y, k, face, flash);
    else { // Geschütz
      circ(x, y, k * 0.8, '#6a6a72', 2.2);
      ctx.save(); ctx.translate(x, y - k * 0.2); ctx.rotate(face); ctx.fillStyle = '#2a2a30'; ctx.fillRect(0, -k * 0.2, k * 1.3, k * 0.4); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(0, -k * 0.2, k * 1.3, k * 0.4); ctx.restore();
      circ(x, y - k * 0.2, k * 0.45, '#8a8a92', 2);
      top = y - k;
    }
    if (e.stun > 0) { ctx.save(); ctx.fillStyle = '#ffe066'; for (let i = 0; i < 3; i++) { const a = S.time * 5 + i * 2.1; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 9, top - 4 + Math.sin(a) * 3, 2, 0, 7); ctx.fill(); } ctx.restore(); }
    // Stufe
    if (e.kind === 'unit' && e.level > 1) {
      for (let i = 0; i < e.level - 1; i++) { ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(x - (e.level - 2) * 3 + i * 6, top - 5, 2.2, 0, 7); ctx.fill(); outline(1); }
    }
    if (e.preview) return;
    const sel = G.UI && G.UI.selected === e;
    const big = e.kind === 'hero' || e.boss;
    if (e.hp < e.maxHp || big || sel) bar(x - r - 2, top - (big ? 18 : 11), r * 2 + 4, big ? 5 : 3.5, e.hp / e.maxHp, hpCol(e));
    if (big) {
      ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeText((e.boss ? e.name : `${e.name} (${e.level})`), x, top - 22);
      ctx.fillStyle = '#ffe9a8'; ctx.fillText((e.boss ? e.name : `${e.name} (${e.level})`), x, top - 22);
    }
    if (sel) { ctx.strokeStyle = '#7aff7a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.7, r + 6, (r + 6) * 0.5, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  }

  function drawWagon(e, x, y, k, face, flash) {
    const dir = Math.cos(face) >= 0 ? 1 : -1, roll = (e.walkT || 0) * 0.6;
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    // Zugochse
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(k * 0.55, k * 0.12); ctx.lineTo(k * 1.05, k * 0.12); ctx.stroke();
    for (const lx of [1.1, 1.55]) { ctx.beginPath(); ctx.moveTo(k * lx, k * 0.2); ctx.lineTo(k * lx + Math.sin(roll * 2 + lx) * 2, k * 0.5); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(k * 1.32, k * 0.12, k * 0.48, k * 0.27, 0, 0, 7); ctx.fillStyle = flash ? '#fff' : '#7a5232'; ctx.fill(); outline(2);
    circ(k * 1.82, -k * 0.02, k * 0.2, flash ? '#fff' : '#6a4428', 1.8);
    ctx.strokeStyle = '#efe6d0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(k * 1.75, -k * 0.18); ctx.lineTo(k * 1.66, -k * 0.34); ctx.moveTo(k * 1.92, -k * 0.18); ctx.lineTo(k * 2.02, -k * 0.33); ctx.stroke();
    // Wagenkasten mit Plane
    ctx.fillStyle = flash ? '#fff' : '#8a5a32'; roundRect(-k * 0.95, -k * 0.32, k * 1.55, k * 0.56, 3); ctx.fill(); outline(2.2);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-k * 0.95, -k * 0.05); ctx.lineTo(k * 0.6, -k * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-k * 0.9, -k * 0.32); ctx.bezierCurveTo(-k * 0.9, -k * 1.3, k * 0.55, -k * 1.3, k * 0.55, -k * 0.32); ctx.closePath();
    ctx.fillStyle = flash ? '#fff' : '#efe4c8'; ctx.fill(); outline(2.2);
    ctx.strokeStyle = 'rgba(120,90,50,0.6)'; ctx.lineWidth = 1.4; for (const rx of [-0.45, 0.1]) { ctx.beginPath(); ctx.moveTo(k * rx, -k * 0.34); ctx.quadraticCurveTo(k * rx, -k * 1.05, k * (rx + 0.08), -k * 1.02); ctx.stroke(); }
    circ(-k * 0.2, -k * 0.62, k * 0.16, '#ffd23a', 1.4); // Goldsack-Wappen
    // Räder
    for (const wx of [-k * 0.6, k * 0.32]) {
      circ(wx, k * 0.3, k * 0.3, '#5a3a1e', 2);
      ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 0; i < 3; i++) { const a = roll + (i / 3) * Math.PI; ctx.moveTo(wx + Math.cos(a) * k * 0.26, k * 0.3 + Math.sin(a) * k * 0.26); ctx.lineTo(wx - Math.cos(a) * k * 0.26, k * 0.3 - Math.sin(a) * k * 0.26); }
      ctx.stroke();
    }
    ctx.restore();
    return y - k * 1.3;
  }
  // Schrein: Plattform mit Obelisk und schwebendem Kristall, Runenkreis in der Farbe des Besitzers, Fortschritt der Eroberung
  const teamColor = (S, team) => { const ps = S.players.filter((p) => p.team === team); return ps.some((p) => p === S.players[0]) ? S.players[0].color : ps.length ? ps[0].color : '#d8d8d8'; };
  function drawShrine(sh) {
    const S = G.S, d = G.SHRINES[sh.type], x = sh.x, y = sh.y, t = S.time;
    const own = sh.owner >= 0 ? teamColor(S, sh.owner) : '#cfcfcf';
    shadow(x + 6, y + 10, 52, 19);
    ctx.beginPath(); ctx.ellipse(x, y + 6, 48, 19, 0, 0, 7); ctx.fillStyle = '#8a8a84'; ctx.fill(); outline(2.5);
    ctx.beginPath(); ctx.ellipse(x, y + 4, 40, 15, 0, 0, 7); ctx.fillStyle = '#a4a49c'; ctx.fill();
    ctx.save(); ctx.strokeStyle = own; ctx.lineWidth = 3; ctx.globalAlpha = 0.65 + 0.3 * Math.sin(t * 2 + x);
    ctx.setLineDash([7, 5]); ctx.lineDashOffset = -t * 10; ctx.beginPath(); ctx.ellipse(x, y + 4, 34, 12.5, 0, 0, 7); ctx.stroke(); ctx.restore();
    if (sh.cap > 0 && sh.capTeam !== null) { // Eroberung läuft
      ctx.save(); ctx.strokeStyle = teamColor(S, sh.capTeam); ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(x, y + 6, 56, 23, 0, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * sh.cap) / G.SHRINE_CAPTURE); ctx.stroke(); ctx.restore();
    }
    // Obelisk
    ctx.beginPath(); ctx.moveTo(x - 10, y + 5); ctx.lineTo(x - 7, y - 32); ctx.lineTo(x, y - 39); ctx.lineTo(x + 7, y - 32); ctx.lineTo(x + 10, y + 5); ctx.closePath();
    ctx.fillStyle = '#9a9890'; ctx.fill(); outline(2.2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(x - 7, y - 32); ctx.lineTo(x, y - 39); ctx.lineTo(x - 2, y + 4); ctx.lineTo(x - 9, y + 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = d.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 2.5 + y); ctx.beginPath(); ctx.moveTo(x - 3, y - 6); ctx.lineTo(x, y - 18); ctx.lineTo(x + 3, y - 6); ctx.moveTo(x, y - 18); ctx.lineTo(x, y - 2); ctx.stroke(); ctx.globalAlpha = 1;
    // schwebender Kristall
    const cy = y - 54 + Math.sin(t * 2 + x) * 3;
    ctx.save(); ctx.globalAlpha = 0.3; circ(x, cy, 16, d.color, 0); ctx.restore();
    ctx.beginPath(); ctx.moveTo(x, cy - 11); ctx.lineTo(x + 7, cy); ctx.lineTo(x, cy + 11); ctx.lineTo(x - 7, cy); ctx.closePath(); ctx.fillStyle = d.color; ctx.fill(); outline(1.8);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.moveTo(x, cy - 11); ctx.lineTo(x - 7, cy); ctx.lineTo(x, cy - 2); ctx.closePath(); ctx.fill();
    if (sh.owner >= 0) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 24, y + 8); ctx.lineTo(x + 24, y - 22); ctx.stroke(); const w = Math.sin(t * 4 + x) * 1.5; ctx.beginPath(); ctx.moveTo(x + 24, y - 22); ctx.lineTo(x + 38, y - 18 + w); ctx.lineTo(x + 24, y - 12); ctx.closePath(); ctx.fillStyle = own; ctx.fill(); outline(1.5); }
    label(d.name, x, y + 36, d.color, 10);
  }
  function drawShop(s) {
    const x = s.x, y = s.y;
    shadow(x + 6, y + 18, 46, 18);
    ctx.fillStyle = '#6a4a2a'; roundRect(x - 34, y - 6, 68, 30, 4); ctx.fill(); outline();
    ctx.beginPath(); ctx.moveTo(x - 44, y - 2); ctx.lineTo(x, y - 46); ctx.lineTo(x + 44, y - 2); ctx.closePath();
    const grd = ctx.createLinearGradient(x - 44, 0, x + 44, 0);
    for (let i = 0; i < 8; i++) { grd.addColorStop(i / 8, i % 2 ? '#c03a2a' : '#f0e0c0'); grd.addColorStop((i + 1) / 8 - 0.001, i % 2 ? '#c03a2a' : '#f0e0c0'); }
    ctx.fillStyle = grd; ctx.fill(); outline();
    circ(x, y + 8, 9, '#ffd23a', 2);
    ctx.fillStyle = INK; ctx.font = 'bold 11px Georgia'; ctx.textAlign = 'center'; ctx.fillText('G', x, y + 12);
    label('Händler', x, y - 52, '#ffe9a8');
  }
  function label(t, x, y, col, size) {
    ctx.font = `bold ${size || 12}px Georgia, serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y);
  }

  const ARC = { pfeil: [0.16, 46], kanone: [0.3, 90], feuer: [0.1, 40] };
  function drawProjectile(pr) {
    const fxOn = R.fxHigh && !R.lodSimple;
    const k = pr.k || 0, d0 = pr.d0 || 1;
    const arc = ARC[pr.kind];
    const H = arc ? Math.min(arc[1], d0 * arc[0]) : 0;
    const h = 10 + H * 4 * k * (1 - k);
    const slope = arc ? (H * 4 * (1 - 2 * k)) / d0 : 0;
    const ang = Math.atan2(Math.sin(pr.ang || 0) - slope, Math.cos(pr.ang || 0));
    const x = pr.x, y = pr.y - h;
    if (H > 8) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 4, 2, 0, 0, 7); ctx.fill(); }
    // Spur aus den letzten Positionen
    if (fxOn) {
      const tr = pr.trail || (pr.trail = []);
      tr.push(x, y); if (tr.length > 16) tr.splice(0, 2);
      if (tr.length >= 4) {
        const col = pr.kind === 'pfeil' ? 'rgba(255,245,220,' : pr.kind === 'kanone' ? 'rgba(80,80,80,' : null;
        if (col) {
          ctx.lineCap = 'round';
          for (let i = 2; i < tr.length; i += 2) { ctx.strokeStyle = col + (0.35 * i / tr.length) + ')'; ctx.lineWidth = pr.kind === 'kanone' ? 4 * i / tr.length : 1.5; ctx.beginPath(); ctx.moveTo(tr[i - 2], tr[i - 1]); ctx.lineTo(tr[i], tr[i + 1]); ctx.stroke(); }
        } else {
          const c = pr.kind === 'heilung' ? '#9aff9a' : pr.kind === 'feuer' ? '#ff9a3a' : (pr.color || '#fff');
          ctx.fillStyle = c;
          for (let i = 0; i < tr.length - 2; i += 2) { ctx.globalAlpha = 0.45 * i / tr.length; ctx.beginPath(); ctx.arc(tr[i], tr[i + 1], (pr.kind === 'feuer' ? 6 : pr.kind === 'zauber' ? 5 : 2.5) * (0.4 + i / tr.length), 0, 7); ctx.fill(); }
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.save();
    switch (pr.kind) {
      case 'pfeil':
        ctx.translate(x, y); ctx.rotate(ang);
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(5, 0); ctx.stroke();
        ctx.strokeStyle = '#e8d0a0'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#d8dce4'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(3, -2.5); ctx.lineTo(3, 2.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c84a3a'; ctx.fillRect(-11, -2, 3, 4); break;
      case 'kanone': circ(x, y, 5.5, '#2a2a2e', 2); circ(x - 1.5, y - 1.5, 1.6, 'rgba(255,255,255,.4)', 0); break;
      case 'feuer': {
        const fl = 1 + Math.sin(G.S.time * 30 + (pr.d0 || 0)) * 0.12;
        if (fxOn) { ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = 16; }
        circ(x, y, 9 * fl, '#ff7a2a', 2); circ(x, y, 5 * fl, '#ffd25a', 0); break;
      }
      case 'heilung': if (fxOn) { ctx.shadowColor = '#7aff7a'; ctx.shadowBlur = 10; } circ(x, y, 4, '#c8ffc8', 0); break;
      case 'zauber': if (fxOn) { ctx.shadowColor = pr.color; ctx.shadowBlur = 18; } circ(x, y, 8, pr.color || '#fff', 2); circ(x, y, 3.5, '#fff', 0); break;
      default: if (fxOn) { ctx.shadowColor = pr.color || '#fff'; ctx.shadowBlur = 10; } circ(x, y, 4.5, pr.color || '#fff', 1.5); circ(x, y, 1.8, '#fff', 0);
    }
    ctx.restore();
  }

  function seeded(seed, i) { const v = Math.sin((seed * 1000 + i) * 12.9898) * 43758.5453; return v - Math.floor(v); }
  function drawFx(f) {
    const k = f.t / f.dur;
    const hi = R.fxHigh;
    ctx.save();
    switch (f.type) {
      case 'text': {
        ctx.globalAlpha = 1 - k * k;
        const pop = k < 0.12 ? 1 + (0.12 - k) * 3 : 1; // kurzes Aufploppen
        ctx.translate(f.x, f.y - k * 30); ctx.scale(pop, pop);
        label(f.text, 0, 0, f.color, f.big ? 15 : 11);
        break;
      }
      case 'ring': ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.color; ctx.lineWidth = 3 * (1 - k) + 1; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.6 + k * 0.6), 0, 7); ctx.stroke(); break;
      case 'blast': ctx.globalAlpha = 0.45 * (1 - k); ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.5 + k * 0.5), 0, 7); ctx.fill();
        ctx.globalAlpha = 0.9 * (1 - k); ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.stroke(); break;
      case 'hit': { // Treffer: Funkenstoß in Schussrichtung
        const n = f.big ? 8 : 5, len = (f.big ? 16 : 10) * (0.4 + k);
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.color; ctx.lineWidth = f.big ? 2.2 : 1.6; ctx.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const a = (f.ang || 0) + Math.PI + (i / (n - 1) - 0.5) * 2.2;
          ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * len * 0.4, f.y + Math.sin(a) * len * 0.4); ctx.lineTo(f.x + Math.cos(a) * len, f.y + Math.sin(a) * len); ctx.stroke();
        }
        circ(f.x, f.y, (f.big ? 9 : 5) * (1 - k), '#ffffff', 0);
        break;
      }
      case 'slash': { // Klingenhieb: halbmondförmige Spur
        const a0 = f.ang - 1.2 + k * 0.5, a1 = f.ang - 1.2 + Math.min(1, k * 3) * 2.4;
        ctx.globalAlpha = (1 - k) * 0.85; ctx.lineCap = 'round';
        ctx.strokeStyle = f.color; ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, a0, a1); ctx.stroke();
        ctx.globalAlpha = (1 - k) * 0.35; ctx.lineWidth = 9 * (1 - k) + 2;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.85, a0, a1); ctx.stroke();
        break;
      }
      case 'explo': case 'boom': { // Explosion: Druckwelle, Feuerkern, Funken, Rauch
        const r = (f.r || 30) * (f.big ? 1.2 : 1), sd = f.seed || 0.5;
        ctx.globalAlpha = 0.7 * (1 - k); ctx.strokeStyle = '#fff6d8'; ctx.lineWidth = 3 * (1 - k) + 0.5;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, r * (0.3 + k * 1.1), r * (0.3 + k * 1.1) * 0.7, 0, 0, 7); ctx.stroke();
        if (k < 0.55) {
          const kk = k / 0.55, g = ctx.createRadialGradient(f.x, f.y - 4, 0, f.x, f.y - 4, r * (0.5 + kk * 0.5));
          g.addColorStop(0, `rgba(255,250,220,${1 - kk})`); g.addColorStop(0.35, `rgba(255,190,70,${0.9 * (1 - kk)})`);
          g.addColorStop(0.75, (/^#[0-9a-f]{6}$/i.test(f.color || '') ? f.color : '#ff7a2a') + '88'); g.addColorStop(1, 'rgba(255,90,20,0)');
          ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y - 4, r * (0.5 + kk * 0.5), 0, 7); ctx.fill();
        }
        if (hi) {
          ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffd27a';
          for (let i = 0; i < 9; i++) { const a = seeded(sd, i) * 6.28, d = r * (0.3 + k * (0.8 + seeded(sd, i + 9))); ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.7 - k * k * 20, 1.8 * (1 - k) + 0.5, 0, 7); ctx.fill(); }
          if (k > 0.25) { ctx.fillStyle = '#4a4440'; for (let i = 0; i < 5; i++) { const a = seeded(sd, i + 30) * 6.28, kk = (k - 0.25) / 0.75; ctx.globalAlpha = 0.45 * (1 - kk); ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * r * 0.5, f.y - kk * 34 - seeded(sd, i) * 10, r * (0.18 + kk * 0.3), 0, 7); ctx.fill(); } }
        }
        break;
      }
      case 'collapse': { // Gebäude stürzt ein: Staubwolke und fliegende Trümmer
        const r = f.r, sd = f.seed || 0.5;
        if (k < 0.3) { ctx.globalAlpha = (0.3 - k) * 2.5; ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.arc(f.x, f.y, r * (0.6 + k * 2), 0, 7); ctx.fill(); }
        for (let i = 0; i < (hi ? 12 : 6); i++) {
          const a = seeded(sd, i) * 6.28, sp = r * (0.8 + seeded(sd, i + 40) * 1.4);
          const px = f.x + Math.cos(a) * sp * k, py = f.y + Math.sin(a) * sp * k * 0.6 - (sp * 1.4 * k - sp * 2.2 * k * k);
          ctx.globalAlpha = 1 - k; ctx.fillStyle = i % 3 ? '#6a625a' : '#8a5a32';
          ctx.save(); ctx.translate(px, py); ctx.rotate(k * 8 + i); ctx.fillRect(-3, -2, 6, 4); ctx.restore();
        }
        ctx.fillStyle = '#8a8076';
        for (let i = 0; i < (hi ? 10 : 5); i++) { const a = seeded(sd, i + 70) * 6.28; ctx.globalAlpha = 0.5 * (1 - k); ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * r * (0.4 + k), f.y + Math.sin(a) * r * 0.5 * (0.4 + k) - k * 18, r * (0.25 + k * 0.4), 0, 7); ctx.fill(); }
        break;
      }
      case 'dust': {
        const sd = f.seed || 0.5;
        ctx.fillStyle = f.gold ? '#d8c8a0' : '#a8987a';
        for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28 + sd; ctx.globalAlpha = 0.45 * (1 - k); ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * f.r * (0.4 + k * 0.8), f.y + Math.sin(a) * f.r * 0.4 * (0.4 + k * 0.8) - k * 6, f.r * 0.22 * (1 + k), 0, 7); ctx.fill(); }
        if (f.gold) { ctx.fillStyle = '#ffe9a0'; for (let i = 0; i < 6; i++) { const a = seeded(sd, i) * 6.28; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * f.r * 0.7, f.y - f.r * 0.6 - k * 30 * seeded(sd, i + 5), 1.6, 0, 7); ctx.fill(); } }
        break;
      }
      case 'pillar': { // Lichtsäule (Stufenaufstieg, Beschwörung)
        const w = f.r * (1 - k * 0.6), hgt = (f.big ? 150 : 90) * Math.min(1, k * 4);
        const g = ctx.createLinearGradient(0, f.y - hgt, 0, f.y);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, f.color);
        ctx.globalAlpha = 0.55 * (1 - k); ctx.fillStyle = g; ctx.fillRect(f.x - w / 2, f.y - hgt, w, hgt);
        ctx.globalAlpha = 0.8 * (1 - k); ctx.strokeStyle = f.color; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.6 + k * 0.6), f.r * 0.3 * (0.6 + k * 0.6), 0, 0, 7); ctx.stroke();
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + k * 3; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * w * 0.4, f.y - ((k * 120 + i * 20) % hgt || 0), 1.8, 0, 7); ctx.fill(); }
        break;
      }
      case 'heal': { // aufsteigende Heilkreuze im Wirkungsbereich
        const sd = f.seed || 0.5;
        ctx.globalAlpha = 0.25 * (1 - k); ctx.fillStyle = f.color; ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#b8ffb8';
        for (let i = 0; i < (hi ? 16 : 8); i++) {
          const a = seeded(sd, i) * 6.28, d = Math.sqrt(seeded(sd, i + 20)) * f.r, ph = (k + seeded(sd, i + 40) * 0.5);
          const px = f.x + Math.cos(a) * d, py = f.y + Math.sin(a) * d * 0.6 - ph * 40;
          ctx.globalAlpha = Math.max(0, 1 - ph); ctx.fillRect(px - 1, py - 4, 2.4, 8); ctx.fillRect(px - 4, py - 1, 8, 2.4);
        }
        break;
      }
      case 'rune': { // Runenkreis am Boden (Stärkungszauber)
        const fade = Math.min(1, k * 5) * (1 - k);
        ctx.globalAlpha = 0.8 * fade; ctx.strokeStyle = f.color; ctx.lineWidth = 2;
        ctx.translate(f.x, f.y); ctx.scale(1, 0.55);
        ctx.beginPath(); ctx.arc(0, 0, f.r, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, f.r * 0.8, 0, 7); ctx.stroke();
        ctx.rotate(k * 2.5);
        for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(f.r * 0.84, -4); ctx.lineTo(f.r * 0.96, 0); ctx.lineTo(f.r * 0.84, 4); ctx.stroke(); }
        break;
      }
      case 'puff': ctx.globalAlpha = 0.6 * (1 - k); ctx.fillStyle = '#888';
        for (let i = 0; i < 4; i++) { const a = i * 1.6; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 10 * k, f.y + Math.sin(a) * 10 * k - k * 10, f.r * 0.6, 0, 7); ctx.fill(); }
        break;
      case 'spark': ctx.globalAlpha = 1 - k; ctx.fillStyle = f.color;
        for (let i = 0; i < 4; i++) { const a = i * 1.57 + k * 2, px = f.x + Math.cos(a) * 9, py = f.y + Math.sin(a) * 6 - k * 18; ctx.fillRect(px - 0.8, py - 3, 1.8, 6); ctx.fillRect(px - 3, py - 0.8, 6, 1.8); }
        break;
      case 'mark': ctx.globalAlpha = 0.5 + 0.4 * Math.sin(f.t * 18); ctx.strokeStyle = f.color; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -f.t * 30; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - k * 0.15), 0, 7); ctx.stroke(); break;
      case 'meteor': {
        const h = (1 - k) * 500, mx = f.x + h * 0.4, my = f.y - h;
        if (hi) for (let i = 1; i <= 6; i++) { ctx.globalAlpha = 0.35 * (1 - i / 7); circ(mx + i * 9, my - i * 22, 14 - i * 1.5, i < 3 ? '#ffb040' : '#6a5a50', 0); }
        ctx.globalAlpha = 1; if (hi) { ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = 20; }
        circ(mx, my, 16, '#ff7a2a', 2.5); circ(mx - 3, my - 3, 7, '#ffe08a', 0);
        break;
      }
    }
    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // Leben auf der Karte: Arbeiter, Tiere, Blut, Leichen
  function drawWorker(w, p) {
    const pal = R.palOf(p), x = w.x, y = w.y, f = w.face || 0;
    const bob = w.moving ? Math.abs(Math.sin(w.walkT)) * -1.5 : 0;
    shadow(x, y + 4, 6, 3);
    if (w.state === 'work') { // Spitzhacke / Axt schwingen
      const k = Math.sin(G.S.time * 9 + w.idx) * 0.9;
      ctx.save(); ctx.translate(x, y - 2); ctx.rotate(f + k - 0.5);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 0); ctx.stroke();
      ctx.strokeStyle = '#9a9aa0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(10, -3); ctx.lineTo(10, 3); ctx.stroke();
      ctx.restore();
    }
    circ(x, y + bob, 5.5, shade(pal.body, -0.1), 1.8);
    circ(x + Math.cos(f) * 1.5, y + bob - 4, 3.2, '#e8c8a0', 1.5);
    if (w.carry === 'gold') circ(x - Math.cos(f) * 5, y + bob - 3, 3, '#ffd23a', 1.4);
    else if (w.carry === 'holz') { ctx.save(); ctx.translate(x - Math.cos(f) * 5, y + bob - 3); ctx.rotate(f + 1.2); ctx.fillStyle = '#8a5a32'; ctx.fillRect(-6, -2, 12, 4); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-6, -2, 12, 4); ctx.restore(); }
  }

  const CRIT = {
    hase: { col: '#b8a890', r: 4 }, schneehase: { col: '#f4f6f8', r: 4 }, reh: { col: '#a8784a', r: 6 }, kroete: { col: '#5a7a3a', r: 3.5 },
    ratte: { col: '#5a5450', r: 3 }, echse: { col: '#8a9a4a', r: 3.5 }, fuchs: { col: '#d87a3a', r: 5 }, salamander: { col: '#ff6a2a', r: 3.5 },
  };
  function drawCritter(c) {
    const S = G.S;
    if (c.glow) {
      ctx.save(); ctx.shadowBlur = 10;
      const col = c.type === 'gluehwurm' ? '#d8ff8a' : '#ff9a3a'; ctx.shadowColor = col; ctx.fillStyle = col;
      for (let i = 0; i < c.n; i++) {
        const a = c.t * (0.4 + i * 0.07) + i * 1.7;
        ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(c.t * 1.5 + i));
        ctx.beginPath(); ctx.arc(c.hx + Math.cos(a) * (20 + i * 6), c.hy + Math.sin(a * 1.3) * (14 + i * 4), 1.6, 0, 7); ctx.fill();
      }
      ctx.restore(); return;
    }
    if (c.fly) {
      const flap = Math.sin(c.t * (c.type === 'geier' ? 3 : 10)) * 0.8;
      const col = { vogel: '#3a3a3a', eule: '#8a6a4a', kraehe: '#1a1a1e', geier: '#4a3a30', fledermaus: '#2a1a1e' }[c.type];
      const sz = c.type === 'geier' ? 12 : c.type === 'eule' ? 9 : 7;
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(c.x + 30, c.y + 60, sz, sz * 0.4, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.ang);
      ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(2, 0); ctx.quadraticCurveTo(-2, s * sz * (0.6 + flap * 0.4), -sz * 0.6, s * sz * (0.9 + flap * 0.3)); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.45, sz * 0.22, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.restore(); return;
    }
    const d = CRIT[c.type] || CRIT.hase;
    const hop = c.moving && (c.type === 'hase' || c.type === 'schneehase' || c.type === 'kroete') ? Math.abs(Math.sin(c.t * 14)) * -4 : 0;
    shadow(c.x, c.y + d.r * 0.6, d.r, d.r * 0.4);
    ctx.save(); ctx.translate(c.x, c.y + hop); ctx.rotate(c.face);
    ctx.fillStyle = d.col; ctx.beginPath(); ctx.ellipse(0, 0, d.r * 1.3, d.r * 0.8, 0, 0, 7); ctx.fill(); outline(1.3);
    ctx.beginPath(); ctx.arc(d.r * 1.2, 0, d.r * 0.6, 0, 7); ctx.fill(); outline(1.3);
    if (c.type === 'hase' || c.type === 'schneehase') { ctx.beginPath(); ctx.ellipse(d.r * 0.9, -d.r * 0.5, d.r * 0.7, d.r * 0.22, -0.4, 0, 7); ctx.fill(); outline(1); }
    if (c.type === 'reh') { ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(d.r * 1.3, -2); ctx.lineTo(d.r * 1.1, -d.r); ctx.moveTo(d.r * 1.3, 2); ctx.lineTo(d.r * 1.1, d.r); ctx.stroke(); }
    if (c.type === 'salamander') { ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = 8; ctx.fill(); }
    if (c.type === 'fuchs' || c.type === 'ratte' || c.type === 'echse' || c.type === 'salamander') { ctx.strokeStyle = d.col; ctx.lineWidth = c.type === 'fuchs' ? 4 : 1.5; ctx.beginPath(); ctx.moveTo(-d.r * 1.2, 0); ctx.lineTo(-d.r * 2.4, Math.sin(c.t * 6) * 2); ctx.stroke(); }
    ctx.restore();
  }

  function drawDecal(d) {
    const fade = d.kind === 'truemmer' ? Math.min(1, (120 - d.t) / 20) : Math.min(1, (60 - d.t) / 15);
    ctx.save(); ctx.globalAlpha = 0.75 * fade; ctx.fillStyle = d.col;
    if (d.kind === 'truemmer') {
      for (let i = 0; i < 7; i++) { const a = d.seed + i * 0.9, rr = d.r * (0.3 + ((d.seed * (i + 3)) % 1) * 0.6); ctx.beginPath(); ctx.ellipse(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr * 0.6, 6 + (i % 3) * 3, 4 + (i % 2) * 2, a, 0, 7); ctx.fill(); }
    } else if (d.kind === 'lache') {
      ctx.beginPath(); ctx.ellipse(d.x, d.y + 3, d.r * Math.min(1, d.t * 2 + 0.3), d.r * 0.55 * Math.min(1, d.t * 2 + 0.3), d.seed, 0, 7); ctx.fill();
      for (let i = 0; i < 3; i++) { const a = d.seed + i * 2.1; ctx.beginPath(); ctx.arc(d.x + Math.cos(a) * d.r * 1.1, d.y + Math.sin(a) * d.r * 0.6, d.r * 0.2, 0, 7); ctx.fill(); }
    } else { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function drawCorpse(c) {
    const k = Math.min(1, c.t / 0.3); // Umkippen
    const fade = c.t > 5 ? Math.max(0, 1 - (c.t - 5) / 4) : 1; // nach 5 s langsam versinken
    ctx.save(); ctx.globalAlpha = 0.9 * fade;
    ctx.translate(c.x, c.y + k * 3); ctx.rotate(c.face + Math.PI / 2 * k);
    const r = c.r * 0.85;
    ctx.fillStyle = shade(c.col, -0.5);
    ctx.beginPath(); ctx.ellipse(0, 0, r * (0.95 + 0.2 * k), r * (0.8 - 0.35 * k), 0, 0, 7); ctx.fill(); outline(1.5);
    ctx.fillStyle = shade(c.col, -0.3); ctx.beginPath(); ctx.arc(r * 0.95 * k, 0, r * 0.38, 0, 7); ctx.fill(); outline(1.2);
    if (c.owner >= 0) { ctx.globalAlpha *= 0.7; ctx.strokeStyle = G.S.players[c.owner].color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0.5, 2.6); ctx.stroke(); }
    ctx.restore();
  }
  function drawParticle(q) {
    ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y - q.z, q.s, 0, 7); ctx.fill();
  }

  // -------------------------------------------------------------------------
  // Hauptzeichnung
  // -------------------------------------------------------------------------
  // Kamerawackeln, Wetter und Wolkenschatten
  R.shakeAmp = 0;
  R.shake = function (x, y, amp) {
    if (!R.fxHigh || !canvas) return;
    const cx = R.cam.x + R.viewW() / 2, cy = R.cam.y + R.viewH() / 2;
    const d = Math.hypot(x - cx, y - cy), reach = Math.max(R.viewW(), R.viewH()) * 0.8;
    if (d > reach) return;
    R.shakeAmp = Math.min(14, Math.max(R.shakeAmp, amp * (1 - d / reach)));
  };
  const WEATHER = {
    frost: { n: 90, kind: 'schnee' }, silberwald: { n: 26, kind: 'blatt', cols: ['#9ad86a', '#d8c86a', '#6ab86a', '#c8e8a0'] },
    auen: { n: 26, kind: 'pollen' }, suempfe: { n: 6, kind: 'nebel' }, steppe: { n: 28, kind: 'staub' }, asche: { n: 60, kind: 'asche' },
  };
  let wx = [], wTheme = null, wLastCam = null;
  function drawWeather(rdt, W, H) {
    const S = G.S, cfg = WEATHER[S.theme];
    if (!cfg) return;
    if (wTheme !== S.theme || !wx.length) {
      wTheme = S.theme; wx = [];
      for (let i = 0; i < cfg.n; i++) wx.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random(), ph: Math.random() * 6.28, ember: cfg.kind === 'asche' && i % 4 === 0 });
    }
    // Parallaxe: Partikel bewegen sich leicht mit der Kamera mit
    const camX = R.cam.x * R.cam.z, camY = R.cam.y * R.cam.z;
    const pdx = wLastCam ? camX - wLastCam[0] : 0, pdy = wLastCam ? camY - wLastCam[1] : 0;
    wLastCam = [camX, camY];
    const t = S.time;
    for (const q of wx) {
      q.x -= pdx * 0.9; q.y -= pdy * 0.9;
      switch (cfg.kind) {
        case 'schnee': q.y += (25 + q.s * 40) * rdt; q.x += Math.sin(t * 1.3 + q.ph) * 12 * rdt; break;
        case 'blatt': q.y += (18 + q.s * 22) * rdt; q.x += (Math.sin(t * 1.1 + q.ph) * 30 + 10) * rdt; break;
        case 'pollen': q.y += Math.sin(t * 0.8 + q.ph) * 8 * rdt - 4 * rdt; q.x += (10 + q.s * 8) * rdt; break;
        case 'nebel': q.x += (8 + q.s * 8) * rdt; break;
        case 'staub': q.x += (160 + q.s * 140) * rdt; q.y += Math.sin(t * 2 + q.ph) * 10 * rdt; break;
        case 'asche': if (q.ember) { q.y -= (20 + q.s * 30) * rdt; q.x += Math.sin(t * 2 + q.ph) * 14 * rdt; } else { q.y += (12 + q.s * 16) * rdt; q.x += Math.sin(t + q.ph) * 8 * rdt; } break;
      }
      const m = cfg.kind === 'nebel' ? 350 : 20;
      if (q.x < -m) q.x += W + m * 2; if (q.x > W + m) q.x -= W + m * 2;
      if (q.y < -m) q.y += H + m * 2; if (q.y > H + m) q.y -= H + m * 2;
    }
    ctx.save();
    for (const q of wx) {
      switch (cfg.kind) {
        case 'schnee': ctx.globalAlpha = 0.55 + q.s * 0.4; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(q.x, q.y, 1 + q.s * 2.2, 0, 7); ctx.fill(); break;
        case 'blatt': ctx.globalAlpha = 0.85; ctx.fillStyle = cfg.cols[Math.floor(q.s * cfg.cols.length)];
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(t * (1 + q.s) + q.ph); ctx.scale(1, Math.abs(Math.sin(t * 2 + q.ph)) * 0.8 + 0.2);
          ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.5, 0, 0, 7); ctx.fill(); ctx.restore(); break;
        case 'pollen': ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 3 + q.ph); ctx.fillStyle = '#fff8d0'; ctx.beginPath(); ctx.arc(q.x, q.y, 1.4 + q.s, 0, 7); ctx.fill(); break;
        case 'nebel': { const r = 180 + q.s * 180, g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r);
          g.addColorStop(0, 'rgba(170,190,165,0.16)'); g.addColorStop(1, 'rgba(170,190,165,0)'); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(q.x - r, q.y - r, r * 2, r * 2); break; }
        case 'staub': ctx.globalAlpha = 0.18 + q.s * 0.15; ctx.strokeStyle = '#e8c89a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - 18 - q.s * 20, q.y); ctx.stroke(); break;
        case 'asche': if (q.ember) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6 + q.ph); ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.arc(q.x, q.y, 1.6 + q.s, 0, 7); ctx.fill(); }
          else { ctx.globalAlpha = 0.5; ctx.fillStyle = '#9a928c'; ctx.fillRect(q.x, q.y, 2 + q.s * 2, 1.5 + q.s); } break;
      }
    }
    ctx.restore();
  }
  // große, langsam ziehende Wolkenschatten (Weltkoordinaten)
  function drawClouds(S) {
    if (!{ auen: 1, steppe: 1, frost: 1, silberwald: 1 }[S.theme]) return;
    for (let i = 0; i < 4; i++) {
      const span = S.w + 1200, cx = ((i * 977 + S.time * (14 + i * 3)) % span) - 600, cy = ((i * 0.27 + 0.15) % 1) * S.h;
      const r = 320 + i * 60, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(10,14,20,0.13)'); g.addColorStop(1, 'rgba(10,14,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.4, r, 0, 0, 7); ctx.fill();
    }
  }

  // Nebel des Krieges: kleines Bild mit einem Pixel je 40-px-Feld, weich hochskaliert. Aufdecken und Zuziehen blenden sanft über.
  let fogCv = null, fogImg = null, fogA = null, fogFor = null;
  function updateFogLayer(S, rdt) {
    const F = S.fog, n = F.FW * F.FH;
    if (fogFor !== S || !fogCv) {
      if (!fogCv || fogCv.width !== F.FW || fogCv.height !== F.FH) {
        fogCv = document.createElement('canvas'); fogCv.width = F.FW; fogCv.height = F.FH;
        fogImg = fogCv.getContext('2d').createImageData(F.FW, F.FH);
      }
      fogA = new Float32Array(n).fill(-1); // -1: beim ersten Bild sofort übernehmen
      fogFor = S;
    }
    const d = fogImg.data, vis = F.vis, exp = F.exp, k = Math.min(1, rdt * 6);
    for (let c = 0; c < n; c++) {
      const target = (0.93 - 0.43 * exp[c] / 255) * (1 - vis[c] / 255);
      const a = fogA[c] < 0 ? target : fogA[c] + (target - fogA[c]) * k;
      fogA[c] = a;
      const j = c * 4;
      d[j] = 7; d[j + 1] = 9; d[j + 2] = 15; d[j + 3] = a * 255;
    }
    fogCv.getContext('2d').putImageData(fogImg, 0, 0);
  }

  R.draw = function () {
    const S = G.S; if (!S) return;
    const cam = R.cam, z = cam.z;
    const vw = canvas.clientWidth / z, vh = canvas.clientHeight / z;
    const now = performance.now(), rdt = Math.min(0.1, (now - (R.lastDraw || now)) / 1000);
    R.lastDraw = now;
    R.fxHigh = G.settings.effects !== false;
    // Weiche Bewegung: Positionen zwischen zwei Rechenschritten (30/s) für jedes Bild (60/s) überblenden
    const alpha = S.paused || S.over ? 1 : G.clamp((S.acc || 0) * 30, 0, 1);
    const moved = [];
    for (const e of S.ents) {
      if (e.kind === 'building' || e.px === undefined) continue;
      const dx = e.x - e.px, dy = e.y - e.py;
      if (dx * dx + dy * dy > 2500) continue; // Sprünge (z. B. Wiederbelebung) nicht überblenden
      moved.push(e, e.x, e.y);
      e.x = e.px + dx * alpha; e.y = e.py + dy * alpha;
    }
    for (const pr of S.proj) if (pr.px !== undefined) { moved.push(pr, pr.x, pr.y); pr.x = pr.px + (pr.x - pr.px) * alpha; pr.y = pr.py + (pr.y - pr.py) * alpha; }
    // Kamerawackeln klingt schnell ab
    let sx = 0, sy = 0;
    if (R.shakeAmp > 0.15) { sx = (Math.random() - 0.5) * 2 * R.shakeAmp; sy = (Math.random() - 0.5) * 2 * R.shakeAmp; R.shakeAmp *= Math.exp(-rdt * 9); } else R.shakeAmp = 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0d0b09'; ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, (-cam.x * z + sx) * dpr, (-cam.y * z + sy) * dpr);
    if (ground) ctx.drawImage(ground, 0, 0, S.w, S.h);
    const inView = (x, y, m) => x > cam.x - m && x < cam.x + vw + m && y > cam.y - m && y < cam.y + vh + m;
    // Nebel: Gegner nur zeigen, wo gerade Sicht ist; Gelände, Lager und Händler, sobald erkundet
    const fogOn = G.fogActive(), seen = G.visibleAt, known = G.exploredAt;
    R.L.ground(S, inView); // Wasser, Lava, Eis, Moor, Wiesen und Feenringe – lebendig, aber flach

    // Lager-Beschriftungen
    for (const c of S.camps) {
      if (c.done || c.event === 'boss' || !inView(c.x, c.y, 120) || !known(c.x, c.y) || (c.event && !seen(c.x, c.y))) continue; // Boss trägt seinen Namen selbst
      const txt = c.left > 0 ? c.name : `${c.name} – kehrt in ${Math.ceil(c.respawnT)} s zurück`;
      ctx.globalAlpha = 0.85; label(txt, c.x, c.y + 62, c.left > 0 ? '#ffcf8a' : '#aaa', 11); ctx.globalAlpha = 1;
    }
    // Sammelpunkt / Armeeziel des Spielers
    const me = S.players[0];
    if (me.alive && me.armyPoint) {
      const ap = me.armyPoint;
      ctx.strokeStyle = me.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(ap.x, ap.y + 8); ctx.lineTo(ap.x, ap.y - 18); ctx.stroke();
      ctx.fillStyle = me.color; ctx.beginPath(); ctx.moveTo(ap.x, ap.y - 18); ctx.lineTo(ap.x + 12, ap.y - 13); ctx.lineTo(ap.x, ap.y - 8); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Blut, Trümmer und Gefallene liegen auf dem Boden
    for (const d of S.decals) if (inView(d.x, d.y, 60) && seen(d.x, d.y)) drawDecal(d);
    for (const c of S.corpses) if (inView(c.x, c.y, 40) && seen(c.x, c.y)) drawCorpse(c);

    // Tiefensortierung: Deko, Gebäude, Einheiten, Arbeiter, Tiere
    const th = G.THEMES[S.theme];
    const list = [], ghosts = fogOn ? S.fog.ghosts : null;
    for (const d of S.decor) if (inView(d.x, d.y, 60)) list.push({ y: d.y, d });
    R.L.items(S, inView, list); // hohe Geländemerkmale (Felsen, Urbäume, Ruinen …) mit Tiefe
    for (const s of S.sites) {
      if (!inView(s.x, s.y, 80) || !known(s.x, s.y)) continue;
      const hidden = s.b && !s.b.dead && fogOn && !G.canSee(s.b) && !ghosts.has(s.b.id); // unbemerkt bebaut: noch leer zeigen
      if (!s.b || s.b.dead || hidden) list.push({ y: s.y, site: s });
    }
    for (const p of S.players) if (p.alive) for (const w of p.wv) if (inView(w.x, w.y, 20) && (p.team === me.team || seen(w.x, w.y))) list.push({ y: w.y, w, p });
    for (const c of S.critters) if (!c.fly && inView(c.hx || c.x, c.hy || c.y, 120) && seen(c.x, c.y)) list.push({ y: c.y, c });
    for (const e of S.ents) if (!e.dead && inView(e.x, e.y, 80) && G.canSee(e)) list.push({ y: e.y + (e.kind === 'building' ? e.size * T / 2 - 10 : 0), e });
    if (ghosts) for (const g of ghosts.values()) if (inView(g.x, g.y, 80) && !seen(g.x, g.y)) list.push({ y: g.y + g.size * T / 2 - 10, e: g }); // zuletzt gesehen
    for (const s of S.shops) if (inView(s.x, s.y, 80) && known(s.x, s.y)) list.push({ y: s.y + 10, s });
    for (const sh of S.shrines || []) if (inView(sh.x, sh.y, 90) && known(sh.x, sh.y)) list.push({ y: sh.y + 8, sh });
    let nMob = 0;
    for (const it of list) if (it.e && it.e.kind !== 'building') nMob++;
    R.lodSimple = z < 0.6 || nMob > 90;
    list.sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.d) drawDecor(it.d, th);
      else if (it.s) drawShop(it.s);
      else if (it.site) drawSite(it.site);
      else if (it.w) drawWorker(it.w, it.p);
      else if (it.c) drawCritter(it.c);
      else if (it.tf) R.L.tall(it.tf);
      else if (it.sh) drawShrine(it.sh);
      else if (it.e.kind === 'building') drawBuilding(it.e);
      else drawMobile(it.e);
    }
    for (const q of S.parts) if (inView(q.x, q.y, 20) && seen(q.x, q.y)) drawParticle(q);
    for (const pr of S.proj) if (inView(pr.x, pr.y, 40) && seen(pr.x, pr.y)) drawProjectile(pr);
    for (const c of S.critters) if (c.fly && inView(c.x, c.y, 80) && seen(c.x, c.y)) drawCritter(c);
    for (const f of S.fx) if (inView(f.x, f.y, 200) && seen(f.x, f.y)) drawFx(f);
    R.L.air(S, inView, rdt); // Schmetterlinge, Irrlichter, Staubteufel, Glut, Rauch, Lichtschein
    if (R.fxHigh) drawClouds(S);
    if (fogOn) {
      updateFogLayer(S, rdt);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(fogCv, 0, 0, S.fog.FW * S.fog.cell, S.fog.FH * S.fog.cell);
    }

    // Bauvorschau
    const UI = G.UI;
    if (UI && UI.placing) {
      const type = UI.placing;
      let pos = G.snap(type, R.mouse.wx, R.mouse.wy);
      if (G.BUILDINGS[type].outpost) { const st = G.freeSiteNear(R.mouse.wx, R.mouse.wy, 140); if (st) pos = { x: st.x, y: st.y }; for (const s2 of S.sites) if ((!s2.b || s2.b.dead) && known(s2.x, s2.y)) { ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(s2.x, s2.y, 60, 0, 7); ctx.stroke(); ctx.setLineDash([]); } }
      const ok = G.canPlace(me, type, pos.x, pos.y) && !G.buildingCheck(me, type);
      const hs = G.BUILDINGS[type].size * T / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(me.base.x, me.base.y, G.BASE_RADIUS, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = ok ? 'rgba(80,255,80,0.35)' : 'rgba(255,60,60,0.35)';
      ctx.fillRect(pos.x - hs, pos.y - hs, hs * 2, hs * 2);
      ctx.strokeStyle = ok ? '#6f6' : '#f55'; ctx.lineWidth = 2; ctx.strokeRect(pos.x - hs, pos.y - hs, hs * 2, hs * 2);
      buildingIcon(type, pos.x, pos.y, 1.2, '#fff');
    }
    // Zielvorschau beim Wirken einer Heldenfähigkeit: Reichweite um den Helden, Wirkungsbereich am Zeiger
    if (UI && UI.casting !== null && UI.casting !== undefined && !me.hero.dead) {
      const h = me.hero, ab = h.abilities[UI.casting];
      const mx = R.mouse.wx, my = R.mouse.wy, inRange = Math.hypot(mx - h.x, my - h.y) <= 470;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,230,120,0.6)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h.x, h.y, 470, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      const rad = ab.radius || 28;
      ctx.fillStyle = inRange ? 'rgba(255,160,60,0.22)' : 'rgba(255,60,60,0.22)';
      ctx.strokeStyle = inRange ? '#ffb040' : '#ff5050'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(mx, my, rad, 0, 7); ctx.fill(); ctx.stroke();
      label(ab.name, mx, my - rad - 8, inRange ? '#ffe9a8' : '#ff9a9a', 12);
      ctx.restore();
    }
    if (UI && UI.selected && UI.selected.kind === 'building' && !UI.selected.dead && UI.selected.def.attack) {
      const b = UI.selected;
      ctx.strokeStyle = 'rgba(255,220,120,0.5)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.def.attack.range, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
    if (UI && UI.selected && UI.selected.kind === 'building' && !UI.selected.dead) {
      const b = UI.selected, hs = b.size * T / 2;
      ctx.strokeStyle = '#7aff7a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -S.time * 12; ctx.strokeRect(b.x - hs - 3, b.y - hs - 3, hs * 2 + 6, hs * 2 + 6); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
    if (R.fxHigh) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); drawWeather(rdt, canvas.clientWidth, canvas.clientHeight); }
    for (let i = 0; i < moved.length; i += 3) { moved[i].x = moved[i + 1]; moved[i].y = moved[i + 2]; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  // -------------------------------------------------------------------------
  // Minikarte
  R.drawMinimap = function (mc) {
    const S = G.S; if (!S) return;
    const m = mc.getContext('2d');
    const W = mc.width, H = mc.height, sx = W / S.w, sy = H / S.h;
    if (ground) m.drawImage(ground, 0, 0, W, H); else { m.fillStyle = '#333'; m.fillRect(0, 0, W, H); }
    m.fillStyle = 'rgba(0,0,0,0.25)'; m.fillRect(0, 0, W, H);
    const fogOn = G.fogActive(), known = G.exploredAt;
    if (fogOn && fogCv && fogFor === S) { m.imageSmoothingEnabled = true; m.drawImage(fogCv, 0, 0, S.fog.FW * S.fog.cell * sx, S.fog.FH * S.fog.cell * sy); }
    for (const c of S.camps) {
      if (c.event) { // angekündigte Ereignisse sind für alle sichtbar
        if (c.done) continue;
        if (c.event === 'boss') { m.fillStyle = '#ff3a2a'; m.beginPath(); m.arc(c.x * sx, c.y * sy, 4.5 + Math.sin(S.time * 5), 0, 7); m.fill(); m.strokeStyle = '#000'; m.lineWidth = 1; m.stroke(); }
        else { m.fillStyle = '#ffe066'; m.fillRect(c.x * sx - 3, c.y * sy - 2, 6, 4); m.strokeStyle = '#5a3a1e'; m.lineWidth = 1; m.strokeRect(c.x * sx - 3, c.y * sy - 2, 6, 4); }
        continue;
      }
      if (!known(c.x, c.y)) continue; m.fillStyle = c.left > 0 ? '#e0a030' : '#555'; m.beginPath(); m.arc(c.x * sx, c.y * sy, 3, 0, 7); m.fill();
    }
    for (const sh of S.shrines || []) {
      if (!known(sh.x, sh.y)) continue;
      const X = sh.x * sx, Y = sh.y * sy;
      m.beginPath(); m.moveTo(X, Y - 5); m.lineTo(X + 4, Y); m.lineTo(X, Y + 5); m.lineTo(X - 4, Y); m.closePath();
      m.fillStyle = sh.owner >= 0 ? teamColor(S, sh.owner) : '#e8e8e8'; m.fill(); m.strokeStyle = G.SHRINES[sh.type].color; m.lineWidth = 1.5; m.stroke();
    }
    for (const s of S.shops) { if (!known(s.x, s.y)) continue; m.fillStyle = '#ffe066'; m.fillRect(s.x * sx - 3, s.y * sy - 3, 6, 6); }
    for (const s of S.sites) { if (!known(s.x, s.y)) continue; m.strokeStyle = '#ffd23a'; m.lineWidth = 1.5; m.beginPath(); m.arc(s.x * sx, s.y * sy, 4, 0, 7); m.stroke(); }
    const bld = (e, p) => { const q = e.type === 'mauer' ? 1 : 2.5; m.fillStyle = p.color; m.fillRect(e.x * sx - q, e.y * sy - q, q * 2, q * 2); };
    if (fogOn) { // zuletzt gesehene gegnerische Gebäude
      m.globalAlpha = 0.6;
      for (const g of S.fog.ghosts.values()) if (!G.visibleAt(g.x, g.y)) bld(g, S.players[g.owner]);
      m.globalAlpha = 1;
    }
    for (const e of S.ents) {
      if (e.dead || e.kind === 'creep' || !G.canSee(e)) continue;
      const p = S.players[e.owner];
      m.fillStyle = p.color;
      if (e.kind === 'building') bld(e, p);
      else if (e.kind === 'hero') { m.beginPath(); m.arc(e.x * sx, e.y * sy, 3.5, 0, 7); m.fill(); m.strokeStyle = '#fff'; m.lineWidth = 1; m.stroke(); }
      else m.fillRect(e.x * sx - 1, e.y * sy - 1, 2, 2);
    }
    m.strokeStyle = '#fff'; m.lineWidth = 1;
    m.strokeRect(R.cam.x * sx, R.cam.y * sy, R.viewW() * sx, R.viewH() * sy);
  };
})();
