if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(() => {
                if (window.MH_DEBUG) console.debug('Service Worker registered');
            })
            .catch(err => {
                if (window.MH_DEBUG) console.warn('SW registration failed:', err);
            });
    });
}
