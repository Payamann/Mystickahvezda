const READ_ONLY_ROUTES = [
    { key: 'payment_funnel', pattern: '**/api/payment/funnel-event' },
    { key: 'analytics_event', pattern: '**/api/analytics/event' },
    { key: 'analytics_batch', pattern: '**/api/analytics/batch' }
];

const MAX_CAPTURED_EVENTS = 100;
const SAFE_METADATA_KEYS = [
    'auth_mode',
    'billing_interval',
    'entry_feature',
    'entry_source',
    'path',
    'redirect',
    'step'
];
const SAFE_PAYLOAD_KEYS = [
    'event',
    'eventName',
    'feature',
    'name',
    'planId',
    'source'
];

function safeScalar(value) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    return null;
}

function safeMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        return {};
    }

    return Object.fromEntries(
        SAFE_METADATA_KEYS
            .filter((key) => Object.prototype.hasOwnProperty.call(metadata, key))
            .map((key) => [key, safeScalar(metadata[key])])
            .filter(([, value]) => value !== null)
    );
}

function safePostDataJson(request) {
    try {
        return request.postDataJSON();
    } catch {
        return null;
    }
}

function sanitizeTelemetryPayload(routeKey, payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { routeKey };
    }

    const safePayload = { routeKey };
    for (const key of SAFE_PAYLOAD_KEYS) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) {
            const value = safeScalar(payload[key]);
            if (value !== null) safePayload[key] = value;
        }
    }
    if (payload.metadata) {
        safePayload.metadata = safeMetadata(payload.metadata);
    }
    return safePayload;
}

export function createSmokeTelemetryBlocker() {
    const counters = READ_ONLY_ROUTES.reduce((acc, route) => {
        acc[route.key] = 0;
        return acc;
    }, { total: 0 });
    const capturedEvents = [];

    const response = {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, smoke: true, readOnly: true })
    };

    return {
        async install(context) {
            for (const routeConfig of READ_ONLY_ROUTES) {
                await context.route(routeConfig.pattern, route => {
                    const event = sanitizeTelemetryPayload(routeConfig.key, safePostDataJson(route.request()));
                    counters.total += 1;
                    counters[routeConfig.key] += 1;
                    capturedEvents.push(event);
                    if (capturedEvents.length > MAX_CAPTURED_EVENTS) {
                        capturedEvents.shift();
                    }
                    return route.fulfill(response);
                });
            }
        },
        events(routeKey = null) {
            const events = routeKey
                ? capturedEvents.filter((event) => event.routeKey === routeKey)
                : capturedEvents;
            return events.map((event) => ({
                ...event,
                ...(event.metadata ? { metadata: { ...event.metadata } } : {})
            }));
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
