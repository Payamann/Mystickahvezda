/**
 * Mystická Hvězda - API Configuration
 * Centralized API URL configuration for all frontend modules
 */

const API_CONFIG = {
    // Use environment-appropriate URL
    BASE_URL: (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.protocol === 'file:' // Handle Opening index.html directly
    ) ? 'http://localhost:3001/api' : '/api',

    // Stripe publishable key — loaded from server at runtime (see initConfig)
    STRIPE_PUBLISHABLE_KEY: null,

    // API Endpoints
    ENDPOINTS: {
        CRYSTAL_BALL: '/crystal-ball',
        TAROT: '/tarot',
        NATAL_CHART: '/natal-chart',
        SYNASTRY: '/synastry',
        HOROSCOPE: '/horoscope'
    }
};

/**
 * Loads client-safe config from the server (e.g. Stripe publishable key).
 * Call this once on page load before using STRIPE_PUBLISHABLE_KEY.
 */
async function initConfig() {
    try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/config`);
        if (res.ok) {
            const data = await res.json();
            if (data.stripePublishableKey) {
                API_CONFIG.STRIPE_PUBLISHABLE_KEY = data.stripePublishableKey;
            }
        }
    } catch (e) {
        console.warn('Could not load remote config:', e.message);
    }
}

/**
 * Helper function to call API endpoints
 * @param {string} endpoint - API endpoint path
 * @param {Object} data - Request body data
 * @returns {Promise<Object>} - API response
 */
async function callAPI(endpoint, data) {
    try {
        const headers = { 'Content-Type': 'application/json' };

        // Attach JWT token if available (for authenticated endpoints)
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const csrfToken = await getCSRFToken();
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Neznámá chyba');
        }

        return result;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

// Make available globally
window.API_CONFIG = API_CONFIG;
window.callAPI = callAPI;
window.initConfig = initConfig;


// CSRF Token - in-memory only, never stored in localStorage
let _csrfToken = null;
let _csrfFetchPromise = null;

async function getCSRFToken() {
    if (_csrfToken) return _csrfToken;
    if (_csrfFetchPromise) return _csrfFetchPromise;
    _csrfFetchPromise = fetch(API_CONFIG.BASE_URL + '/csrf-token')
        .then(r => r.json())
        .then(data => {
            _csrfToken = data.csrfToken;
            _csrfFetchPromise = null;
            setTimeout(() => { _csrfToken = null; }, 2 * 60 * 60 * 1000);
            return _csrfToken;
        })
        .catch(() => { _csrfFetchPromise = null; return null; });
    return _csrfFetchPromise;
}

window.getCSRFToken = getCSRFToken;

// Auto-initialize config on load
initConfig();
