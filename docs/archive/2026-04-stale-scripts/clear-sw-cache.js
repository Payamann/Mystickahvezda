// Service Worker Cache Buster
// Run this in browser console (F12) to clear all service worker caches
// Useful during development when frontend files are updated

(async function clearAllCaches() {
    console.log('🧹 Clearing service worker caches...');

    // 1. Unregister all service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
        await registration.unregister();
        console.log('✅ Unregistered:', registration.scope);
    }

    // 2. Clear all cache storage
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            console.log('✅ Deleted cache:', cacheName);
        }
    }

    console.log('✅ All caches cleared! Reloading page...');

    // 3. Hard reload
    location.reload(true);
})();
