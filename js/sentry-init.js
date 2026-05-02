const SENTRY_WAIT_ATTEMPTS = 20;
const SENTRY_WAIT_INTERVAL_MS = 100;
const SENTRY_SDK_URL = 'https://browser.sentry-cdn.com/7.99.0/bundle.min.js';
const SENTRY_SDK_INTEGRITY = 'sha384-KhWx6ggiGYQEFvq5iRp7UFjJ9dQcTepbcWs3UTfB6Kyg7E6A6HUmc6KOt808Y3yh';

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForSentrySdk() {
    for (let attempt = 0; attempt < SENTRY_WAIT_ATTEMPTS; attempt += 1) {
        if (window.Sentry?.init) {
            return window.Sentry;
        }

        await wait(SENTRY_WAIT_INTERVAL_MS);
    }

    return null;
}

function loadSentrySdk() {
    if (window.Sentry?.init) return Promise.resolve(window.Sentry);

    const existingScript = document.querySelector(`script[src="${SENTRY_SDK_URL}"]`);
    if (existingScript) return waitForSentrySdk();

    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = SENTRY_SDK_URL;
        script.async = true;
        script.integrity = SENTRY_SDK_INTEGRITY;
        script.crossOrigin = 'anonymous';
        script.onload = async () => resolve(await waitForSentrySdk());
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
    });
}

function getSentryEnvironment() {
    const hostname = window.location.hostname;

    if (hostname === 'www.mystickahvezda.cz' || hostname === 'mystickahvezda.cz') {
        return 'production';
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
    }

    return 'preview';
}

async function initializeSentry() {
    if (typeof window.initConfig === 'function') {
        await window.initConfig();
    }

    const dsn = window.API_CONFIG?.SENTRY_DSN || window.SENTRY_DSN || null;
    if (!dsn) {
        return false;
    }

    const sentry = await loadSentrySdk();
    if (!sentry) {
        return false;
    }

    sentry.init({
        dsn,
        environment: getSentryEnvironment(),
        tracesSampleRate: 0.1
    });

    return true;
}

window.sentryLoaded = initializeSentry().catch(error => {
    console.warn('Could not initialize Sentry:', error.message);
    return false;
});
