/**
 * ANALYTICS & EVENT TRACKING
 * Supports multiple analytics providers (Google Analytics, Mixpanel, Segment)
 */

const MH_ANALYTICS_ENDPOINT = '/api/analytics/event';
const MH_ANALYTICS_MAX_QUEUE = 30;
const MH_ANALYTICS_SESSION_KEY = 'mh_analytics_session_id';
const MH_ANALYTICS_CLIENT_KEY = 'mh_analytics_client_id';

window.MH_ANALYTICS_QUEUE = window.MH_ANALYTICS_QUEUE || [];

let mhAnalyticsCsrfPromise = null;

function getAnalyticsPreference() {
    try {
        const prefs = JSON.parse(localStorage.getItem('mh_cookie_prefs') || 'null');
        return prefs?.analytics !== false;
    } catch {
        return true;
    }
}

function getOrCreateStorageId(key, prefix) {
    try {
        const existing = sessionStorage.getItem(key) || localStorage.getItem(key);
        if (existing) return existing;

        const id = `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        const storage = key === MH_ANALYTICS_SESSION_KEY ? sessionStorage : localStorage;
        storage.setItem(key, id);
        return id;
    } catch {
        return `${prefix}_${Date.now().toString(36)}`;
    }
}

function sanitizeClientMetadata(event) {
    const metadata = {};
    const blockedKeys = /email|mail|password|heslo|token|secret|authorization|cookie|session/i;

    Object.entries(event || {}).slice(0, 20).forEach(([key, value]) => {
        if (key === 'name' || key === 'timestamp') return;
        if (blockedKeys.test(key)) {
            metadata[key] = '[redacted]';
            return;
        }
        if (typeof value === 'string') metadata[key] = value.slice(0, 500);
        else if (typeof value === 'number' && Number.isFinite(value)) metadata[key] = value;
        else if (typeof value === 'boolean' || value === null) metadata[key] = value;
    });

    return metadata;
}

function getAnalyticsCsrfToken() {
    if (window.getCSRFToken) return window.getCSRFToken();
    if (mhAnalyticsCsrfPromise) return mhAnalyticsCsrfPromise;

    mhAnalyticsCsrfPromise = fetch('/api/csrf-token', { credentials: 'include' })
        .then((response) => response.json())
        .then((data) => data.csrfToken || null)
        .catch(() => null)
        .finally(() => {
            mhAnalyticsCsrfPromise = null;
        });

    return mhAnalyticsCsrfPromise;
}

function queueBackendEvent(event) {
    window.MH_ANALYTICS_QUEUE.push(event);
    if (window.MH_ANALYTICS_QUEUE.length > MH_ANALYTICS_MAX_QUEUE) {
        window.MH_ANALYTICS_QUEUE.splice(0, window.MH_ANALYTICS_QUEUE.length - MH_ANALYTICS_MAX_QUEUE);
    }

    if (!getAnalyticsPreference()) return;
    if (!window.fetch) return;

    const payload = {
        eventName: event.name,
        feature: event.feature || event.feature_name || null,
        page: document.title || null,
        path: window.location.pathname,
        referrer: document.referrer || null,
        clientId: getOrCreateStorageId(MH_ANALYTICS_CLIENT_KEY, 'mhc'),
        sessionId: getOrCreateStorageId(MH_ANALYTICS_SESSION_KEY, 'mhs'),
        metadata: sanitizeClientMetadata(event)
    };

    getAnalyticsCsrfToken()
        .then((csrfToken) => {
            if (!csrfToken) return null;
            return fetch(MH_ANALYTICS_ENDPOINT, {
                method: 'POST',
                credentials: 'include',
                keepalive: true,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify(payload)
            });
        })
        .catch(() => {});
}

const MH_ANALYTICS = {
    /**
     * Track custom event
     * @param {string} eventName - Event identifier (e.g., 'churn_prevention_shown')
     * @param {object} data - Additional event data
     */
    trackEvent(eventName, data = {}) {
        const event = {
            name: eventName,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ...data
        };

        // 1. Google Analytics (if available)
        if (window.gtag) {
            gtag('event', eventName, data);
        }

        // 2. Optional debug logging for local diagnostics
        if (window.MH_DEBUG_ANALYTICS) {
            console.debug(`[Analytics] ${eventName}`, event);
        }

        // 3. Queue and persist to first-party analytics endpoint
        queueBackendEvent(event);

        // 4. Mixpanel (if integrated)
        if (window.mixpanel) {
            mixpanel.track(eventName, data);
        }

        // 5. Segment (if integrated)
        if (window.analytics) {
            window.analytics.track(eventName, data);
        }
    },

    /**
     * Track page view
     */
    trackPageView(pageName = document.title) {
        this.trackEvent('page_view', {
            page: pageName,
            url: window.location.href
        });
    },

    /**
     * Track user action with context
     */
    trackAction(action, context = {}) {
        this.trackEvent(`action_${action}`, context);
    },

    trackCTA(location, context = {}) {
        this.trackEvent('cta_clicked', {
            location,
            ...context
        });
    },

    trackPricingViewed(selectedPlan = null, context = {}) {
        this.trackEvent('pricing_viewed', {
            selected_plan: selectedPlan,
            ...context
        });
    },

    trackAuthViewed(mode = 'login', context = {}) {
        this.trackEvent('auth_viewed', {
            auth_mode: mode,
            ...context
        });
    },

    trackAuthCompleted(mode = 'login', context = {}) {
        const eventName = mode === 'register' ? 'signup_completed' : 'login_completed';
        this.trackEvent(eventName, {
            auth_mode: mode,
            ...context
        });
    },

    trackCheckoutStarted(planId = 'unknown', context = {}) {
        this.trackEvent('begin_checkout', {
            plan_id: planId,
            ...context
        });
    },

    trackPaymentResult(status = 'unknown', context = {}) {
        this.trackEvent('payment_returned', {
            payment_status: status,
            ...context
        });
    },

    trackPurchaseCompleted(productId = 'unknown', value = null, currency = 'CZK', context = {}) {
        const productType = context.product_type || 'subscription';
        const payload = {
            transaction_id: context.transaction_id || context.session_id || undefined,
            currency,
            value,
            product_id: productId,
            product_type: productType,
            items: [{
                item_id: productId,
                item_name: context.product_name || productId,
                item_category: productType,
                price: value ?? undefined,
                quantity: 1
            }],
            ...context
        };

        this.trackEvent('purchase', payload);
        this.trackEvent('purchase_completed', payload);
    },

    trackBillingPortalOpened(context = {}) {
        this.trackEvent('billing_portal_opened', context);
    },

    trackSubscriptionAction(action, context = {}) {
        this.trackEvent('subscription_action', {
            action,
            ...context
        });
    },

    /**
     * Track error
     */
    trackError(error, context = {}) {
        const normalizedError = error instanceof Error
            ? error
            : new Error(typeof error === 'string' ? error : 'Unknown client error');
        this.trackEvent('client_error', {
            message: normalizedError.message,
            stack: normalizedError.stack,
            ...context
        });
    }
};

// Create global aliases
window.trackEvent = window.trackEvent || ((eventName, data) => MH_ANALYTICS.trackEvent(eventName, data));
window.MH_ANALYTICS = MH_ANALYTICS;

document.addEventListener('click', (event) => {
    const target = event.target.closest(
        '#hero-cta-btn, #hero-daily-card-link, #cta-banner-btn, #auth-register-btn, #mobile-auth-register-btn, #auth-btn, #mobile-auth-btn, a[data-plan]'
    );
    if (!target) return;

    const href = target.getAttribute('href') || '';
    const label = target.textContent?.trim() || target.id || 'unknown';

    if (target.matches('#hero-cta-btn')) {
        MH_ANALYTICS.trackCTA('homepage_hero', { label, destination: href || '/prihlaseni.html?mode=register' });
        return;
    }

    if (target.matches('#hero-daily-card-link')) {
        MH_ANALYTICS.trackCTA('homepage_daily_card_hero', { label, destination: href || '#sluzby' });
        return;
    }

    if (target.matches('#cta-banner-btn')) {
        MH_ANALYTICS.trackCTA('homepage_cta_banner', { label, destination: href || '/cenik.html' });
        return;
    }

    if (target.matches('#auth-register-btn, #mobile-auth-register-btn')) {
        MH_ANALYTICS.trackCTA('header_register', { label, destination: href || 'auth_modal_register' });
        return;
    }

    if (target.matches('#auth-btn, #mobile-auth-btn') && !(window.Auth?.isLoggedIn?.())) {
        MH_ANALYTICS.trackCTA('header_login', { label, destination: href || 'auth_modal_login' });
        return;
    }

    if (target.matches('a[data-plan]')) {
        MH_ANALYTICS.trackCTA('homepage_pricing_preview', {
            label,
            plan_id: target.dataset.plan || null,
            destination: href || '/cenik.html'
        });
    }
});

// Track uncaught errors
window.addEventListener('error', (event) => {
    MH_ANALYTICS.trackError(event.error, {
        type: 'uncaught_error',
        filename: event.filename,
        lineno: event.lineno
    });
});

// Track unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    MH_ANALYTICS.trackError(event.reason, {
        type: 'unhandled_rejection'
    });
});

// Initialize analytics queue for batching
