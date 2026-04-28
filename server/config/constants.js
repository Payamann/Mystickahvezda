/**
 * Shared server-side plan constants.
 * Checkout validation, webhook persistence and premium checks read from here.
 */

export const PLAN_TYPES = Object.freeze({
    FREE: 'free',
    PREMIUM: 'premium_monthly',
    EXCLUSIVE: 'exclusive_monthly',
    VIP: 'vip_majestrat',
});

export const DEFAULT_PREMIUM_PLAN_TYPE = PLAN_TYPES.PREMIUM;

export const LEGACY_PLAN_TYPE_ALIASES = Object.freeze({
    vip: PLAN_TYPES.VIP,
});

export const PREMIUM_PLAN_TYPES = Object.freeze([
    PLAN_TYPES.PREMIUM,
    PLAN_TYPES.EXCLUSIVE,
    PLAN_TYPES.VIP,
]);

export const PLAN_TYPE_RANK = Object.freeze({
    [PLAN_TYPES.FREE]: 0,
    [PLAN_TYPES.PREMIUM]: 1,
    [PLAN_TYPES.EXCLUSIVE]: 2,
    [PLAN_TYPES.VIP]: 3,
});

export const LIVE_STRIPE_PRICE_IDS = Object.freeze({
    pruvodce: 'price_1TRBKpAo8bdbnsKapn6BM0Wj',
    'pruvodce-rocne': 'price_1TRBKqAo8bdbnsKacSK9KoSa',
    osviceni: 'price_1TCjhkAo8bdbnsKaBes5yjmW',
    'osviceni-rocne': 'price_1TRBKrAo8bdbnsKaja6EEMKa',
    'vip-majestrat': 'price_1TCjijAo8bdbnsKaAk3Km66K',
});

export const SUBSCRIPTION_PLANS = Object.freeze({
    poutnik: {
        name: 'Poutník (Základ)',
        price: 0,
        type: PLAN_TYPES.FREE,
        interval: null,
        trialDays: 0,
        description: 'Základní přístup - Denní horoskop, Tarot 1x denně, Křišťálová koule 3x denně'
    },
    pruvodce: {
        name: 'Hvězdný Průvodce (Měsíční)',
        price: 19900,
        type: PLAN_TYPES.PREMIUM,
        interval: 'month',
        trialDays: 7,
        description: 'Premium přístup - Neomezené tarotové výklady, Týdenní + měsíční horoskopy, Natální karta s interpretací'
    },
    'pruvodce-rocne': {
        name: 'Hvězdný Průvodce (Roční)',
        price: 199000,
        type: PLAN_TYPES.PREMIUM,
        interval: 'year',
        trialDays: 7,
        description: 'Roční Premium přístup - denní vedení, plné výklady, historie a osobní profil'
    },
    osviceni: {
        name: 'Osvícení (Měsíční)',
        price: 49900,
        type: PLAN_TYPES.EXCLUSIVE,
        interval: 'month',
        trialDays: 7,
        description: 'Exkluzivní přístup - Prioritní odpovědi, exkluzivní obsah, early access k novinkám'
    },
    'osviceni-rocne': {
        name: 'Osvícení (Roční)',
        price: 499000,
        type: PLAN_TYPES.EXCLUSIVE,
        interval: 'year',
        trialDays: 7,
        description: 'Roční hluboký přístup - vše z Průvodce, astrokartografie, pokročilé analýzy a roční mapa'
    },
    'vip-majestrat': {
        name: 'VIP Věštecký Majestát (Měsíční)',
        price: 99900,
        type: PLAN_TYPES.VIP,
        interval: 'month',
        trialDays: 0,
        description: 'VIP přístup - Priority 24/7 podpora, personalizovaný daily horoscope, neomezené konzultace s Hvězdným Průvodcem'
    }
});

const PUBLIC_PLAN_ORDER = Object.freeze([
    'poutnik',
    'pruvodce',
    'pruvodce-rocne',
    'osviceni',
    'osviceni-rocne',
    'vip-majestrat',
]);

const PRICING_PAGE_PLAN_MAP = Object.freeze({
    monthly: Object.freeze({
        pruvodce: 'pruvodce',
        osviceni: 'osviceni',
    }),
    yearly: Object.freeze({
        pruvodce: 'pruvodce-rocne',
        osviceni: 'osviceni-rocne',
    }),
});

export const FEATURE_PLAN_MAP = Object.freeze({
    angel_card_deep: 'pruvodce',
    andelske_karty_hluboky_vhled: 'pruvodce',
    astrocartography: 'osviceni',
    crystal_ball_unlimited: 'pruvodce',
    daily_guidance: 'pruvodce',
    horoskopy: 'pruvodce',
    hvezdny_mentor: 'pruvodce',
    journal_insights: 'pruvodce',
    kristalova_koule: 'pruvodce',
    mentor: 'pruvodce',
    medicine_wheel: 'pruvodce',
    monthly_horoscope: 'pruvodce',
    minuly_zivot: 'pruvodce',
    natal_chart: 'pruvodce',
    natalni_interpretace: 'pruvodce',
    numerologie_vyklad: 'pruvodce',
    past_life: 'pruvodce',
    partnerska_detail: 'pruvodce',
    premium_membership: 'pruvodce',
    rituals: 'pruvodce',
    runy_hluboky_vyklad: 'pruvodce',
    runes_deep_reading: 'pruvodce',
    shamanske_kolo_plne_cteni: 'pruvodce',
    synastry: 'pruvodce',
    tarot: 'pruvodce',
    tarot_celtic_cross: 'vip-majestrat',
    tarot_multi_card: 'pruvodce',
    weekly_horoscope: 'pruvodce',
});

const priceFormatter = new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
});

function formatPriceLabel(priceMinor) {
    return priceFormatter.format(priceMinor / 100).replace(/\u00a0/g, ' ');
}

function toBillingInterval(interval) {
    if (interval === 'month') return 'monthly';
    if (interval === 'year') return 'yearly';
    return 'free';
}

export function getPublicPlanManifest() {
    return {
        currency: 'CZK',
        featurePlanMap: FEATURE_PLAN_MAP,
        pricingPage: PRICING_PAGE_PLAN_MAP,
        plans: PUBLIC_PLAN_ORDER
            .filter(planId => SUBSCRIPTION_PLANS[planId])
            .map(planId => {
                const plan = SUBSCRIPTION_PLANS[planId];
                return {
                    id: planId,
                    name: plan.name,
                    planType: plan.type,
                    priceMinor: plan.price,
                    priceCzk: plan.price / 100,
                    priceLabel: formatPriceLabel(plan.price),
                    interval: plan.interval,
                    billingInterval: toBillingInterval(plan.interval),
                    trialDays: plan.trialDays,
                    checkoutEnabled: plan.price > 0,
                    description: plan.description
                };
            })
    };
}

export function normalizePlanType(planType, fallback = PLAN_TYPES.FREE) {
    const normalized = LEGACY_PLAN_TYPE_ALIASES[planType] || planType;
    if (normalized === PLAN_TYPES.FREE || PREMIUM_PLAN_TYPES.includes(normalized)) {
        return normalized;
    }

    return fallback;
}

export function isPremiumPlanType(planType) {
    return PREMIUM_PLAN_TYPES.includes(normalizePlanType(planType));
}

export function getPlanById(planId) {
    return SUBSCRIPTION_PLANS[planId] || null;
}

export function getRequiredPlanForFeature(featureName, fallbackPlanId = 'pruvodce') {
    return FEATURE_PLAN_MAP[featureName] || fallbackPlanId;
}

export function getPlanTypeForPlanId(planId, fallback = PLAN_TYPES.PREMIUM) {
    return normalizePlanType(getPlanById(planId)?.type, fallback);
}

export function planTypeMeetsRequirement(currentPlanType, requiredPlanId) {
    const current = normalizePlanType(currentPlanType);
    const required = getPlanTypeForPlanId(requiredPlanId);
    return (PLAN_TYPE_RANK[current] || 0) >= (PLAN_TYPE_RANK[required] || 0);
}

export function userHasFeatureAccess(user, featureName) {
    if (!user?.isPremium) return false;
    return planTypeMeetsRequirement(user.subscription_status, getRequiredPlanForFeature(featureName));
}
