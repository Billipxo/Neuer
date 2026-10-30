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
    // Wege zwischen Basen, Händlern und Kartenmitte
    const sc = groundScale;
    const pts = S.players.map((p) => p.base);
    const hub = { x: S.w / 2, y: S.h / 2 };
    const roads = [];
    for (const p of pts) roads.push([p, hub]);
    for (const s of S.shops) roads.push([s, hub]);
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.abs(pts[i].x - pts[j].x) < 10 || Math.abs(pts[i].y - pts[j].y) < 10) roads.push([pts[i], pts[j]]);
    g.lineCap = 'round';
    for (const [a, b] of roads) {
      const mx = (a.x + b.x) / 2 + (rnd() - 0.5) * 200, my = (a.y + b.y) / 2 + (rnd() - 0.5) * 200;
      for (const [w, col, al] of [[70, shade(th.road, -0.3), 0.35], [56, th.road, 0.6]]) {
        g.strokeStyle = col; g.globalAlpha = al; g.lineWidth = w * sc;
        g.beginPath(); g.moveTo(a.x * sc, a.y * sc); g.quadraticCurveTo(mx * sc, my * sc, b.x * sc, b.y * sc); g.stroke();
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

  function drawDecor(d, th) {
    const s = d.s, x = d.x, y = d.y, c = th.decorCols;
    switch (th.decor) {
      case 'eiche': {
        shadow(x + 6, y + 6, 24 * s, 10 * s);
        ctx.fillStyle = '#5a3a22'; ctx.fillRect(x - 3 * s, y - 6 * s, 6 * s, 14 * s); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x - 3 * s, y - 6 * s, 6 * s, 14 * s);
        circ(x - 9 * s, y - 14 * s, 13 * s, c[d.v % 2]); circ(x + 9 * s, y - 15 * s, 13 * s, c[(d.v + 1) % 2]); circ(x, y - 26 * s, 15 * s, c[0]);
        ctx.fillStyle = 'rgba(255,255,200,0.18)'; ctx.beginPath(); ctx.arc(x - 4 * s, y - 31 * s, 7 * s, 0, 7); ctx.fill();
        break;
      }
      case 'hochbaum': {
        shadow(x + 6, y + 6, 18 * s, 8 * s);
        ctx.fillStyle = '#c8c0b0'; ctx.fillRect(x - 3 * s, y - 10 * s, 6 * s, 18 * s); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x - 3 * s, y - 10 * s, 6 * s, 18 * s);
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x, y - (16 + i * 14) * s, (16 - i * 3) * s, 10 * s, 0, 0, 7); ctx.fillStyle = c[i % 2]; ctx.fill(); outline(2); }
        ctx.fillStyle = c[2]; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(G.S.time * 2 + d.seed * 10);
        ctx.beginPath(); ctx.arc(x + 8 * s, y - 20 * s, 2.5 * s, 0, 7); ctx.arc(x - 7 * s, y - 34 * s, 2 * s, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        break;
      }
      case 'totbaum': {
        if (d.v === 0) { // Grabstein
          shadow(x + 3, y + 4, 12 * s, 5 * s);
          ctx.beginPath(); ctx.moveTo(x - 8 * s, y); ctx.lineTo(x - 8 * s, y - 14 * s); ctx.arc(x, y - 14 * s, 8 * s, Math.PI, 0); ctx.lineTo(x + 8 * s, y); ctx.closePath();
          ctx.fillStyle = '#6a6a72'; ctx.fill(); outline(2);
          ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - 18 * s); ctx.lineTo(x, y - 8 * s); ctx.moveTo(x - 4 * s, y - 14 * s); ctx.lineTo(x + 4 * s, y - 14 * s); ctx.stroke();
        } else {
          shadow(x + 6, y + 4, 16 * s, 6 * s);
          ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineWidth = 7 * s;
          const br = () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 26 * s); ctx.moveTo(x, y - 16 * s); ctx.lineTo(x - 12 * s, y - 30 * s); ctx.moveTo(x, y - 22 * s); ctx.lineTo(x + 13 * s, y - 34 * s); ctx.moveTo(x - 6 * s, y - 24 * s); ctx.lineTo(x - 4 * s, y - 38 * s); ctx.stroke(); };
          br(); ctx.strokeStyle = '#3a3430'; ctx.lineWidth = 4 * s; br(); ctx.lineCap = 'butt';
        }
        break;
      }
      case 'fels': {
        shadow(x + 5, y + 4, 18 * s, 7 * s);
        if (d.v === 2) { // Knochen
          ctx.strokeStyle = INK; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x - 12 * s, y - 2 * s); ctx.lineTo(x + 12 * s, y - 8 * s); ctx.moveTo(x - 8 * s, y - 10 * s); ctx.lineTo(x + 10 * s, y + 2 * s); ctx.stroke();
          ctx.strokeStyle = c[2]; ctx.lineWidth = 3 * s; ctx.stroke(); ctx.lineCap = 'butt';
        } else {
          ctx.beginPath(); ctx.moveTo(x - 16 * s, y + 2 * s); ctx.lineTo(x - 12 * s, y - 12 * s); ctx.lineTo(x - 2 * s, y - 20 * s); ctx.lineTo(x + 12 * s, y - 14 * s); ctx.lineTo(x + 17 * s, y + 2 * s); ctx.closePath();
          ctx.fillStyle = c[d.v % 2]; ctx.fill(); outline(2.5);
          ctx.fillStyle = 'rgba(255,230,200,0.25)'; ctx.beginPath(); ctx.moveTo(x - 12 * s, y - 12 * s); ctx.lineTo(x - 2 * s, y - 20 * s); ctx.lineTo(x + 2 * s, y - 8 * s); ctx.closePath(); ctx.fill();
        }
        break;
      }
      case 'tanne': {
        shadow(x + 6, y + 5, 18 * s, 7 * s);
        ctx.fillStyle = '#4a3020'; ctx.fillRect(x - 3 * s, y - 6 * s, 6 * s, 10 * s);
        for (let i = 0; i < 3; i++) {
          const yy = y - 6 * s - i * 12 * s, w = (18 - i * 4) * s;
          ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x, yy - 18 * s); ctx.lineTo(x + w, yy); ctx.closePath();
          ctx.fillStyle = c[i % 2]; ctx.fill(); outline(2);
          ctx.beginPath(); ctx.moveTo(x - w * 0.45, yy - 10 * s); ctx.lineTo(x, yy - 18 * s); ctx.lineTo(x + w * 0.45, yy - 10 * s); ctx.closePath(); ctx.fillStyle = c[2]; ctx.fill();
        }
        break;
      }
      case 'lava': {
        if (d.v === 0) {
          ctx.save(); ctx.shadowColor = '#ff5a1a'; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.ellipse(x, y, 20 * s, 10 * s, 0, 0, 7); ctx.fillStyle = '#ff7a2a'; ctx.fill(); ctx.restore();
          ctx.beginPath(); ctx.ellipse(x, y, 20 * s, 10 * s, 0, 0, 7); outline(2.5);
          ctx.fillStyle = '#ffd04a'; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(G.S.time * 3 + d.seed * 9); ctx.beginPath(); ctx.ellipse(x - 4 * s, y - 2 * s, 8 * s, 3 * s, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        } else {
          shadow(x + 5, y + 4, 14 * s, 6 * s);
          ctx.beginPath(); ctx.moveTo(x - 10 * s, y + 2 * s); ctx.lineTo(x - 4 * s, y - 30 * s); ctx.lineTo(x + 2 * s, y - 10 * s); ctx.lineTo(x + 8 * s, y - 22 * s); ctx.lineTo(x + 12 * s, y + 2 * s); ctx.closePath();
          ctx.fillStyle = c[d.v % 2]; ctx.fill(); outline(2.5);
          ctx.strokeStyle = '#ff6a1a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 4 * s, y - 24 * s); ctx.lineTo(x - 2 * s, y - 6 * s); ctx.stroke();
        }
        break;
      }
    }
  }

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
      }
    }
    if (e.role === 'summon') {
      if (/Knochendrache/.test(n)) return { shape: 'dragon', col: '#d8d0b8', wing: '#8a8478', bone: true };
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
    if (look.hero) { // Krone
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

  R._drawMobile = (e) => drawMobile(e); // für Figuren-Vorschau und Tests
  function drawMobile(e) {
    const S = G.S;
    const p = e.owner >= 0 ? S.players[e.owner] : null;
    const r = e.r, face = e.face || 0;
    const pal = p ? R.palOf(p) : null;
    const lunge = e.swing > 0 && e.range < 60 ? Math.sin((e.swing / 0.22) * Math.PI) * 5 : 0;
    const bob = e.moving ? Math.abs(Math.sin((e.walkT || 0) * 1.0)) * -2 : 0;
    const x = e.x + Math.cos(face) * lunge, y = e.y + Math.sin(face) * lunge + bob;
    const look = lookOf(e, p, pal);
    const flash = e.hitT > 0;
    const swing = e.swing > 0 ? Math.sin((e.swing / 0.22) * Math.PI) * 1.4 : 0;
    const k = r * 1.15;
    shadow(e.x, e.y + r * 0.75, r * (look.shape === 'dragon' ? 1.6 : 1.05), r * 0.45);
    if (pal && pal.glow) { ctx.save(); ctx.globalAlpha = 0.22 + 0.1 * Math.sin(S.time * 3 + e.id); ctx.shadowColor = pal.glow; ctx.shadowBlur = 16; circ(x, y - r * 0.3, r * 1.15, pal.glow, 0); ctx.restore(); }
    if (e.summoned && look.shape === 'human' && !look.ghost) { ctx.save(); ctx.globalAlpha = 0.3; circ(e.x, e.y + r * 0.6, r * 0.9, p.rd.palette.trim, 0); ctx.restore(); }
    let top;
    if (look.shape === 'human') {
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
    } else { // Geschütz
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
    const sel = G.UI && G.UI.selected === e;
    if (e.hp < e.maxHp || e.kind === 'hero' || sel) bar(x - r - 2, top - (e.kind === 'hero' ? 18 : 11), r * 2 + 4, e.kind === 'hero' ? 5 : 3.5, e.hp / e.maxHp, hpCol(e));
    if (e.kind === 'hero') {
      ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeText(`${e.name} (${e.level})`, x, top - 22);
      ctx.fillStyle = '#ffe9a8'; ctx.fillText(`${e.name} (${e.level})`, x, top - 22);
    }
    if (sel) { ctx.strokeStyle = '#7aff7a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.7, r + 6, (r + 6) * 0.5, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
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

  function drawProjectile(pr) {
    ctx.save();
    switch (pr.kind) {
      case 'pfeil':
        ctx.translate(pr.x, pr.y); ctx.rotate(pr.ang || 0);
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(4, 0); ctx.stroke();
        ctx.strokeStyle = '#e8d0a0'; ctx.lineWidth = 1.5; ctx.stroke(); break;
      case 'kanone': circ(pr.x, pr.y, 5, '#2a2a2e', 2); break;
      case 'feuer': ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = 16; circ(pr.x, pr.y, 9, '#ff8a2a', 2); break;
      case 'heilung': ctx.shadowColor = '#7aff7a'; ctx.shadowBlur = 10; circ(pr.x, pr.y, 4, '#b0ffb0', 0); break;
      case 'zauber': ctx.shadowColor = pr.color; ctx.shadowBlur = 18; circ(pr.x, pr.y, 8, pr.color || '#fff', 2); break;
      default: ctx.shadowColor = pr.color || '#fff'; ctx.shadowBlur = 10; circ(pr.x, pr.y, 4.5, pr.color || '#fff', 1.5);
    }
    ctx.restore();
  }

  function drawFx(f) {
    const k = f.t / f.dur;
    ctx.save();
    switch (f.type) {
      case 'text': {
        ctx.globalAlpha = 1 - k * k;
        label(f.text, f.x, f.y - k * 30, f.color, f.big ? 15 : 11);
        break;
      }
      case 'ring': ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.6 + k * 0.6), 0, 7); ctx.stroke(); break;
      case 'blast': ctx.globalAlpha = 0.45 * (1 - k); ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.5 + k * 0.5), 0, 7); ctx.fill();
        ctx.globalAlpha = 0.9 * (1 - k); ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.stroke(); break;
      case 'boom':
        ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.arc(f.x, f.y, (f.r + 10) * (0.4 + k), 0, 7); ctx.fill();
        ctx.fillStyle = '#555'; ctx.globalAlpha = 0.6 * (1 - k);
        for (let i = 0; i < 5; i++) { const a = i * 1.3; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * f.r * k, f.y + Math.sin(a) * f.r * k - k * 20, f.r * 0.4, 0, 7); ctx.fill(); }
        break;
      case 'puff': ctx.globalAlpha = 0.6 * (1 - k); ctx.fillStyle = '#888';
        for (let i = 0; i < 4; i++) { const a = i * 1.6; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 10 * k, f.y + Math.sin(a) * 10 * k - k * 10, f.r * 0.6, 0, 7); ctx.fill(); }
        break;
      case 'spark': ctx.globalAlpha = 1 - k; ctx.fillStyle = f.color;
        for (let i = 0; i < 4; i++) { const a = i * 1.57 + k * 2; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 10, f.y + Math.sin(a) * 10 - k * 14, 2.2, 0, 7); ctx.fill(); }
        break;
      case 'mark': ctx.globalAlpha = 0.8; ctx.strokeStyle = f.color; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.stroke(); break;
      case 'meteor': { const h = (1 - k) * 500; ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = 20; circ(f.x + h * 0.4, f.y - h, 16, '#ff7a2a', 2.5); break; }
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
    const k = Math.min(1, c.t / 0.35); // Umkippen
    const fade = c.t > 10 ? 1 - (c.t - 10) / 4 : 1;
    ctx.save(); ctx.globalAlpha = Math.max(0, fade);
    ctx.translate(c.x, c.y); ctx.rotate(c.face + Math.PI / 2 * k);
    const r = c.r;
    ctx.fillStyle = shade(c.col, -0.35);
    ctx.beginPath(); ctx.ellipse(0, 0, r * (1 + 0.25 * k), r * (1 - 0.4 * k), 0, 0, 7); ctx.fill(); outline(2);
    ctx.fillStyle = shade(c.col, -0.15); ctx.beginPath(); ctx.arc(r * 0.9 * k, 0, r * 0.45, 0, 7); ctx.fill(); outline(1.5);
    if (c.owner >= 0) { ctx.strokeStyle = G.S.players[c.owner].color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0.5, 2.6); ctx.stroke(); }
    ctx.restore();
  }
  function drawParticle(q) {
    ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y - q.z, q.s, 0, 7); ctx.fill();
  }

  // -------------------------------------------------------------------------
  // Hauptzeichnung
  R.draw = function () {
    const S = G.S; if (!S) return;
    const cam = R.cam, z = cam.z;
    const vw = canvas.clientWidth / z, vh = canvas.clientHeight / z;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0d0b09'; ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, -cam.x * z * dpr, -cam.y * z * dpr);
    if (ground) ctx.drawImage(ground, 0, 0, S.w, S.h);
    const inView = (x, y, m) => x > cam.x - m && x < cam.x + vw + m && y > cam.y - m && y < cam.y + vh + m;

    // Lager-Beschriftungen
    for (const c of S.camps) {
      if (!inView(c.x, c.y, 120)) continue;
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
    for (const d of S.decals) if (inView(d.x, d.y, 60)) drawDecal(d);
    for (const c of S.corpses) if (inView(c.x, c.y, 40)) drawCorpse(c);

    // Tiefensortierung: Deko, Gebäude, Einheiten, Arbeiter, Tiere
    const th = G.THEMES[S.theme];
    const list = [];
    for (const d of S.decor) if (inView(d.x, d.y, 60)) list.push({ y: d.y, d });
    for (const s of S.sites) if ((!s.b || s.b.dead) && inView(s.x, s.y, 80)) list.push({ y: s.y, site: s });
    for (const p of S.players) if (p.alive) for (const w of p.wv) if (inView(w.x, w.y, 20)) list.push({ y: w.y, w, p });
    for (const c of S.critters) if (!c.fly && inView(c.hx || c.x, c.hy || c.y, 120)) list.push({ y: c.y, c });
    for (const e of S.ents) if (!e.dead && inView(e.x, e.y, 80)) list.push({ y: e.y + (e.kind === 'building' ? e.size * T / 2 - 10 : 0), e });
    for (const s of S.shops) if (inView(s.x, s.y, 80)) list.push({ y: s.y + 10, s });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.d) drawDecor(it.d, th);
      else if (it.s) drawShop(it.s);
      else if (it.site) drawSite(it.site);
      else if (it.w) drawWorker(it.w, it.p);
      else if (it.c) drawCritter(it.c);
      else if (it.e.kind === 'building') drawBuilding(it.e);
      else drawMobile(it.e);
    }
    for (const q of S.parts) if (inView(q.x, q.y, 20)) drawParticle(q);
    for (const pr of S.proj) if (inView(pr.x, pr.y, 40)) drawProjectile(pr);
    for (const c of S.critters) if (c.fly && inView(c.x, c.y, 80)) drawCritter(c);
    for (const f of S.fx) if (inView(f.x, f.y, 200)) drawFx(f);

    // Bauvorschau
    const UI = G.UI;
    if (UI && UI.placing) {
      const type = UI.placing;
      let pos = G.snap(type, R.mouse.wx, R.mouse.wy);
      if (G.BUILDINGS[type].outpost) { const st = G.freeSiteNear(R.mouse.wx, R.mouse.wy, 140); if (st) pos = { x: st.x, y: st.y }; for (const s2 of S.sites) if (!s2.b || s2.b.dead) { ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(s2.x, s2.y, 60, 0, 7); ctx.stroke(); ctx.setLineDash([]); } }
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
      ctx.strokeStyle = '#7aff7a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.strokeRect(b.x - hs - 3, b.y - hs - 3, hs * 2 + 6, hs * 2 + 6); ctx.setLineDash([]);
    }
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
    for (const c of S.camps) { m.fillStyle = c.left > 0 ? '#e0a030' : '#555'; m.beginPath(); m.arc(c.x * sx, c.y * sy, 3, 0, 7); m.fill(); }
    for (const s of S.shops) { m.fillStyle = '#ffe066'; m.fillRect(s.x * sx - 3, s.y * sy - 3, 6, 6); }
    for (const s of S.sites) { m.strokeStyle = '#ffd23a'; m.lineWidth = 1.5; m.beginPath(); m.arc(s.x * sx, s.y * sy, 4, 0, 7); m.stroke(); }
    for (const e of S.ents) {
      if (e.dead || e.kind === 'creep') continue;
      const p = S.players[e.owner];
      m.fillStyle = p.color;
      if (e.kind === 'building') { const q = e.type === 'mauer' ? 1 : 2.5; m.fillRect(e.x * sx - q, e.y * sy - q, q * 2, q * 2); }
      else if (e.kind === 'hero') { m.beginPath(); m.arc(e.x * sx, e.y * sy, 3.5, 0, 7); m.fill(); m.strokeStyle = '#fff'; m.lineWidth = 1; m.stroke(); }
      else m.fillRect(e.x * sx - 1, e.y * sy - 1, 2, 2);
    }
    m.strokeStyle = '#fff'; m.lineWidth = 1;
    m.strokeRect(R.cam.x * sx, R.cam.y * sy, R.viewW() * sx, R.viewH() * sy);
  };
})();
