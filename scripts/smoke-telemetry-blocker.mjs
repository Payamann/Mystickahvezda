const READ_ONLY_ROUTES = [
    { key: 'payment_funnel', pattern: '**/api/payment/funnel-event' },
    { key: 'analytics_event', pattern: '**/api/analytics/event' },
    { key: 'analytics_batch', pattern: '**/api/analytics/batch' }
];

export function createSmokeTelemetryBlocker() {
    const counters = READ_ONLY_ROUTES.reduce((acc, route) => {
        acc[route.key] = 0;
        return acc;
    }, { total: 0 });

    const response = {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, smoke: true, readOnly: true })
    };

    return {
        async install(context) {
            for (const routeConfig of READ_ONLY_ROUTES) {
                await context.route(routeConfig.pattern, route => {
                    counters.total += 1;
                    counters[routeConfig.key] += 1;
                    return route.fulfill(response);
                });
            }
        },
        summary() {
            return { ...counters };
        },
        print(prefix) {
            console.log([
                `[${prefix}] telemetry_blocked`,
                `total=${counters.total}`,
                `payment_funnel=${counters.payment_funnel}`,
                `analytics_event=${counters.analytics_event}`,
                `analytics_batch=${counters.analytics_batch}`
            ].join(' '));
        }
    };
}
