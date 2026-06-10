const PROFILES = Object.freeze({
    default: { modelTier: 'sonnet', maxTokens: 1600, timeoutMs: 30000, maxRetries: 2 },
    briefing: { modelTier: 'haiku', maxTokens: 700, timeoutMs: 20000, maxRetries: 1 },
    crystal_ball: { modelTier: 'haiku', maxTokens: 700, timeoutMs: 20000, maxRetries: 1 },
    tarot_single: { modelTier: 'haiku', maxTokens: 850, timeoutMs: 20000, maxRetries: 1 },
    tarot_multi: { modelTier: 'sonnet', maxTokens: 1400, timeoutMs: 30000, maxRetries: 2 },
    tarot_summary: { modelTier: 'sonnet', maxTokens: 1400, timeoutMs: 30000, maxRetries: 2 },
    angel_card: { modelTier: 'haiku', maxTokens: 700, timeoutMs: 20000, maxRetries: 1 },
    runes: { modelTier: 'haiku', maxTokens: 900, timeoutMs: 20000, maxRetries: 1 },
    daily_wisdom: { modelTier: 'haiku', maxTokens: 550, timeoutMs: 20000, maxRetries: 1 },
    horoscope_daily: { modelTier: 'haiku', maxTokens: 700, timeoutMs: 20000, maxRetries: 1 },
    horoscope_weekly: { modelTier: 'sonnet', maxTokens: 1000, timeoutMs: 30000, maxRetries: 2 },
    horoscope_monthly: { modelTier: 'sonnet', maxTokens: 1200, timeoutMs: 30000, maxRetries: 2 },
    dream_analysis: { modelTier: 'sonnet', maxTokens: 1400, timeoutMs: 30000, maxRetries: 2 },
    natal_chart: { modelTier: 'sonnet', maxTokens: 1800, timeoutMs: 30000, maxRetries: 2 },
    synastry: { modelTier: 'sonnet', maxTokens: 1800, timeoutMs: 30000, maxRetries: 2 },
    astrocartography: { modelTier: 'sonnet', maxTokens: 1800, timeoutMs: 30000, maxRetries: 2 },
    numerology: { modelTier: 'sonnet', maxTokens: 1600, timeoutMs: 30000, maxRetries: 2 },
    past_life: { modelTier: 'sonnet', maxTokens: 1800, timeoutMs: 30000, maxRetries: 2 },
    medicine_wheel: { modelTier: 'sonnet', maxTokens: 1500, timeoutMs: 30000, maxRetries: 2 },
    mentor: { modelTier: 'sonnet', maxTokens: 1400, timeoutMs: 30000, maxRetries: 2 },
    annual_horoscope_pdf: { modelTier: 'sonnet', maxTokens: 4096, timeoutMs: 90000, maxRetries: 1 },
    personal_map_pdf: { modelTier: 'sonnet', maxTokens: 8192, timeoutMs: 120000, maxRetries: 1 }
});

export function getAIProfile(feature = 'default', overrides = {}) {
    const base = PROFILES[feature] || PROFILES.default;
    const modelTier = overrides.modelTier || base.modelTier;
    const model = overrides.model
        || (modelTier === 'haiku'
            ? process.env.ANTHROPIC_HAIKU_MODEL || 'claude-haiku-4-5'
            : process.env.ANTHROPIC_SONNET_MODEL || 'claude-sonnet-4-5');

    return {
        feature,
        modelTier,
        model,
        maxTokens: overrides.maxTokens || base.maxTokens,
        timeoutMs: overrides.timeoutMs || base.timeoutMs,
        maxRetries: Number.isInteger(overrides.maxRetries)
            ? overrides.maxRetries
            : base.maxRetries
    };
}

export function listAIProfiles() {
    return PROFILES;
}
