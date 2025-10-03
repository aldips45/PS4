// sw.js (letakkan di /PS4/sw.js)
const CACHE_NAME = 'lapse-cache-v1';

// Hitung base path otomatis dari lokasi sw.js, misal '/PS4/'
const BASE_PATH = new URL('.', self.location).pathname;

// Daftar asset core relatif terhadap BASE_PATH.
// Tambahkan asset lain (images, fonts, css) sesuai repositorimu.
const CORE_ASSETS = [
  BASE_PATH,                      // maps to /PS4/ (index)
  BASE_PATH + 'index.html',
  BASE_PATH + 'cache.html',
  BASE_PATH + 'sw.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', event => {
  // Claim clients so page immediately controlled by SW
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', async (event) => {
  const data = event.data || {};
  if (data.type === 'DOWNLOAD_OFFLINE') {
    const clientsList = await self.clients.matchAll({includeUncontrolled:true});
    const cache = await caches.open(CACHE_NAME);
    for (let i = 0; i < CORE_ASSETS.length; i++) {
      try {
        await cache.add(CORE_ASSETS[i]);
        const pct = Math.round((i + 1) / CORE_ASSETS.length * 100);
        for (const client of clientsList) {
          client.postMessage({type:'CACHE_PROGRESS', percent: pct, message: `${pct}%`});
        }
      } catch (err) {
        for (const client of clientsList) {
          client.postMessage({type:'CACHE_PROGRESS', percent: 0, message: `Failed: ${CORE_ASSETS[i]}`});
        }
      }
    }
    for (const client of clientsList) {
      client.postMessage({type:'CACHE_COMPLETE', message: 'Offline cached'});
    }
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // For navigations (HTML), try network first then fallback to cache.html
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'))) {
    event.respondWith((async () => {
      try {
        const networkResp = await fetch(req);
        // update cache for this page
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, networkResp.clone().catch(()=>{}));
        return networkResp;
      } catch (err) {
        // fallback to offline page in base path
        const cached = await caches.match(BASE_PATH + 'cache.html');
        return cached || new Response('Offline', {status:503, statusText:'Offline'});
      }
    })());
    return;
  }

  // For other requests: cache-first, then network
  event.respondWith(caches.match(req).then(resp => resp || fetch(req)));
});
