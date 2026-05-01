import express from 'express';
import { supabase } from '../db-supabase.js';
import { optionalPremiumCheck } from '../middleware.js';

const router = express.Router();

const MAX_BATCH_SIZE = 10;
const MAX_METADATA_KEYS = 16;
const REDACTED = '[redacted]';
const REDACTED_EMAIL = '[redacted-email]';
const SENSITIVE_KEY_RE = /email|mail|password|heslo|token|secret|authorization|cookie|session/i;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const SENSITIVE_QUERY_RE = /([?&][^=&#]*(?:email|mail|password|heslo|token|secret|authorization|cookie|session)[^=&#]*=)[^&#]*/gi;

const ALLOWED_EVENTS = new Set([
    'page_view',
    'cta_clicked',
    'pricing_viewed',
    'auth_viewed',
    'signup_completed',
    'login_completed',
    'begin_checkout',
    'payment_returned',
    'purchase',
    'purchase_completed',
    'billing_portal_opened',
    'subscription_action',
    'client_error',
    'error',
    'feedback_submitted',
    'production_smoke_checked'
]);

const ALLOWED_EVENT_PREFIXES = [
    'action_',
    'onboarding_',
    'feature_',
    'paywall_',
    'astrocartography_',
    'natal_chart_',
    'synastry_',
    'newsletter_',
    'pricing_',
    'one_time_',
    'signup_activation_',
    'password_reset_',
    'premium_activation_',
    'profile_',
    'churn_',
    'pause_',
    'discount_',
    'checkout_',
    'subscription_',
    'exit_intent_'
];

function cleanString(value, maxLength = 160) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, maxLength);
}

function shouldRedact(key) {
    const keyText = String(key || '').toLowerCase();
    return SENSITIVE_KEY_RE.test(keyText);
}

function sanitizeStringValue(key, value) {
    if (SENSITIVE_KEY_RE.test(key)) return REDACTED;
    return value
        .trim()
        .replace(SENSITIVE_QUERY_RE, `$1${REDACTED}`)
        .replace(EMAIL_RE, REDACTED_EMAIL)
        .slice(0, 500);
}

function sanitizePrimitive(key, value) {
    if (shouldRedact(key)) return REDACTED;

    if (typeof value === 'string') return sanitizeStringValue(key, value);
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'boolean' || value === null) return value;
    return undefined;
}

export function sanitizeAnalyticsMetadata(input, maxKeys = MAX_METADATA_KEYS) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

    const output = {};
    const entries = Object.entries(input).slice(0, Math.max(0, maxKeys));

    for (const [rawKey, rawValue] of entries) {
        const key = cleanString(rawKey, 48);
        if (!key) continue;

        const value = sanitizePrimitive(key, rawValue);
        if (value !== undefined) output[key] = value;
    }

    return output;
}

export function normalizeAnalyticsEventName(value) {
    const eventName = cleanString(value, 80)?.toLowerCase();
    if (!eventName || !/^[a-z][a-z0-9_]{1,79}$/.test(eventName)) return null;
    if (ALLOWED_EVENTS.has(eventName)) return eventName;
    if (ALLOWED_EVENT_PREFIXES.some((prefix) => eventName.startsWith(prefix))) return eventName;
    return null;
}

export function buildAnalyticsMetadata(body = {}, req = null) {
    const systemMetadata = sanitizeAnalyticsMetadata({
        page: body.page,
        path: body.path,
        referrer: body.referrer,
        clientId: body.clientId,
        visitId: body.sessionId,
        userAgent: req?.get?.('user-agent') || undefined
    });
    const userMetadataBudget = MAX_METADATA_KEYS - Object.keys(systemMetadata).length;
    const userMetadata = sanitizeAnalyticsMetadata(body.metadata || {}, userMetadataBudget);

    return {
        ...userMetadata,
        ...systemMetadata
    };
}

function normalizeEventPayload(body = {}, req) {
    const eventName = normalizeAnalyticsEventName(body.eventName || body.name);
    if (!eventName) return null;

    const metadata = buildAnalyticsMetadata(body, req);

    return {
        event_type: eventName.slice(0, 50),
        feature: cleanString(body.feature, 100),
        metadata
    };
}

async function recordAnalyticsEvent(event, userId = null) {
    const { error } = await supabase.from('analytics_events').insert({
        user_id: userId,
        event_type: event.event_type,
        feature: event.feature,
        metadata: event.metadata
    });

    if (error) {
        console.warn('[ANALYTICS] Could not record event:', event.event_type, error.message);
        return false;
    }

    return true;
}

router.post('/event', optionalPremiumCheck, async (req, res) => {
    try {
        const event = normalizeEventPayload(req.body, req);
        if (!event) {
            return res.status(400).json({ success: false, error: 'Invalid analytics event.' });
        }

        await recordAnalyticsEvent(event, req.user?.id || null);
        return res.json({ success: true, accepted: 1 });
    } catch (error) {
        console.error('[ANALYTICS] Event endpoint failed:', error);
        return res.status(500).json({ success: false, error: 'Could not record analytics event.' });
    }
});

router.post('/batch', optionalPremiumCheck, async (req, res) => {
    try {
        const rawEvents = Array.isArray(req.body?.events) ? req.body.events.slice(0, MAX_BATCH_SIZE) : [];
        const events = rawEvents
            .map((eventBody) => normalizeEventPayload(eventBody, req))
            .filter(Boolean);

        if (!events.length) {
            return res.status(400).json({ success: false, error: 'No valid analytics events.' });
        }

        const results = await Promise.all(events.map((event) => recordAnalyticsEvent(event, req.user?.id || null)));
        const accepted = results.filter(Boolean).length;

        return res.json({ success: true, accepted });
    } catch (error) {
        console.error('[ANALYTICS] Batch endpoint failed:', error);
        return res.status(500).json({ success: false, error: 'Could not record analytics events.' });
    }
});

export default router;
