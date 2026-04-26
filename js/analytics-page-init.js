import { initAnalytics, trackPageLoadMetrics } from './ga-tracking.js';

document.addEventListener('DOMContentLoaded', () => {
    initAnalytics();
    trackPageLoadMetrics();
    if (window.MH_DEBUG) {
        console.debug('[GA] Tracking initialized for:', window.location.pathname);
    }
});
