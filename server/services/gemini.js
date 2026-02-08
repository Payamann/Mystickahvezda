// Native fetch is used in Node 18+
// import fetch from 'node-fetch';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
 * Calls the Gemini API with a given system instruction and user message/history.
 * Supports both simple text generation and structured chat history.
 * 
 * @param {string} systemPrompt - The system instruction/persona.
 * @param {string|Array} messageOrHistory - The user prompt string OR an array of message objects {role, content}.
 * @param {Object} contextData - Optional additional context (user profile, etc.) to append to system prompt.
 * @returns {Promise<string>} - The generated response text.
 */
export async function callGemini(systemPrompt, messageOrHistory, contextData = null) {
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
        // Chat History Mode (History + New Message)
        contents = messageOrHistory.map(msg => ({
            role: msg.role === 'mentor' || msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));
    } else {
        // Single Turn Mode (User Message only)
        // Wrapped in standard user role
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

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No content returned from Gemini.');
        }

        return text;

    } catch (error) {
        console.error('[Gemini Service] Error:', error.message);
        throw error; // Re-throw for caller to handle
    }
}
