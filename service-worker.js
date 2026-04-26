/**
 * Mystická Hvězda - Service Worker
 * Provides offline caching with stale-while-revalidate strategy
 */

const CACHE_NAME = 'mysticka-hvezda-09f923c98026';
const MAX_RUNTIME_CACHE_SIZE = 150;
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/cenik.html',
    '/rocni-horoskop.html',
    '/css/style.v2.min.css',
    '/css/profile-refresh.css',
    '/css/pages/index.css',
    '/css/pages/cenik.css',
    '/css/pages/rocni-horoskop.css',
    '/js/dist/analytics.js',
    '/js/dist/main.js',
    '/js/dist/components.js',
    '/js/dist/api-config.js',
    '/js/dist/templates.js',
    '/js/dist/auth-client.js',
    '/js/dist/cenik.js',
    '/js/dist/index-lazy-load.js',
    '/js/gemini-service.js',
    '/js/dist/mobile-nav.js',
    '/js/dist/page-extras.js',
    '/js/dist/premium-gates.js',
    '/js/dist/retention.js',
    '/js/dist/rocni-horoskop.js',
    '/img/logo-3d.webp',
    '/img/hero-3d.webp',
    '/img/bg-cosmic-hd.webp',
    '/img/bg-cosmic-mobile.webp',
    '/img/icon-192.webp',
    '/img/icon-192.png',
    '/data/tarot-cards.json',
    '/data/runes.json',
    '/js/dist/runes.js',
    '/js/dist/platby-init.js',
    '/js/dist/analytics-page-init.js',
    '/manifest.json',
    '/offline.html'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Trim cache to max size
async function trimCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
        // Delete oldest entries (first in, first out)
        const toDelete = keys.slice(0, keys.length - maxItems);
        await Promise.all(toDelete.map(key => cache.delete(key)));
    }
}

// Fetch - stale-while-revalidate for cached content
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests, API calls, and external domains (analytics, GTM, Stripe...)
    if (
        event.request.method !== 'GET' ||
        event.request.url.includes('/api/') ||
        !event.request.url.startsWith(self.location.origin)
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Start network fetch regardless (for revalidation)
                const networkFetch = fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful or non-basic responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Update cache in background
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                                trimCache(CACHE_NAME, MAX_RUNTIME_CACHE_SIZE);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Network failed - serve offline fallback for HTML
                        if (!cachedResponse) {
                            const accept = event.request.headers.get('accept');
                            if (accept && accept.includes('text/html')) {
                                return caches.match('/offline.html');
                            }
                        }
                        return cachedResponse;
                    });

                // Return cached version immediately if available (stale-while-revalidate)
                // Otherwise wait for network
                return cachedResponse || networkFetch;
            })
    );
});

// Push notification handler
self.addEventListener('push', (event) => {
    let data = { title: 'Mystická Hvězda 🌙', body: 'Vaše hvězdná energie na dnešek čeká.', url: '/', icon: '/img/icon-192.webp' };
    
    if (event.data) {
        try { data = { ...data, ...event.data.json() }; } catch {}
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.icon,
            tag: 'daily-horoscope',
            renotify: true,
            data: { url: data.url }
        })
    );
});

// Notification click → open the app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(event.notification.data?.url || '/');
                    return client.focus();
                }
            }
            return clients.openWindow(event.notification.data?.url || '/');
        })
    );
});
