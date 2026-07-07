// Offline shell for the owner app + wife view. Firebase/Aladhan stay network-first.
const CACHE = 'ayyub-v2';
const CORE = [
  './', './index.html', './wife.html', './css/styles.css', './manifest.webmanifest',
  './js/app.js', './js/wife.js', './js/store.js', './js/engine.js', './js/prayer.js',
  './js/util.js', './js/config.js', './js/ui-kit.js', './js/ui-today.js', './js/ui-week.js',
  './js/ui-life.js', './js/ui-private.js', './js/pin.js', './icon-192.png', './icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(CORE.map((u) => cache.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return; // Firebase/Aladhan → let the network handle it
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;
    try {
      const res = await fetch(e.request);
      const cache = await caches.open(CACHE);
      cache.put(e.request, res.clone());
      return res;
    } catch (_e) {
      return caches.match('./index.html');
    }
  })());
});
