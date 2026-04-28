import { supabase } from '../db-supabase.js';

const REDACTED = '[redacted]';
const REDACTED_EMAIL = '[redacted-email]';
const SENSITIVE_KEY_RE = /email|mail|password|heslo|token|secret|authorization|cookie|session/i;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const SENSITIVE_QUERY_RE = /([?&][^=&#]*(?:email|mail|password|heslo|token|secret|authorization|cookie|session)[^=&#]*=)[^&#]*/gi;

function cleanString(value, maxLength = 240) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, maxLength);
}

function sanitizeStringValue(key, value) {
    if (SENSITIVE_KEY_RE.test(key)) return REDACTED;
    return value
        .replace(SENSITIVE_QUERY_RE, `$1${REDACTED}`)
        .replace(EMAIL_RE, REDACTED_EMAIL)
        .slice(0, 800);
}

export function sanitizeServerTelemetryMetadata(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

    const output = {};
    for (const [rawKey, rawValue] of Object.entries(input).slice(0, 16)) {
        const key = cleanString(rawKey, 48);
        if (!key) continue;

        if (typeof rawValue === 'string') {
            output[key] = sanitizeStringValue(key, rawValue);
        } else if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
            output[key] = rawValue;
        } else if (typeof rawValue === 'boolean' || rawValue === null) {
            output[key] = rawValue;
        }
    }
    return output;
}

export async function recordServerEvent(eventType, { userId = null, feature = null, metadata = {} } = {}) {
    const cleanEventType = cleanString(eventType, 50);
    if (!cleanEventType) return false;

    try {
        const { error } = await supabase.from('analytics_events').insert({
            user_id: userId,
            event_type: cleanEventType,
            feature: cleanString(feature, 100),
            metadata: sanitizeServerTelemetryMetadata(metadata)
        });

        if (error) {
            console.warn('[TELEMETRY] Could not record server event:', cleanEventType, error.message);
            return false;
        }

        return true;
    } catch (error) {
        console.warn('[TELEMETRY] Server event failed:', cleanEventType, error.message);
        return false;
    }
}
