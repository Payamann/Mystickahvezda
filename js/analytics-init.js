/**
 * Google Analytics 4 Initialization (Lazy-loaded)
 * Externalized from index.html to support strict CSP (no unsafe-inline).
 * Deferred until after page load to prevent blocking critical rendering path.
 */

(function () {
    const GA_ID = 'G-H22CGHF34K';

    // Initialize dataLayer and gtag stub before script loads
    window.dataLayer = window.dataLayer || [];
    function gtag() {
        window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    // Stub gtag calls before GA loads
    gtag('js', new Date());
    gtag('config', GA_ID, {
        'page_path': window.location.pathname,
        'anonymize_ip': true
    });

    // Lazy-load GA4 script after page resources are loaded
    // This prevents 166 KiB of unused GA4 code from blocking FCP/LCP
    window.addEventListener('load', () => {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
        document.body.appendChild(script);
        console.log('[Analytics] GA4 initialized (lazy-loaded after page load).');
    }, { once: true });
})();
