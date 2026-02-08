// Native fetch is used in Node 18+

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const REQUEST_TIMEOUT_MS = 30000; // 30 second timeout
const MAX_RETRIES = 2;

// Cache API key at module load (not per-request)
const API_KEY = (() => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error('WARNING: GEMINI_API_KEY is not defined in environment variables.');
    }
    return key;
})();

/**
 * Calls the Gemini API with a given system instruction and user message/history.
 * Supports both simple text generation and structured chat history.
 * Includes timeout and retry logic for reliability.
 *
 * @param {string} systemPrompt - The system instruction/persona.
 * @param {string|Array} messageOrHistory - The user prompt string OR an array of message objects {role, content}.
 * @param {Object} contextData - Optional additional context (user profile, etc.) to append to system prompt.
 * @returns {Promise<string>} - The generated response text.
 */
export async function callGemini(systemPrompt, messageOrHistory, contextData = null) {
    if (!API_KEY) {
        throw new Error('GEMINI_API_KEY is not defined in environment variables.');
    }

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
        // Chat History Mode (History + New Message)
        contents = messageOrHistory.map(msg => ({
            role: msg.role === 'mentor' || msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));
    } else {
        // Single Turn Mode (User Message only)
        contents = [{
            role: 'user',
            parts: [{ text: messageOrHistory }]
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

    // Retry loop with exponential backoff for transient errors
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

            const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const status = response.status;
                // Retry on 429 (rate limit) and 503 (service unavailable)
                if ((status === 429 || status === 503) && attempt < MAX_RETRIES) {
                    const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s
                    console.warn(`[Gemini Service] ${status} error, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                const errorText = await response.text();
                throw new Error(`Gemini API Error (${status}): ${errorText}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                throw new Error('No content returned from Gemini.');
            }

            return text;

        } catch (error) {
            lastError = error;
            if (error.name === 'AbortError') {
                console.error('[Gemini Service] Request timed out');
                if (attempt < MAX_RETRIES) {
                    const delay = Math.pow(2, attempt + 1) * 1000;
                    console.warn(`[Gemini Service] Retrying after timeout (attempt ${attempt + 1}/${MAX_RETRIES})`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                throw new Error('Gemini API request timed out');
            }
            if (attempt >= MAX_RETRIES) {
                console.error('[Gemini Service] Error:', error.message);
                throw error;
            }
        }
    }

    throw lastError;
}
