// DCMS / Deep Blue - PWA Service Worker
// Bump CACHE_VERSION on each deploy to invalidate old caches and show updates

const CACHE_VERSION = 'dcms-v2-20260218';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Skip caching HTML and main bundle so deploys reach users immediately
const STATIC_ASSETS = ['/manifest.json'];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) =>
            (cacheName.startsWith('deep-blue-diver-') || cacheName.startsWith('dcms-')) &&
            cacheName !== STATIC_CACHE &&
            cacheName !== DYNAMIC_CACHE
          )
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first for HTML/JS/CSS so deploys take effect; cache for offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin || request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  const isHtml = request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/';
  const isJsCss = /\.(js|css)(\?|$)/.test(url.pathname);

  // Network first for HTML and app bundle so updates deploy immediately
  if (isHtml || isJsCss) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || (isHtml ? caches.match('/index.html') : null)))
    );
    return;
  }

  // Cache first for static assets (icons, manifest)
  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
        }
        return response;
      })
    )
  );
});

// Handle background sync (for offline booking submissions)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncBookings());
  }
});

async function syncBookings() {
  // Placeholder: sync pending bookings when connection is restored
}

// Handle push notifications (for booking confirmations, reminders)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update from DCMS',
    icon: '/pwa-icons/icon-192x192.png',
    badge: '/pwa-icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'deep-blue-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('DCMS', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/my-account')
  );
});

