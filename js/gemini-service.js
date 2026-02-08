/**
 * Gemini AI Service Module
 * Frontend interface for communicating with the Mystická Hvězda API
 */

const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api';

/**
 * Generic API call helper
 */
async function callAPI(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Neznámá chyba');
        }

        return result.response;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

/**
 * Crystal Ball Oracle
 * @param {string} question - User's question
 * @param {string[]} history - Previous questions in this session
 * @returns {Promise<string>} - Oracle's response
 */
export async function askCrystalBall(question, history = []) {
    return callAPI('/crystal-ball', { question, history });
}

/**
 * Tarot Reading
 * @param {string} question - User's question
 * @param {string[]} cards - Array of drawn card names
 * @param {string} spreadType - Type of spread (e.g., "tříkartový")
 * @returns {Promise<string>} - Tarot interpretation
 */
export async function readTarot(question, cards, spreadType = 'tříkartový') {
    return callAPI('/tarot', { question, cards, spreadType });
}

/**
 * Natal Chart Analysis
 * @param {Object} birthData - Birth information
 * @param {string} birthData.birthDate - Date of birth
 * @param {string} birthData.birthTime - Time of birth
 * @param {string} birthData.birthPlace - Place of birth
 * @param {string} birthData.name - Person's name (optional)
 * @returns {Promise<string>} - Natal chart interpretation
 */
export async function analyzeNatalChart({ birthDate, birthTime, birthPlace, name }) {
    return callAPI('/natal-chart', { birthDate, birthTime, birthPlace, name });
}

/**
 * Synastry / Compatibility Analysis
 * @param {Object} person1 - First person's data
 * @param {Object} person2 - Second person's data
 * @returns {Promise<string>} - Compatibility analysis
 */
export async function analyzeSynastry(person1, person2) {
    return callAPI('/synastry', { person1, person2 });
}

/**
 * Daily Horoscope
 * @param {string} sign - Zodiac sign in Czech
 * @param {string} date - Date for horoscope (optional)
 * @returns {Promise<string>} - Daily horoscope
 */
export async function getDailyHoroscope(sign, date) {
    return callAPI('/horoscope', { sign, date });
}

/**
 * Personalized Meditation
 * @param {Object} params - Meditation parameters
 * @param {string} params.emotion - Current emotional state
 * @param {string} params.intention - Meditation intention
 * @param {string} params.sign - Zodiac sign
 * @returns {Promise<string>} - Guided meditation script
 */
export async function generateMeditation({ emotion, intention, sign }) {
    return callAPI('/meditation', { emotion, intention, sign });
}

// Export for non-module usage
if (typeof window !== 'undefined') {
    window.GeminiService = {
        askCrystalBall,
        readTarot,
        analyzeNatalChart,
        analyzeSynastry,
        getDailyHoroscope,
        generateMeditation
    };
}
