/**
 * Mystická Hvězda - API Configuration
 * Centralized API URL configuration for all frontend modules
 */

const API_CONFIG = {
    // Use environment-appropriate URL
    // Change this when deploying to production
    BASE_URL: (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.protocol === 'file:' // Handle Opening index.html directly
    ) ? 'http://localhost:3001/api' : '/api',

    // Stripe Configuration
    STRIPE_PUBLISHABLE_KEY: 'pk_test_51SvhkJPMTdHJh4NOR3GEkWs2lPjTEDURmFrYru5pcU6K90ZczeXUEGiQWoyxPe3W5xlzGmIjSL8Pr0hWbLzvMhOK00hVke56SN',

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
 * Helper function to call API endpoints
 * @param {string} endpoint - API endpoint path
 * @param {Object} data - Request body data
 * @returns {Promise<Object>} - API response
 */
async function callAPI(endpoint, data) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
