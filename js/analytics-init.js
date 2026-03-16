/**
 * Google Analytics 4 Initialization
 * Externalized from index.html to support strict CSP (no unsafe-inline).
 */

(function () {
    const GA_ID = 'G-H22CGHF34K';
    
    // Create and append the gtag.js script tag
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    // Initialize dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    function gtag() {
        window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA_ID, {
        'page_path': window.location.pathname,
        'anonymize_ip': true
    });

    console.log('[Analytics] GA4 initialized via external script.');
})();
