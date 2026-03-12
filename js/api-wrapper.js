/**
 * API Wrapper with Upsell Handling
 * Intercepts API responses and shows upgrade modal when needed
 */

import { showUpgradeModal } from './upgrade-modal.js';

/**
 * Make API call with automatic upsell modal handling
 * @param {string} endpoint - API endpoint path
 * @param {object} data - Request payload
 * @returns {Promise} Response data or null if error/upsell shown
 */
export async function callAPI(endpoint, data = {}) {
    try {
        const token = localStorage.getItem('auth_token');

        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...(csrfToken && { 'X-CSRF-Token': csrfToken })
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        // Handle upsell modal (402 status code = payment required)
        if (response.status === 402 && result.upsell) {
            showUpgradeModal(result.upsell);
            return null;
        }

        // Handle other errors
        if (!response.ok) {
            const error = new Error(result.error || 'API Error');
            error.status = response.status;
            error.code = result.code;
            throw error;
        }

        return result;

    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Crystal Ball API call
 * @param {string} question - User's question
 * @param {array} history - Previous questions in session
 * @returns {Promise} Crystal ball response
 */
export async function askCrystalBall(question, history = []) {
    return callAPI('/api/oracle/crystal-ball', {
        question,
        history
    });
}

/**
 * Tarot API call
 * @param {string} question - User's question
 * @param {array} cards - Drawn tarot cards
 * @param {string} spreadType - Type of spread
 * @returns {Promise} Tarot interpretation
 */
export async function getTarotReading(question, cards, spreadType = 'tříkartový') {
    return callAPI('/api/oracle/tarot', {
        question,
        cards,
        spreadType
    });
}

/**
 * Horoscope API call
 * @param {string} sign - Zodiac sign
 * @param {string} period - 'daily', 'weekly', or 'monthly'
 * @param {array} context - Optional diary context
 * @returns {Promise} Horoscope
 */
export async function getHoroscope(sign, period = 'daily', context = []) {
    return callAPI('/api/horoscope', {
        sign,
        period,
        context
    });
}

export default { callAPI, askCrystalBall, getTarotReading, getHoroscope };

