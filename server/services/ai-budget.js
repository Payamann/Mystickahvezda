import { supabase } from '../db-supabase.js';
import { recordServerEvent } from './telemetry.js';

const DEFAULT_DAILY_AI_CALL_LIMIT = 120;
const MAX_DAILY_AI_CALL_LIMIT = 10000;
const USE_LOCAL_ONLY = process.env.MOCK_SUPABASE === 'true' || process.env.NODE_ENV === 'test';
let aiBudgetDate = null;
let aiRequestsReserved = 0;
let warnedAboutSharedBudget = false;

const MODEL_COST_MICRO_USD_PER_TOKEN = Object.freeze({
    haiku: { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
    sonnet: { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 }
});

export function normalizeDailyAICallLimit(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_DAILY_AI_CALL_LIMIT;
    return Math.min(MAX_DAILY_AI_CALL_LIMIT, Math.max(1, parsed));
}

export function reserveDailyAIRequest({
    now = new Date(),
    limit = normalizeDailyAICallLimit(process.env.AI_DAILY_CALL_LIMIT)
} = {}) {
    const dateKey = now.toISOString().slice(0, 10);
    if (aiBudgetDate !== dateKey) {
        aiBudgetDate = dateKey;
        aiRequestsReserved = 0;
    }

    if (aiRequestsReserved >= limit) {
        const error = new Error(`Daily AI request limit reached (${limit}).`);
        error.code = 'AI_DAILY_BUDGET_EXHAUSTED';
        throw error;
    }

    aiRequestsReserved += 1;
    return {
        date: aiBudgetDate,
        limit,
        used: aiRequestsReserved,
        remaining: limit - aiRequestsReserved
    };
}

export function resetDailyAIRequestBudget() {
    aiBudgetDate = null;
    aiRequestsReserved = 0;
    warnedAboutSharedBudget = false;
}

function normalizeSharedBudgetResult(data) {
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== 'object') return null;
    return {
        allowed: row.allowed !== false,
        used: Number(row.used || row.reserved_requests || 0),
        remaining: Number(row.remaining || 0)
    };
}

export async function reserveAIRequest({
    now = new Date(),
    limit = normalizeDailyAICallLimit(process.env.AI_DAILY_CALL_LIMIT),
    feature = 'unknown',
    model = 'unknown'
} = {}) {
    const local = reserveDailyAIRequest({ now, limit });
    if (USE_LOCAL_ONLY) return { ...local, source: 'local' };

    try {
        const { data, error } = await supabase.rpc('reserve_ai_daily_request', {
            p_date_key: local.date,
            p_limit: limit,
            p_feature: feature,
            p_model: model
        });
        if (error) throw error;

        const shared = normalizeSharedBudgetResult(data);
        if (!shared) throw new Error('Shared AI budget returned no result.');
        if (!shared.allowed) {
            const budgetError = new Error(`Daily AI request limit reached (${limit}).`);
            budgetError.code = 'AI_DAILY_BUDGET_EXHAUSTED';
            throw budgetError;
        }

        return {
            ...local,
            ...shared,
            source: 'database'
        };
    } catch (error) {
        if (error.code === 'AI_DAILY_BUDGET_EXHAUSTED') throw error;
        if (!warnedAboutSharedBudget) {
            warnedAboutSharedBudget = true;
            console.warn('[AI BUDGET] Shared budget unavailable; local safety limit remains active:', error.message);
        }
        return { ...local, source: 'local-fallback' };
    }
}

export function estimateClaudeCostMicroUsd({
    modelTier,
    inputTokens = 0,
    outputTokens = 0,
    cacheCreationInputTokens = 0,
    cacheReadInputTokens = 0
}) {
    const price = MODEL_COST_MICRO_USD_PER_TOKEN[modelTier] || MODEL_COST_MICRO_USD_PER_TOKEN.sonnet;
    return Math.round(
        inputTokens * price.input
        + outputTokens * price.output
        + cacheCreationInputTokens * price.cacheWrite
        + cacheReadInputTokens * price.cacheRead
    );
}

export async function recordAIRequestOutcome({
    dateKey = new Date().toISOString().slice(0, 10),
    feature,
    model,
    modelTier,
    success,
    usage = {},
    durationMs = 0,
    statusCode = null
}) {
    const inputTokens = Number(usage.input_tokens || 0);
    const outputTokens = Number(usage.output_tokens || 0);
    const cacheCreationInputTokens = Number(usage.cache_creation_input_tokens || 0);
    const cacheReadInputTokens = Number(usage.cache_read_input_tokens || 0);
    const estimatedCostMicroUsd = estimateClaudeCostMicroUsd({
        modelTier,
        inputTokens,
        outputTokens,
        cacheCreationInputTokens,
        cacheReadInputTokens
    });

    if (!USE_LOCAL_ONLY) {
        try {
            const { error } = await supabase.rpc('record_ai_request_outcome', {
                p_date_key: dateKey,
                p_feature: feature,
                p_model: model,
                p_success: Boolean(success),
                p_input_tokens: inputTokens,
                p_output_tokens: outputTokens,
                p_cache_creation_input_tokens: cacheCreationInputTokens,
                p_cache_read_input_tokens: cacheReadInputTokens,
                p_estimated_cost_microusd: estimatedCostMicroUsd
            });
            if (!error) return true;
        } catch {
            // Aggregate analytics fallback below.
        }
    }

    return recordServerEvent('ai_request_completed', {
        feature,
        metadata: {
            model,
            model_tier: modelTier,
            success: Boolean(success),
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cache_creation_input_tokens: cacheCreationInputTokens,
            cache_read_input_tokens: cacheReadInputTokens,
            estimated_cost_microusd: estimatedCostMicroUsd,
            duration_ms: Math.round(durationMs),
            status_code: statusCode
        }
    });
}
