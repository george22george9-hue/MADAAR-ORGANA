// ====================================================================
// ORGANA — Service Worker for Progressive Web App & Push Notifications
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

const CACHE_NAME = 'organa-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA initial caching skipped for some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for navigation and static files
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Avoid caching dynamic database API endpoints
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache static chunks and images on the fly
        if (
          networkResponse.status === 200 &&
          (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Fallback for HTML navigation
        if (event.request.mode === 'navigate') {
          const cachedHome = await caches.match('/');
          if (cachedHome) return cachedHome;
        }
        return new Response('Network offline', { status: 503, statusText: 'Offline' });
      })
  );
});

// ====================================================================
// Web Push Notifications — Wakes up phone even when app is closed!
// ====================================================================

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'كنيسة مارجرجس بسندبيس',
        body: event.data.text() || 'لديك رسالة جديدة في المنظومة.',
      };
    }
  }

  const title = data.title || 'كنيسة الشهيد العظيم مارجرجس بسندبيس';
  const options = {
    body: data.body || 'لديك إشعار جديد في منظومة الخدمة.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag || 'organa-push',
    renotify: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/dashboard',
    },
    dir: 'rtl',
    lang: 'ar',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
