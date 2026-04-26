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
    astrocartography: 'osviceni',
    journal_insights: 'pruvodce',
    mentor: 'pruvodce',
    monthly_horoscope: 'pruvodce',
    natal_chart: 'pruvodce',
    natalni_interpretace: 'pruvodce',
    numerologie_vyklad: 'pruvodce',
    partnerska_detail: 'pruvodce',
    premium_membership: 'pruvodce',
    rituals: 'pruvodce',
    synastry: 'pruvodce',
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
