// Offline-Cache für „Arena der Verdammten“.
// Die Spielseite wird zuerst aus dem Netz geladen (damit Updates ankommen) und fällt offline auf den Cache zurück.
const CACHE = 'arena-v11';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg', './css/style.css',
  './js/data.js', './js/core.js', './js/world.js', './js/input.js', './js/ui.js', './js/combat.js', './js/sprites.js', './js/render.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;

  if (isPage) {
    // Netz zuerst, Cache als Rückfall
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Cache zuerst (Schriften, Icon, Manifest), im Hintergrund aktualisieren
  e.respondWith(caches.match(req).then(cached => {
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => cached);
    return cached || net;
  }));
});
