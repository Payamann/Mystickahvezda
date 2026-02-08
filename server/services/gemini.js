const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 3000];

// Simple circuit breaker
let consecutiveFailures = 0;
let circuitOpenUntil = 0;

/**
 * Validates the API key presence.
 */
function getApiKey() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error('GEMINI_API_KEY is not defined in environment variables.');
    }
    return key;
}

/**
 * Fetch with retry and exponential backoff for transient errors.
 */
async function fetchWithRetry(url, options) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url, options);

            // Retry on rate limit or server errors
            if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
                console.warn(`[Gemini] Retrying (${attempt + 1}/${MAX_RETRIES}) after status ${response.status}...`);
                await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
                continue;
            }

            return response;
        } catch (error) {
            if (attempt < MAX_RETRIES) {
                console.warn(`[Gemini] Network error, retrying (${attempt + 1}/${MAX_RETRIES})...`);
                await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
                continue;
            }
            throw error;
        }
    }
}

/**
 * Calls the Gemini API with a given system instruction and user message/history.
 * Supports both simple text generation and structured chat history.
 *
 * @param {string} systemPrompt - The system instruction/persona.
 * @param {string|Array} messageOrHistory - The user prompt string OR an array of message objects {role, content}.
 * @param {Object} contextData - Optional additional context (user profile, etc.) to append to system prompt.
 * @returns {Promise<string>} - The generated response text.
 */
export async function callGemini(systemPrompt, messageOrHistory, contextData = null) {
    // Circuit breaker check
    if (Date.now() < circuitOpenUntil) {
        throw new Error('Gemini API temporarily unavailable. Please try again later.');
    }

    const apiKey = getApiKey();

    // Construct the full system instruction with context if provided
    let fullSystemInstruction = systemPrompt;
    if (contextData) {
        const { userContext, appContext } = contextData;

        if (userContext) {
            fullSystemInstruction += `\n\nPROFIL UŽIVATELE:\nJméno: ${userContext.name || 'Neznámé'}\nZnamení: ${userContext.zodiacSign || 'Neznámé'}\nDatum narození: ${userContext.birthDate || 'Neznámé'}\n`;
        }

        if (appContext) {
            fullSystemInstruction += `\n\nKONTEXT APLIKACE:\n${appContext}`;
        }
    }

    // Format content for Gemini API
    let contents = [];

    if (Array.isArray(messageOrHistory)) {
        // Chat History Mode
        contents = messageOrHistory.map(msg => ({
            role: msg.role === 'mentor' || msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: String(msg.content || '').substring(0, 2000) }]
        }));
    } else {
        // Single Turn Mode
        contents = [{
            role: 'user',
            parts: [{ text: String(messageOrHistory || '').substring(0, 2000) }]
        }];
    }

    const requestBody = {
        contents: contents,
        system_instruction: {
            parts: [{ text: fullSystemInstruction }]
        },
        generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        }
    };

    try {
        const response = await fetchWithRetry(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            consecutiveFailures++;
            if (consecutiveFailures >= 5) {
                circuitOpenUntil = Date.now() + 60000;
                console.error('[Gemini] Circuit breaker OPEN for 60s after 5 consecutive failures.');
            }
            throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
        }

        // Reset circuit breaker on success
        consecutiveFailures = 0;

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No content returned from Gemini.');
        }

        return text;

    } catch (error) {
        console.error('[Gemini Service] Error:', error.message);
        throw error;
    }
}
