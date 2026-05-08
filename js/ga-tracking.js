/**
 * Google Analytics 4 Event Tracking
 *
 * Tracks upgrade funnels, feature usage, and conversions
 * Requires GA4 script loaded in HTML first
 */

function debugLog(...args) {
    if (window.MH_DEBUG_ANALYTICS) {
        console.debug(...args);
    }
}

// Initialize tracking (called on page load)
export function initAnalytics() {
    if (typeof gtag === 'undefined') {
        console.warn('[GA] Google Analytics not loaded. Skipping tracking.');
        return false;
    }

    // Set user properties if user is logged in
    const userId = getUserId();
    if (userId) {
        gtag('config', {
            'user_id': userId,
            'anonymize_ip': true
        });
    }

    debugLog('[GA] Analytics initialized');
    return true;
}

// ═════════════════════════════════════════════════════════════════
// UPGRADE FUNNEL TRACKING
// ═════════════════════════════════════════════════════════════════

/**
 * Track when upgrade modal is shown to user
 * @param {object} data - Modal data with feature, plan, price
 */
export function trackUpgradeModalShown(data = {}) {
    if (!window.gtag) return;

    gtag('event', 'upgrade_modal_shown', {
        'feature_name': data.feature || 'unknown',
        'plan_id': data.plan || 'pruvodce',
        'price': data.price || 199,
        'trigger_type': data.trigger || 'limit_reached',
        'timestamp': new Date().toISOString()
    });

    debugLog('[GA] Event: upgrade_modal_shown', data.feature);
}

/**
 * Track when user closes upgrade modal
 * @param {string} action - How modal was closed (close_btn, cta_clicked, escape, later_btn)
 */
export function trackUpgradeModalClosed(action = 'unknown') {
    if (!window.gtag) return;

    gtag('event', 'upgrade_modal_closed', {
        'close_action': action,
        'timestamp': new Date().toISOString()
    });

    debugLog('[GA] Event: upgrade_modal_closed', action);
}

/**
 * Track when user clicks upgrade CTA button
 * @param {object} data - CTA data
 */
export function trackUpgradeCTAClicked(data = {}) {
    if (!window.gtag) return;

    gtag('event', 'upgrade_cta_clicked', {
        'feature_name': data.feature || 'unknown',
        'plan_id': data.plan || 'pruvodce',
        'upgrade_url': data.upgradeUrl || '/cenik.html',
        'timestamp': new Date().toISOString()
    });

    debugLog('[GA] Event: upgrade_cta_clicked', data.feature);
}

/**
 * Track pricing page view
 * @param {string} selectedPlan - Which plan is being viewed
 */
export function trackPricingPageView(selectedPlan = null) {
    if (!window.gtag) return;

    gtag('event', 'view_item_list', {
        'items': [{
            'item_id': selectedPlan ? 'plan_' + selectedPlan : 'pricing_page',
            'item_name': selectedPlan || 'all_plans',
            'item_category': 'pricing'
        }],
        'timestamp': new Date().toISOString()
    });

    debugLog('[GA] Event: pricing_page_view', selectedPlan);
}

// ═════════════════════════════════════════════════════════════════
// FEATURE USAGE TRACKING
// ═════════════════════════════════════════════════════════════════

/**
 * Track crystal ball question ask
 */
export function trackCrystalBallQuestion() {
    if (!window.gtag) return;

    gtag('event', 'feature_use', {
        'feature_name': 'crystal_ball',
        'feature_type': 'divination',
        'timestamp': new Date().toISOString()
    });

    debugLog('[GA] Event: feature_use - crystal_ball');
}

/**
 * Track tarot reading
 * @param {string} spreadType - Type of tarot spread
 */
export function trackTarotReading(spreadType = 'unknown') {
    if (!window.gtag) return;

    gtag('event', 'feature_use', {
        'feature_name': 'tarot',
        'feature_type': 'divination',
        'spread_type': spreadType,
        'timestamp': new Date().toISOString()
    });

    debugLog('[GA] Event: feature_use - tarot');
}

/**
 * Track horoscope view
 * @param {string} sign - Zodiac sign
 * @param {string} period - daily, weekly, or monthly
 */
export function trackHoroscopeView(sign = 'unknown', period = 'daily') {
    if (!window.gtag) return;

    gtag('event', 'feature_use', {
        'feature_name': 'horoscope',
        'feature_type': 'astrology',
        'zodiac_sign': sign,
        'period': period,
        'timestamp': new Date().toISOString()
    });

    debugLog('[GA] Event: feature_use - horoscope');
}

/**
 * Track angel card draw
 */
export function trackAngelCardDraw() {
    if (!window.gtag) return;

    gtag('event', 'feature_use', {
        'feature_name': 'angel_cards',
        'feature_type': 'divination',
        'timestamp': new Date().toISOString()
    });

    debugLog('[GA] Event: feature_use - angel_cards');
}

/**
 * Track numerology reading
 */
export function trackNumerologyReading() {
    if (!window.gtag) return;

    gtag('event', 'feature_use', {
        'feature_name': 'numerology',
        'feature_type': 'divination',
        'timestamp': new Date().toISOString()
    });

    debugLog('[GA] Event: feature_use - numerology');
}

/**
 * Track dream analysis
 */
export function trackDreamAnalysis() {
    if (!window.gtag) return;

    gtag('event', 'feature_use', {
        'feature_name': 'dream_analysis',
        'feature_type': 'analysis',
        'timestamp': new Date().toISOString()
    });

    debugLog('[GA] Event: feature_use - dream_analysis');
}

// ═════════════════════════════════════════════════════════════════
// USER JOURNEY TRACKING
// ═════════════════════════════════════════════════════════════════

/**
 * Track user signup
 * @param {string} method - signup method (email, google, facebook)
 */
export function trackUserSignup(method = 'email') {
    if (!window.gtag) return;

    gtag('event', 'sign_up', {
        'method': method,
        'timestamp': new Date().toISOString()
    });

    debugLog('[GA] Event: sign_up', method);
}

/**
 * Track user login
 * @param {string} method - login method
 */
export function trackUserLogin(method = 'email') {
    if (!window.gtag) return;

    gtag('event', 'login', {
        'method': method,
        'timestamp': new Date().toISOString()
    });

    debugLog('[GA] Event: login', method);
}

/**
 * Track premium purchase (call from payment.js after successful charge)
 * @param {string} plan - Plan ID (pruvodce, osviceni, vesmirny_pruvodce)
 * @param {number} price - Price in haléře (e.g., 17900 = 179 Kč)
 * @param {string} currency - Currency code (default CZK)
 */
export function trackPremiumPurchase(plan = 'unknown', price = 0, currency = 'CZK') {
    if (!window.gtag) return;

    const priceInKc = Math.round(price / 100); // Convert from haléře to Kč

    gtag('event', 'purchase', {
        'currency': currency,
        'value': priceInKc,
        'items': [{
            'item_id': 'plan_' + plan,
            'item_name': plan,
            'item_category': 'subscription',
            'price': priceInKc
        }],
        'timestamp': new Date().toISOString()
    });

    debugLog('[GA] Event: purchase', plan, priceInKc + ' ' + currency);
}

/**
 * Track subscription cancellation
 * @param {string} plan - Plan ID
 * @param {string} reason - Cancellation reason
 */
export function trackSubscriptionCancelled(plan = 'unknown', reason = 'unknown') {
    if (!window.gtag) return;

    gtag('event', 'subscription_cancelled', {
        'plan_id': plan,
        'reason': reason,
        'timestamp': new Date().toISOString()
    });

    debugLog('[GA] Event: subscription_cancelled', plan);
}

/**
 * Track generic page view (optional, GA tracks automatically)
 * @param {string} pageName - Human-readable page name
 * @param {string} path - URL path
 */
export function trackPageView(pageName = '', path = '') {
    if (!window.gtag) return;

    gtag('event', 'page_view', {
        'page_title': pageName || document.title,
        'page_path': path || window.location.pathname,
        'timestamp': new Date().toISOString()
    });

    debugLog('[GA] Event: page_view', pageName);
}

// ═════════════════════════════════════════════════════════════════
// PERFORMANCE TRACKING
// ═════════════════════════════════════════════════════════════════

/**
 * Track page load metrics
 * Call this once on page load to measure performance
 */
export function trackPageLoadMetrics() {
    if (!window.gtag) return;

    window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (!perfData) {
            debugLog('[GA] Performance data not available');
            return;
        }

        const metrics = {
            'dns_time': Math.round(perfData.domainLookupEnd - perfData.domainLookupStart),
            'tcp_time': Math.round(perfData.connectEnd - perfData.connectStart),
            'ttfb': Math.round(perfData.responseStart - perfData.requestStart),
            'download_time': Math.round(perfData.responseEnd - perfData.responseStart),
            'dom_parse_time': Math.round(perfData.domInteractive - perfData.domLoading),
            'page_load': Math.round(perfData.loadEventEnd - perfData.loadEventStart)
        };

        gtag('event', 'page_load_metrics', metrics);

        debugLog('[GA] Event: page_load_metrics', metrics);

        // Track LCP (Largest Contentful Paint)
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        if (lcpEntries.length > 0) {
            const lcp = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
            gtag('event', 'largest_contentful_paint', {
                'value': lcp,
                'timestamp': new Date().toISOString()
            });
            debugLog('[GA] Event: largest_contentful_paint', lcp + 'ms');
        }

        // Track FCP (First Contentful Paint)
        const fcp = performance.getEntriesByName('first-contentful-paint')[0];
        if (fcp) {
            const fcpTime = Math.round(fcp.startTime);
            gtag('event', 'first_contentful_paint', {
                'value': fcpTime,
                'timestamp': new Date().toISOString()
            });
            debugLog('[GA] Event: first_contentful_paint', fcpTime + 'ms');
        }
    });
}

// ═════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═════════════════════════════════════════════════════════════════

/**
 * Get user ID from localStorage (if logged in)
 * @returns {string|null} User ID or null
 */
function getUserId() {
    return localStorage.getItem('userId') || null;
}

/**
 * Set user ID for tracking (call after login)
 * @param {string} userId - User ID from your system
 */
export function setUserId(userId) {
    if (!userId) return;

    localStorage.setItem('userId', userId);
    if (window.gtag) {
        gtag('config', {
            'user_id': userId
        });
    }
    debugLog('[GA] User ID set:', userId);
}

/**
 * Clear user ID (call on logout)
 */
export function clearUserId() {
    localStorage.removeItem('userId');
    debugLog('[GA] User ID cleared');
}

/**
 * Set custom user property
 * @param {string} propertyName - Property name
 * @param {string} propertyValue - Property value
 */
export function setUserProperty(propertyName, propertyValue) {
    if (!window.gtag) return;

    gtag('set', {
        [`user_property_${propertyName}`]: propertyValue
    });

    debugLog('[GA] User property set:', propertyName, propertyValue);
}

// ═════════════════════════════════════════════════════════════════
// EXPORT ALL FUNCTIONS
// ═════════════════════════════════════════════════════════════════

export default {
    // Initialization
    initAnalytics,

    // Upgrade funnel
    trackUpgradeModalShown,
    trackUpgradeModalClosed,
    trackUpgradeCTAClicked,
    trackPricingPageView,

    // Feature usage
    trackCrystalBallQuestion,
    trackTarotReading,
    trackHoroscopeView,
    trackAngelCardDraw,
    trackNumerologyReading,
    trackDreamAnalysis,

    // User journey
    trackUserSignup,
    trackUserLogin,
    trackPremiumPurchase,
    trackSubscriptionCancelled,
    trackPageView,

    // Performance
    trackPageLoadMetrics,

    // Utilities
    setUserId,
    clearUserId,
    setUserProperty
};
