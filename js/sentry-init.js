window.sentryLoaded = new Promise(resolve => {
    if (window.Sentry) {
        window.Sentry.init({
            dsn: 'SENTRY_DSN_PLACEHOLDER',
            environment: 'production',
            tracesSampleRate: 0.1
        });
        resolve();
    }
});
