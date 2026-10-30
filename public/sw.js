/* Service Worker — M8.5 (PWA offline cache + push notification) */
const VERSION = 'v1';
const CACHE_STATIC = `tk-static-${VERSION}`;
const CACHE_RUNTIME = `tk-runtime-${VERSION}`;

/* Halaman shell offline (fallback navigasi). */
const APP_SHELL = ['/offline', '/manifest.json', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png'];

/* Cache saat install: aset yang pasti dibutuhkan untuk menampilkan shell. */
const PRECACHE_ASSETS = [
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith('tk-') && key !== CACHE_STATIC && key !== CACHE_RUNTIME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* Cache-first untuk aset statis (dengan hash versi, aman). */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Hanya same-origin & GET.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Jangan cache API — selalu network.
  if (url.pathname.startsWith('/api/')) return;

  // Navigasi dokumen: network-first, fallback cache, fallback offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Simpan salinan untuk offline (kalau masih bisa dibuka).
          const copy = response.clone();
          caches.open(CACHE_RUNTIME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match('/offline');
          })
        )
    );
    return;
  }

  // Aset statis (gambar, css, js dengan contenthash): cache-first.
  if (
    url.pathname.startsWith('/_next/static/') ||
    /\.(png|webp|jpg|jpeg|gif|svg|ico|woff2?|ttf|otf|eot|css|js)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_RUNTIME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
});

/* Push notification */
self.addEventListener('push', (event) => {
  let data = { title: 'Teman Kos', body: '', icon: '/icon-192.png' };

  try {
    const parsed = event.data ? event.data.json() : {};
    data = { ...data, ...parsed };
  } catch {
    // Payload bukan JSON — fallback.
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge || '/icon-192.png',
      tag: data.tag || 'tk-notif',
      data: data.data || {},
    })
  );
});

/* Klik notifikasi → buka URL (default /home). */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/home';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
