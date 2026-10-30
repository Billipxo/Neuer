'use strict';
// Darstellung: Comic-Look mit kräftigen Konturen, einfacher Schattierung und Heimatkarten.
(function () {
  const R = (G.R = {});
  const T = G.TILE;
  const INK = '#1b1410';
  let canvas, ctx, dpr = 1, ground = null, groundScale = 0.5;
  R.cam = { x: 0, y: 0, z: 1 };
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
    dpr = Math.min(2, window.devicePixelRatio || 1);
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

  // -------------------------------------------------------------------------
  // Gebäude
  function drawBuilding(b) {
    const S = G.S, p = S.players[b.owner], pal = p.rd.palette;
    const hs = b.size * T / 2, x = b.x, y = b.y;
    const constructing = b.level === 0;
    ctx.save();
    if (constructing) ctx.globalAlpha = 0.55 + 0.4 * (b.upgrading ? b.upgrading.t / b.upgrading.total : 0);
    shadow(x + 6, y + hs * 0.55, hs * 1.05, hs * 0.5);
    const flash = b.hitT > 0;
    if (b.type === 'turm' || b.type === 'kanone') {
      // Rundturm
      const r = hs * 0.95;
      ctx.fillStyle = shade(pal.wall, -0.25); ctx.beginPath(); ctx.ellipse(x, y + 4, r, r * 0.8, 0, 0, 7); ctx.fill(); outline();
      ctx.fillStyle = flash ? '#fff' : pal.wall; ctx.beginPath(); ctx.ellipse(x, y - 8, r * 0.9, r * 0.72, 0, 0, 7); ctx.fill(); outline();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.fillStyle = shade(pal.wall, 0.15); ctx.fillRect(x + Math.cos(a) * r * 0.7 - 2.5, y - 8 + Math.sin(a) * r * 0.55 - 2.5, 5, 5); }
      if (b.type === 'kanone') {
        const S2 = G.S; const tgt = S2 && b.lastAng !== undefined ? b.lastAng : -Math.PI / 4;
        ctx.save(); ctx.translate(x, y - 10); ctx.rotate(tgt); ctx.fillStyle = '#2a2a2e'; ctx.fillRect(0, -3.5, 14, 7); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(0, -3.5, 14, 7); ctx.restore();
        circ(x, y - 10, 6, '#3a3a40', 2);
      } else {
        ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - 14); ctx.lineTo(x, y - 30); ctx.lineTo(x + r * 0.6, y - 14); ctx.closePath(); ctx.fillStyle = pal.roof; ctx.fill(); outline();
      }
    } else {
      // Fundament
      ctx.fillStyle = shade(pal.wall, -0.35);
      roundRect(x - hs + 2, y - hs + 6, hs * 2 - 4, hs * 2 - 6, 6); ctx.fill(); outline();
      // Mauern
      ctx.fillStyle = flash ? '#fff' : pal.wall;
      roundRect(x - hs + 6, y - hs * 0.35, hs * 2 - 12, hs * 1.15, 4); ctx.fill(); outline();
      // Dach
      ctx.beginPath();
      if (b.type === 'sanktum' || b.type === 'beschwoerung') {
        ctx.ellipse(x, y - hs * 0.35, hs * 0.85, hs * 0.75, 0, Math.PI, 0); ctx.closePath();
      } else {
        ctx.moveTo(x - hs + 2, y - hs * 0.3); ctx.lineTo(x - hs * 0.55, y - hs * 1.05); ctx.lineTo(x + hs * 0.55, y - hs * 1.05); ctx.lineTo(x + hs - 2, y - hs * 0.3); ctx.closePath();
      }
      ctx.fillStyle = flash ? '#fff' : pal.roof; ctx.fill(); outline();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(x - hs * 0.55, y - hs * 1.0); ctx.lineTo(x - hs * 0.1, y - hs * 1.0); ctx.lineTo(x - hs * 0.4, y - hs * 0.35); ctx.lineTo(x - hs + 8, y - hs * 0.35); ctx.closePath(); ctx.fill();
      // Tür
      ctx.fillStyle = INK; roundRect(x - 6, y + hs * 0.35, 12, hs * 0.45, 5); ctx.fill();
      // Symbol
      buildingIcon(b.type, x, y + hs * 0.05, b.size === 3 ? 1.5 : 1.05, pal.trim);
      if (b.type === 'beschwoerung' && !constructing) {
        ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * Math.sin(S.time * 3); ctx.strokeStyle = '#c070ff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(x, y + hs * 0.6, hs * 0.9, hs * 0.35, 0, 0, 7); ctx.stroke(); ctx.restore();
      }
      if (b.type === 'schmiede' && !constructing) {
        ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#888';
        const t = S.time * 0.8;
        for (let i = 0; i < 3; i++) { const k = (t + i / 3) % 1; ctx.beginPath(); ctx.arc(x + hs * 0.5 + k * 10, y - hs * 1.1 - k * 30, 4 + k * 6, 0, 7); ctx.globalAlpha = 0.5 * (1 - k); ctx.fill(); }
        ctx.restore();
      }
    }
    // Banner in Spielerfarbe
    const fx = x + hs - 8, fy = y - hs * (b.size === 1 ? 1.4 : 1.0);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy + 16); ctx.lineTo(fx, fy - 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx, fy - 6); ctx.lineTo(fx + 12, fy - 2 + Math.sin(S.time * 4 + b.id) * 1.5); ctx.lineTo(fx, fy + 3); ctx.closePath();
    ctx.fillStyle = p.color; ctx.fill(); outline(1.5);
    ctx.restore();

    // Gerüst
    if (constructing) {
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * hs * 0.7, y + hs * 0.8); ctx.lineTo(x + i * hs * 0.7, y - hs); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x - hs * 0.8, y); ctx.lineTo(x + hs * 0.8, y); ctx.moveTo(x - hs * 0.8, y - hs * 0.6); ctx.lineTo(x + hs * 0.8, y - hs * 0.6); ctx.stroke();
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
  // Einheiten
  const STAFF_COL = { magier: '#ff8a3a', heiler: '#7aff7a', support: '#ffe066', beschwoerer: '#c070ff', summon: '#9ad8ff' };
  function drawMobile(e) {
    const S = G.S;
    const p = e.owner >= 0 ? S.players[e.owner] : null;
    const r = e.r, x = e.x, y = e.y;
    const bob = e.moving ? Math.sin(S.time * 12 + e.id) * 1.2 : 0;
    const bodyCol = e.kind === 'creep' ? e.def.color : p.rd.color;
    const face = e.face || 0;
    shadow(x, y + r * 0.7, r * 1.0, r * 0.45);
    if (e.summoned) { ctx.save(); ctx.globalAlpha = 0.35; circ(x, y, r + 4, p.rd.palette.trim, 0); ctx.restore(); }
    if (e.stun > 0) { ctx.save(); ctx.strokeStyle = '#9ad8ff'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(x, y - r - 6, 7, S.time * 5, S.time * 5 + 5); ctx.stroke(); ctx.restore(); }

    // Umhang des Helden
    if (e.kind === 'hero') {
      ctx.save(); ctx.translate(x, y + bob); ctx.rotate(face + Math.PI);
      ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.quadraticCurveTo(r * 1.9, 0, 0, r * 0.8); ctx.closePath();
      ctx.fillStyle = p.color; ctx.fill(); outline(2.5); ctx.restore();
    }
    // Drachenflügel
    if (e.kind === 'creep' && e.def === G.CREEPS.drache) {
      const flap = Math.sin(S.time * 4) * 0.25;
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(face + sgn * (Math.PI / 2 + flap));
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 2.0, -r * 0.6); ctx.lineTo(r * 1.6, r * 0.2); ctx.lineTo(r * 1.0, r * 0.1); ctx.closePath();
        ctx.fillStyle = '#7a2420'; ctx.fill(); outline(2.5); ctx.restore();
      }
    }
    // Waffe hinten (Schild/Stab)
    const role = e.kind === 'hero' ? (e.def.ranged ? 'magier' : 'nahkampf') : e.role;
    const swing = e.swing > 0 ? Math.sin((e.swing / 0.18) * Math.PI) * 0.9 : 0;
    ctx.save(); ctx.translate(x, y + bob); ctx.rotate(face);
    ctx.lineCap = 'round';
    if (e.kind !== 'creep') {
      if (role === 'nahkampf' || role === 'tank' || (role === 'summon' && e.range < 60)) {
        ctx.save(); ctx.rotate(-0.6 + swing);
        ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(r * 0.4, r * 0.5); ctx.lineTo(r * 1.7, r * 0.5); ctx.stroke();
        ctx.strokeStyle = '#d8dce0'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
      } else if (role === 'fernkampf') {
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(r * 0.7, 0, r * 0.9, -1.2, 1.2); ctx.stroke();
        ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 2; ctx.stroke();
      } else {
        ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(r * 0.3, r * 0.8); ctx.lineTo(r * 0.9, -r * 1.2); ctx.stroke();
        ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 2; ctx.stroke();
        ctx.save(); ctx.shadowColor = STAFF_COL[role] || '#fff'; ctx.shadowBlur = 8; circ(r * 0.9, -r * 1.25, 3.5, STAFF_COL[role] || '#fff', 1.5); ctx.restore();
      }
    } else {
      // Krallen/Klauen der Monster
      ctx.fillStyle = shade(bodyCol, -0.3);
      ctx.beginPath(); ctx.arc(r * 0.85, -r * 0.45, r * 0.32, 0, 7); ctx.arc(r * 0.85, r * 0.45, r * 0.32, 0, 7); ctx.fill(); outline(1.8);
    }
    ctx.restore();

    // Körper
    const flash = e.hitT > 0;
    circ(x, y + bob, r, flash ? '#ffffff' : bodyCol, e.kind === 'hero' ? 3 : 2.5);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y + bob, r, 0, 7); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.arc(x + r * 0.45, y + bob + r * 0.45, r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(x - r * 0.35, y + bob - r * 0.4, r * 0.45, 0, 7); ctx.fill();
    ctx.restore();
    if (p) { ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y + bob, r - 2.5, 0.3, Math.PI - 0.3); ctx.stroke(); }
    // Gesicht / Augen in Blickrichtung
    const ex = Math.cos(face) * r * 0.45, ey = Math.sin(face) * r * 0.45;
    const eyeCol = e.kind === 'creep' ? '#ffdd44' : (p.race === 'untote' ? '#7aff9a' : p.race === 'daemonen' ? '#ffb030' : '#ffffff');
    for (const s of [-1, 1]) {
      const ox = Math.cos(face + s * 0.5) * r * 0.5, oy = Math.sin(face + s * 0.5) * r * 0.5;
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + ox, y + bob + oy - 1, Math.max(1.6, r * 0.14), 0, 7); ctx.fill();
      ctx.fillStyle = eyeCol; ctx.beginPath(); ctx.arc(x + ox + ex * 0.08, y + bob + oy - 1.4, Math.max(0.8, r * 0.07), 0, 7); ctx.fill();
    }
    if (e.kind === 'unit' && e.role !== 'summon') roleIcon(e.role, x - ex * 0.6, y + bob - ey * 0.6 + 1, r / 13, 'rgba(255,255,255,0.85)');
    if (e.kind === 'hero') {
      // Krone
      ctx.beginPath(); const cy = y + bob - r - 2;
      ctx.moveTo(x - 8, cy + 4); ctx.lineTo(x - 8, cy - 4); ctx.lineTo(x - 4, cy); ctx.lineTo(x, cy - 6); ctx.lineTo(x + 4, cy); ctx.lineTo(x + 8, cy - 4); ctx.lineTo(x + 8, cy + 4); ctx.closePath();
      ctx.fillStyle = '#ffd23a'; ctx.fill(); outline(1.8);
    }
    // Stufe
    if (e.kind === 'unit' && e.level > 1) {
      for (let i = 0; i < e.level - 1; i++) { ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(x - (e.level - 2) * 3 + i * 6, y - r - 4, 2.2, 0, 7); ctx.fill(); outline(1); }
    }
    // Lebensbalken
    const sel = G.UI && G.UI.selected === e;
    if (e.hp < e.maxHp || e.kind === 'hero' || sel) bar(x - r - 2, y - r - (e.kind === 'hero' ? 16 : 10), r * 2 + 4, e.kind === 'hero' ? 5 : 3.5, e.hp / e.maxHp, hpCol(e));
    if (e.kind === 'hero') {
      ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeText(`${e.name} (${e.level})`, x, y - r - 20);
      ctx.fillStyle = '#ffe9a8'; ctx.fillText(`${e.name} (${e.level})`, x, y - r - 20);
    }
    if (sel) { ctx.strokeStyle = '#7aff7a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.ellipse(x, y + r * 0.6, r + 6, (r + 6) * 0.5, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
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

    // Tiefensortierung: Deko, Gebäude, Einheiten
    const th = G.THEMES[S.theme];
    const list = [];
    for (const d of S.decor) if (inView(d.x, d.y, 60)) list.push({ y: d.y, d });
    for (const e of S.ents) if (!e.dead && inView(e.x, e.y, 80)) list.push({ y: e.y + (e.kind === 'building' ? e.size * T / 2 - 10 : 0), e });
    for (const s of S.shops) if (inView(s.x, s.y, 80)) list.push({ y: s.y + 10, s });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.d) drawDecor(it.d, th);
      else if (it.s) drawShop(it.s);
      else if (it.e.kind === 'building') drawBuilding(it.e);
      else drawMobile(it.e);
    }
    for (const pr of S.proj) if (inView(pr.x, pr.y, 40)) drawProjectile(pr);
    for (const f of S.fx) if (inView(f.x, f.y, 200)) drawFx(f);

    // Bauvorschau
    const UI = G.UI;
    if (UI && UI.placing) {
      const type = UI.placing;
      const pos = G.snap(type, R.mouse.wx, R.mouse.wy);
      const ok = G.canPlace(me, type, pos.x, pos.y) && !G.buildingCheck(me, type);
      const hs = G.BUILDINGS[type].size * T / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(me.base.x, me.base.y, G.BASE_RADIUS, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = ok ? 'rgba(80,255,80,0.35)' : 'rgba(255,60,60,0.35)';
      ctx.fillRect(pos.x - hs, pos.y - hs, hs * 2, hs * 2);
      ctx.strokeStyle = ok ? '#6f6' : '#f55'; ctx.lineWidth = 2; ctx.strokeRect(pos.x - hs, pos.y - hs, hs * 2, hs * 2);
      buildingIcon(type, pos.x, pos.y, 1.2, '#fff');
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
    for (const e of S.ents) {
      if (e.dead || e.kind === 'creep') continue;
      const p = S.players[e.owner];
      m.fillStyle = p.color;
      if (e.kind === 'building') m.fillRect(e.x * sx - 2.5, e.y * sy - 2.5, 5, 5);
      else if (e.kind === 'hero') { m.beginPath(); m.arc(e.x * sx, e.y * sy, 3.5, 0, 7); m.fill(); m.strokeStyle = '#fff'; m.lineWidth = 1; m.stroke(); }
      else m.fillRect(e.x * sx - 1, e.y * sy - 1, 2, 2);
    }
    m.strokeStyle = '#fff'; m.lineWidth = 1;
    m.strokeRect(R.cam.x * sx, R.cam.y * sy, R.viewW() * sx, R.viewH() * sy);
  };
})();
