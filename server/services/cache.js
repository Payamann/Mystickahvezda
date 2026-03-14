/**
 * Simple in-memory cache for AI responses.
 * Prevents redundant calls to expensive APIs (Gemini/Stripe).
 */
class ResponseCache {
    constructor(ttlSeconds = 3600) {
        this.cache = new Map();
        this.ttl = ttlSeconds * 1000;
    }

    set(key, value) {
        const expiry = Date.now() + this.ttl;
        this.cache.set(key, { value, expiry });
        
        // Auto-cleanup after TTL
        setTimeout(() => {
            if (this.cache.has(key) && this.cache.get(key).expiry <= Date.now()) {
                this.cache.delete(key);
            }
        }, this.ttl);
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
export const horoscopeCache = new ResponseCache(3600 * 4); // 4 hours
export const numerologyCache = new ResponseCache(3600 * 24); // 24 hours (static per date)
export const generalAICache = new ResponseCache(1800); // 30 minutes
