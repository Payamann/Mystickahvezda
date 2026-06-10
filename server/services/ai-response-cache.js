import crypto from 'crypto';
import { supabase } from '../db-supabase.js';

const memoryCache = new Map();
const MAX_MEMORY_ENTRIES = 500;
let warnedAboutPersistentCache = false;

function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map((key) => [key, stableValue(value[key])])
        );
    }
    return value;
}

export function createAIResponseCacheKey(namespace, input) {
    const digest = crypto
        .createHash('sha256')
        .update(JSON.stringify(stableValue(input)))
        .digest('hex');
    return `${namespace}:${digest}`;
}

function getMemoryValue(cacheKey) {
    const row = memoryCache.get(cacheKey);
    if (!row) return null;
    if (row.expiresAt <= Date.now()) {
        memoryCache.delete(cacheKey);
        return null;
    }
    return row.value;
}

function setMemoryValue(cacheKey, value, expiresAt) {
    if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
        memoryCache.delete(memoryCache.keys().next().value);
    }
    memoryCache.set(cacheKey, { value, expiresAt });
}

export async function getCachedAIResponse(namespace, input) {
    const cacheKey = createAIResponseCacheKey(namespace, input);
    const memoryValue = getMemoryValue(cacheKey);
    if (memoryValue !== null) return { value: memoryValue, cacheKey, source: 'memory' };

    try {
        const { data, error } = await supabase
            .from('ai_response_cache')
            .select('response, expires_at')
            .eq('cache_key', cacheKey)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();
        if (error) throw error;
        if (!data) return null;

        const value = data.response?.value;
        if (value === undefined) return null;
        setMemoryValue(cacheKey, value, new Date(data.expires_at).getTime());
        return { value, cacheKey, source: 'database' };
    } catch (error) {
        if (!warnedAboutPersistentCache) {
            warnedAboutPersistentCache = true;
            console.warn('[AI CACHE] Persistent cache unavailable; using memory only:', error.message);
        }
        return null;
    }
}

export async function setCachedAIResponse(namespace, input, value, ttlSeconds) {
    const cacheKey = createAIResponseCacheKey(namespace, input);
    const expiresAtMs = Date.now() + ttlSeconds * 1000;
    const expiresAt = new Date(expiresAtMs).toISOString();
    setMemoryValue(cacheKey, value, expiresAtMs);

    try {
        const { error } = await supabase.from('ai_response_cache').upsert({
            cache_key: cacheKey,
            namespace,
            response: { value },
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
        }, { onConflict: 'cache_key' });
        if (error) throw error;
        return true;
    } catch (error) {
        if (!warnedAboutPersistentCache) {
            warnedAboutPersistentCache = true;
            console.warn('[AI CACHE] Persistent cache write unavailable:', error.message);
        }
        return false;
    }
}

export async function getOrCreateAIResponse({
    namespace,
    input,
    ttlSeconds,
    generate
}) {
    const cached = await getCachedAIResponse(namespace, input);
    if (cached) return { value: cached.value, cached: true, cacheSource: cached.source };

    const value = await generate();
    await setCachedAIResponse(namespace, input, value, ttlSeconds);
    return { value, cached: false, cacheSource: null };
}

export function resetAIResponseMemoryCache() {
    memoryCache.clear();
    warnedAboutPersistentCache = false;
}
