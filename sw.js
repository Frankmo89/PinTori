/* PinTori service worker — cache static shell; network-first for HTML,
   cache-first for vendored ML/libs (large, immutable in a release). */
const CACHE_VERSION = 'pintori-v2';
const PRECACHE = [
  './',
  './index.html',
  './styles/tokens.css',
  './styles/base.css',
  './styles/editor.css',
  './styles/modal.css',
  './styles/hero.css',
  './js/main.js',
  './js/hero.js',
  './js/i18n.js',
  './js/state.js',
  './js/constants.js',
  './js/geometry.js',
  './js/render.js',
  './assets/favicon.svg',
  './assets/manifest.webmanifest',
  './assets/demo-face.jpg',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

const VENDOR_PREFIXES = ['./vendor/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isVendor(url) {
  try {
    const path = new URL(url).pathname;
    return path.includes('/vendor/');
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (isVendor(request.url)) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }

  // Network-first for app shell / modules so deploys show up quickly.
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
  );
});
