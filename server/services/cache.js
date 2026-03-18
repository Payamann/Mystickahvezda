/**
 * Simple in-memory cache for AI responses.
 * Prevents redundant calls to expensive APIs (Gemini/Stripe).
 * Includes max-size limit to prevent memory leaks.
 */
class ResponseCache {
    constructor(ttlSeconds = 3600, maxSize = 500) {
        this.cache = new Map();
        this.ttl = ttlSeconds * 1000;
        this.maxSize = maxSize;
    }

    set(key, value) {
        // Evict oldest entry if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }

        const expiry = Date.now() + this.ttl;
        this.cache.set(key, { value, expiry });
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    generateKey(namespace, params) {
        return `${namespace}:${JSON.stringify(params)}`;
    }
}

// Singleton instances for different types of data
export const horoscopeCache = new ResponseCache(3600 * 4, 200);  // 4h TTL, max 200
export const numerologyCache = new ResponseCache(3600 * 24, 100); // 24h TTL, max 100
export const generalAICache = new ResponseCache(1800, 300);       // 30min TTL, max 300
