// ROOM PWA - Service Worker
// Version this so you can force-update when you change files
const CACHE_NAME = 'room-app-v1';

// All the files that make up your app
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/index.css',
  '/index.js',
  '/loginnsignup.html',
  '/loginnsignup.css',
  '/loginnsignup.js',
  '/homev1.html',
  '/homev1.css',
  '/homev1.js',
  '/home.html',
  '/home.css',
  '/home.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@400;500&display=swap'
];

// =====================
// INSTALL - Cache files
// =====================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing ROOM service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app files');
      // Cache what we can - don't fail if some external fonts can't cache
      return cache.addAll(FILES_TO_CACHE).catch((err) => {
        console.warn('[SW] Some files could not be cached:', err);
      });
    })
  );
  // Force this SW to become active immediately
  self.skipWaiting();
});

// ========================
// ACTIVATE - Clean old caches
// ========================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating ROOM service worker...');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  // Take control of all open pages immediately
  self.clients.claim();
});

// ================================
// FETCH - Serve from cache, fallback to network
// ================================
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network and cache it
      return fetch(event.request).then((networkResponse) => {
        // Don't cache bad responses
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }

        // Clone because response can only be consumed once
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // If both cache and network fail, show offline page for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
