/**
 * Google Analytics 4 - Consent Mode v2
 * Tag is present, but analytics and marketing storage stay denied until consent.
 */

(function () {
    const GA_ID = 'G-H22CGHF34K';
    let googleTagLoadScheduled = false;

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;

    function loadGoogleTag() {
        if (googleTagLoadScheduled || document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
        googleTagLoadScheduled = true;

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
        document.head.appendChild(script);
    }

    function scheduleGoogleTagLoad() {
        const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 1200));
        if (document.readyState === 'complete') {
            schedule(loadGoogleTag);
        } else {
            window.addEventListener('load', function () {
                schedule(loadGoogleTag);
            }, { once: true });
        }
    }

    function updateConsent(analytics, marketing) {
        gtag('consent', 'update', {
            'analytics_storage': analytics ? 'granted' : 'denied',
            'ad_storage': marketing ? 'granted' : 'denied',
            'ad_user_data': marketing ? 'granted' : 'denied',
            'ad_personalization': marketing ? 'granted' : 'denied'
        });

        if (analytics || marketing) {
            scheduleGoogleTagLoad();
        }
    }

    gtag('consent', 'default', {
        'analytics_storage': 'denied',
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied',
        'wait_for_update': 500
    });

    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });

    try {
        const prefs = JSON.parse(localStorage.getItem('mh_cookie_prefs') || '{}');
        if (typeof prefs.analytics === 'boolean' || typeof prefs.marketing === 'boolean') {
            updateConsent(prefs.analytics === true, prefs.marketing === true);
        } else if (localStorage.getItem('cookieConsent') === 'accepted') {
            updateConsent(true, true);
        }
    } catch (e) {}

    window.addEventListener('mh_cookie_consent', function (e) {
        if (e.detail) {
            updateConsent(e.detail.analytics === true, e.detail.marketing === true);
        }
    });
})();
