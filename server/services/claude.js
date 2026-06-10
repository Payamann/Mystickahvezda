// Native fetch is used in Node 20+.
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { getAIProfile } from '../config/ai-profiles.js';
import {
    normalizeDailyAICallLimit,
    recordAIRequestOutcome,
    reserveAIRequest,
    reserveDailyAIRequest,
    resetDailyAIRequestBudget
} from './ai-budget.js';
import {
    getCachedAIResponse,
    setCachedAIResponse
} from './ai-response-cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const USE_MOCK_AI = process.env.MOCK_AI === 'true' || process.env.NODE_ENV === 'test';

const API_KEY = (() => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
        console.error('WARNING: ANTHROPIC_API_KEY is not defined in environment variables.');
    }
    return key;
})();

export {
    normalizeDailyAICallLimit,
    reserveDailyAIRequest,
    resetDailyAIRequestBudget
};

function appendContext(systemPrompt, contextData) {
    let fullSystem = systemPrompt;
    if (!contextData || typeof contextData !== 'object' || Array.isArray(contextData)) {
        return fullSystem;
    }

    const { userContext, appContext } = contextData;
    if (userContext) {
        fullSystem += [
            '',
            '',
            'PROFIL UŽIVATELE:',
            `Jméno: ${userContext.name || 'Neznámé'}`,
            `Znamení: ${userContext.zodiacSign || 'Neznámé'}`,
            `Datum narození: ${userContext.birthDate || 'Neznámé'}`
        ].join('\n');
    }
    if (appContext) {
        fullSystem += `\n\nKONTEXT APLIKACE:\n${appContext}`;
    }
    return fullSystem;
}

function normalizeMessages(messageOrHistory) {
    if (!Array.isArray(messageOrHistory)) {
        return [{ role: 'user', content: String(messageOrHistory || '') }];
    }

    return messageOrHistory.map((message) => ({
        role: message.role === 'mentor' || message.role === 'model' ? 'assistant' : 'user',
        content: String(message.content || '')
    }));
}

/**
 * Calls Claude through the shared budget, model routing and telemetry layer.
 * Existing three-argument calls remain supported; feature options are the fourth argument.
 */
export async function callClaude(systemPrompt, messageOrHistory, contextData = null, options = {}) {
    if (USE_MOCK_AI) {
        if (process.env.MOCK_AI_FORCE_ERROR === 'true') {
            throw new Error('Forced mock AI error.');
        }
        return buildMockClaudeResponse(systemPrompt);
    }

    const profile = getAIProfile(options.feature || 'default', options);
    const cacheInput = options.cacheTtlSeconds
        ? (options.cacheInput || {
            systemPrompt,
            messageOrHistory,
            contextData,
            model: profile.model
        })
        : null;
    const cacheNamespace = options.cacheNamespace || profile.feature;

    if (cacheInput) {
        const cached = await getCachedAIResponse(cacheNamespace, cacheInput);
        if (cached) return cached.value;
    }

    if (!API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not defined in environment variables.');
    }

    const requestBody = {
        model: profile.model,
        max_tokens: profile.maxTokens,
        system: appendContext(systemPrompt, contextData),
        messages: normalizeMessages(messageOrHistory)
    };

    let lastError;
    for (let attempt = 0; attempt <= profile.maxRetries; attempt += 1) {
        const startedAt = Date.now();
        let statusCode = null;
        let reservationDate = new Date().toISOString().slice(0, 10);

        try {
            const reservation = await reserveAIRequest({
                feature: profile.feature,
                model: profile.model
            });
            reservationDate = reservation.date;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), profile.timeoutMs);
            let response;
            try {
                response = await fetch(CLAUDE_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': API_KEY,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeoutId);
            }

            statusCode = response.status;
            if (!response.ok) {
                const apiError = new Error(
                    `Claude API Error (${response.status}): ${await response.text()}`
                );
                apiError.retryable = response.status === 429
                    || response.status === 529
                    || response.status >= 500;
                throw apiError;
            }

            const data = await response.json();
            const text = data.content?.[0]?.text;
            if (!text) throw new Error('No content returned from Claude.');

            recordAIRequestOutcome({
                dateKey: reservationDate,
                feature: profile.feature,
                model: profile.model,
                modelTier: profile.modelTier,
                success: true,
                usage: data.usage || {},
                durationMs: Date.now() - startedAt,
                statusCode
            }).catch(() => {});

            if (cacheInput) {
                setCachedAIResponse(
                    cacheNamespace,
                    cacheInput,
                    text,
                    options.cacheTtlSeconds
                ).catch(() => {});
            }

            return text;
        } catch (error) {
            lastError = error;
            if (error.code === 'AI_DAILY_BUDGET_EXHAUSTED') {
                console.error('[Claude Service] Daily request budget exhausted');
                throw error;
            }

            const timedOut = error.name === 'AbortError';
            const retryable = timedOut || error.retryable === true || error instanceof TypeError;
            recordAIRequestOutcome({
                dateKey: reservationDate,
                feature: profile.feature,
                model: profile.model,
                modelTier: profile.modelTier,
                success: false,
                durationMs: Date.now() - startedAt,
                statusCode
            }).catch(() => {});

            if (!retryable || attempt >= profile.maxRetries) {
                console.error('[Claude Service] Error:', error.message);
                throw timedOut ? new Error('Claude API request timed out') : error;
            }

            const delay = Math.pow(2, attempt + 1) * 1000;
            console.warn(
                `[Claude Service] Retry in ${delay}ms `
                + `(attempt ${attempt + 1}/${profile.maxRetries}, feature ${profile.feature})`
            );
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

function buildMockClaudeResponse(systemPrompt = '') {
    if (process.env.MOCK_AI_FORCE_INVALID_JSON === 'true') {
        return 'Testovaci AI odpoved pro invalidni JSON fallback.';
    }

    if (systemPrompt.includes('"prediction"') && systemPrompt.includes('"affirmation"')) {
        return JSON.stringify({
            prediction: 'Testovaci horoskop prinasi klidnou energii, jasne priority a jeden prakticky krok pro dnesni den.',
            affirmation: 'Dnes postupuji klidne, jasne a duveruji vlastnimu vnitrnimu vedeni.',
            luckyNumbers: [3, 7, 12, 21]
        });
    }

    return 'Testovaci AI odpoved pro izolovane automatizovane testy.';
}
