import express from 'express';
import { supabase } from './db-supabase.js';
import { authenticateToken, requireAdmin } from './middleware.js';
import { PLAN_TYPES, SUBSCRIPTION_PLANS } from './config/constants.js';

const router = express.Router();

const DEFAULT_FUNNEL_DAYS = 30;
const MAX_FUNNEL_DAYS = 365;
const DEFAULT_FUNNEL_LIMIT = 1000;
const MAX_FUNNEL_LIMIT = 5000;
const DEFAULT_ANALYTICS_DAYS = 7;
const MAX_ANALYTICS_DAYS = 90;
const DEFAULT_ANALYTICS_LIMIT = 1000;
const MAX_ANALYTICS_LIMIT = 5000;
const DEFAULT_BUSINESS_DAYS = 30;
const MAX_BUSINESS_DAYS = 365;
const DEFAULT_BUSINESS_LIMIT = 5000;

const MONTHLY_REVENUE_BY_PLAN_TYPE = Object.freeze({
    [PLAN_TYPES.PREMIUM]: 199,
    [PLAN_TYPES.EXCLUSIVE]: 499,
    [PLAN_TYPES.VIP]: 999
});

const FUNNEL_FAILURE_EVENTS = new Set([
    'checkout_validation_failed',
    'checkout_session_failed',
    'stripe_webhook_failed',
    'subscription_payment_failed',
]);

const FUNNEL_REFUND_EVENTS = new Set([
    'payment_refunded',
]);

function incrementCounter(counter, key) {
    const normalizedKey = key || 'unknown';
    counter[normalizedKey] = (counter[normalizedKey] || 0) + 1;
}

function topCounter(counter, limit = 8) {
    return Object.entries(counter)
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
        .slice(0, limit);
}

function normalizeDimension(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
}

function getMinorAmount(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

function estimateEventMinorValue(event) {
    const eventName = event?.event_name;
    const metadata = event?.metadata && typeof event.metadata === 'object' ? event.metadata : {};

    if (eventName === 'subscription_checkout_completed') {
        return SUBSCRIPTION_PLANS[event.plan_id]?.price || 0;
    }

    if (eventName === 'one_time_purchase_completed') {
        return getMinorAmount(metadata.amount || metadata.amount_total || metadata.price);
    }

    if (eventName === 'subscription_invoice_paid') {
        return getMinorAmount(metadata.amountPaid || metadata.amount_paid);
    }

    return 0;
}

function createDailyBucket(date) {
    return {
        date,
        paywallViewed: 0,
        checkoutStarted: 0,
        subscriptionCompleted: 0,
        oneTimeCompleted: 0,
        failures: 0,
        refunds: 0
    };
}

function getEventDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
}

function getEventTime(value) {
    if (!value) return null;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
}

function splitComparisonEvents(events, { since, previousSince, periodEnd } = {}) {
    const sinceTime = getEventTime(since);
    const previousSinceTime = getEventTime(previousSince);
    const periodEndTime = getEventTime(periodEnd);
    const hasComparison = Number.isFinite(sinceTime) && Number.isFinite(previousSinceTime);

    if (!hasComparison) {
        return {
            hasComparison: false,
            currentEvents: events,
            previousEvents: []
        };
    }

    const currentEvents = [];
    const previousEvents = [];

    for (const event of events) {
        const eventTime = getEventTime(event.created_at);
        if (!Number.isFinite(eventTime)) continue;

        if (eventTime >= sinceTime && (!Number.isFinite(periodEndTime) || eventTime < periodEndTime)) {
            currentEvents.push(event);
            continue;
        }

        if (eventTime >= previousSinceTime && eventTime < sinceTime) {
            previousEvents.push(event);
        }
    }

    return {
        hasComparison: true,
        currentEvents,
        previousEvents
    };
}

function sourceCounter(events) {
    const counter = {};

    for (const event of events) {
        incrementCounter(counter, normalizeDimension(event.source) || '(direct)');
    }

    return counter;
}

function buildSourceComparison(currentEvents, previousEvents, limit = 8) {
    const current = sourceCounter(currentEvents);
    const previous = sourceCounter(previousEvents);
    const keys = new Set([...Object.keys(current), ...Object.keys(previous)]);

    return [...keys]
        .map(key => {
            const currentCount = current[key] || 0;
            const previousCount = previous[key] || 0;
            const delta = currentCount - previousCount;

            return {
                key,
                current: currentCount,
                previous: previousCount,
                delta,
                deltaPercent: previousCount > 0
                    ? Math.round((delta / previousCount) * 1000) / 10
                    : null
            };
        })
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)
            || b.current - a.current
            || b.previous - a.previous
            || a.key.localeCompare(b.key))
        .slice(0, limit);
}

function createSourceFeatureSegment(source, feature) {
    return {
        source,
        feature,
        totalEvents: 0,
        paywallViewed: 0,
        checkoutStarted: 0,
        purchaseCompleted: 0,
        failures: 0,
        paywallToCheckoutRate: 0,
        checkoutToPurchaseRate: 0
    };
}

function getSourceFeatureSegmentKey(source, feature) {
    return `${source}\u0000${feature}`;
}

function addFunnelConversionCounts(segment, eventName) {
    segment.totalEvents += 1;

    if (eventName === 'paywall_viewed' || eventName === 'login_gate_viewed') segment.paywallViewed += 1;
    if (eventName === 'checkout_session_created') segment.checkoutStarted += 1;
    if (eventName === 'subscription_checkout_completed' || eventName === 'one_time_purchase_completed') segment.purchaseCompleted += 1;
    if (FUNNEL_FAILURE_EVENTS.has(eventName)) segment.failures += 1;
}

function addSourceFeatureEvent(segments, event) {
    const eventName = normalizeDimension(event.event_name) || 'unknown';
    const source = normalizeDimension(event.source) || '(direct)';
    const feature = normalizeDimension(event.feature) || '(nezadano)';
    const key = getSourceFeatureSegmentKey(source, feature);

    if (!segments.has(key)) {
        segments.set(key, createSourceFeatureSegment(source, feature));
    }

    const segment = segments.get(key);
    addFunnelConversionCounts(segment, eventName);
}

function buildSourceFeatureSegmentMap(events) {
    const segments = new Map();

    for (const event of events) {
        addSourceFeatureEvent(segments, event);
    }

    return segments;
}

function applySourceFeatureRates(segment) {
    return {
        ...segment,
        paywallToCheckoutRate: segment.paywallViewed > 0
            ? Math.round((segment.checkoutStarted / segment.paywallViewed) * 1000) / 10
            : 0,
        checkoutToPurchaseRate: segment.checkoutStarted > 0
            ? Math.round((segment.purchaseCompleted / segment.checkoutStarted) * 1000) / 10
            : 0
    };
}

function buildSourceFeatureSegments(events, previousEvents = [], limit = 10) {
    const currentSegments = buildSourceFeatureSegmentMap(events);
    const previousSegments = buildSourceFeatureSegmentMap(previousEvents);

    return [...currentSegments.values()]
        .map(applySourceFeatureRates)
        .map(segment => ({
            ...segment,
            previous: applySourceFeatureRates(
                previousSegments.get(getSourceFeatureSegmentKey(segment.source, segment.feature))
                    || createSourceFeatureSegment(segment.source, segment.feature)
            )
        }))
        .map(segment => ({
            ...segment,
            paywallToCheckoutRateDelta: segment.previous.paywallViewed > 0
                ? Math.round((segment.paywallToCheckoutRate - segment.previous.paywallToCheckoutRate) * 10) / 10
                : null,
            checkoutToPurchaseRateDelta: segment.previous.checkoutStarted > 0
                ? Math.round((segment.checkoutToPurchaseRate - segment.previous.checkoutToPurchaseRate) * 10) / 10
                : null
        }))
        .sort((a, b) => b.purchaseCompleted - a.purchaseCompleted
            || b.checkoutStarted - a.checkoutStarted
            || b.paywallViewed - a.paywallViewed
            || b.totalEvents - a.totalEvents
            || a.source.localeCompare(b.source)
            || a.feature.localeCompare(b.feature))
        .slice(0, limit);
}

function funnelMetadataFromEvent(event) {
    return event?.metadata && typeof event.metadata === 'object' ? event.metadata : {};
}

function funnelMetadataValue(metadata, keys, fallback) {
    for (const key of keys) {
        const value = normalizeDimension(metadata[key]);
        if (value) return value;
    }
    return fallback;
}

function createTarotCardSegment(card, entrySource, utmSource, campaign) {
    return {
        card,
        entrySource,
        utmSource,
        campaign,
        totalEvents: 0,
        paywallViewed: 0,
        checkoutStarted: 0,
        purchaseCompleted: 0,
        failures: 0,
        paywallToCheckoutRate: 0,
        checkoutToPurchaseRate: 0
    };
}

function getTarotCardSegmentKey(card, entrySource, utmSource, campaign) {
    return `${card}\u0000${entrySource}\u0000${utmSource}\u0000${campaign}`;
}

function addTarotCardEvent(segments, event) {
    const metadata = funnelMetadataFromEvent(event);
    const card = funnelMetadataValue(metadata, ['requested_card', 'card_param'], null);
    if (!card) return;

    const eventName = normalizeDimension(event.event_name) || 'unknown';
    const entrySource = funnelMetadataValue(metadata, ['entry_source'], normalizeDimension(event.source) || '(direct)');
    const utmSource = funnelMetadataValue(metadata, ['utm_source'], '(none)');
    const campaign = funnelMetadataValue(metadata, ['utm_campaign'], '(none)');
    const key = getTarotCardSegmentKey(card, entrySource, utmSource, campaign);

    if (!segments.has(key)) {
        segments.set(key, createTarotCardSegment(card, entrySource, utmSource, campaign));
    }

    addFunnelConversionCounts(segments.get(key), eventName);
}

function buildTarotCardSegments(events, limit = 12) {
    const segments = new Map();

    for (const event of events) {
        addTarotCardEvent(segments, event);
    }

    return [...segments.values()]
        .map(applySourceFeatureRates)
        .sort((a, b) => b.purchaseCompleted - a.purchaseCompleted
            || b.checkoutStarted - a.checkoutStarted
            || b.paywallViewed - a.paywallViewed
            || b.totalEvents - a.totalEvents
            || a.card.localeCompare(b.card)
            || a.entrySource.localeCompare(b.entrySource)
            || a.campaign.localeCompare(b.campaign))
        .slice(0, limit);
}

export function normalizeFunnelDays(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_FUNNEL_DAYS;
    return Math.min(MAX_FUNNEL_DAYS, Math.max(1, parsed));
}

export function normalizeFunnelLimit(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_FUNNEL_LIMIT;
    return Math.min(MAX_FUNNEL_LIMIT, Math.max(100, parsed));
}

export function normalizeAnalyticsDays(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_ANALYTICS_DAYS;
    return Math.min(MAX_ANALYTICS_DAYS, Math.max(1, parsed));
}

export function normalizeAnalyticsLimit(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_ANALYTICS_LIMIT;
    return Math.min(MAX_ANALYTICS_LIMIT, Math.max(100, parsed));
}

export function normalizeBusinessDays(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_BUSINESS_DAYS;
    return Math.min(MAX_BUSINESS_DAYS, Math.max(1, parsed));
}

function rate(numerator, denominator) {
    if (!denominator || denominator <= 0) return 0;
    return Math.min(100, Math.round((numerator / denominator) * 1000) / 10);
}

function countDelta(current, previous) {
    const delta = current - previous;
    return {
        current,
        previous,
        delta,
        deltaPercent: previous > 0 ? Math.round((delta / previous) * 1000) / 10 : null
    };
}

function clampScore(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function statusFromThreshold(value, { ok, warning, lowerIsBetter = false }) {
    if (lowerIsBetter) {
        if (value <= ok) return 'ok';
        if (value <= warning) return 'warning';
        return 'critical';
    }

    if (value >= ok) return 'ok';
    if (value >= warning) return 'warning';
    return 'critical';
}

function createBusinessSignal(label, status, value, detail, action) {
    return { label, status, value, detail, action };
}

function createBusinessAction(priority, title, impact, owner, nextStep) {
    return { priority, title, impact, owner, nextStep };
}

function businessPeriodSummary(analyticsReport = {}, funnelReport = {}) {
    const summary = analyticsReport.summary || {};
    const metrics = funnelReport.metrics || {};
    const purchases = (metrics.subscriptionCompleted || 0) + (metrics.oneTimeCompleted || 0);
    const visitors = summary.visitors || 0;
    const signups = summary.signups || 0;
    const checkoutStarted = Math.max(summary.checkouts || 0, metrics.checkoutStarted || 0);

    return {
        visitors,
        visits: summary.visits || 0,
        pageViews: summary.pageViews || 0,
        ctaClicks: summary.ctaClicks || 0,
        signups,
        checkoutStarted,
        purchases,
        subscriptionCompleted: metrics.subscriptionCompleted || 0,
        oneTimeCompleted: metrics.oneTimeCompleted || 0,
        failures: metrics.failures || 0,
        refunds: metrics.refunds || 0,
        cancelRequests: metrics.cancelRequests || 0,
        estimatedValueCzk: metrics.estimatedValueCzk || 0,
        visitorToSignupRate: rate(signups, visitors),
        visitorToCheckoutRate: rate(checkoutStarted, visitors),
        signupToCheckoutRate: rate(checkoutStarted, signups),
        checkoutToPurchaseRate: rate(purchases, checkoutStarted),
        purchaseValuePerVisitorCzk: visitors > 0 ? Math.round(((metrics.estimatedValueCzk || 0) / visitors) * 100) / 100 : 0
    };
}

function estimateMrrCzk(activeSubscriptions = []) {
    return (activeSubscriptions || []).reduce((sum, subscription) => {
        return sum + (MONTHLY_REVENUE_BY_PLAN_TYPE[subscription?.plan_type] || 0);
    }, 0);
}

function buildBusinessSignals(summary, userStats, analyticsReport = {}) {
    const errorCount = (analyticsReport.summary?.clientErrors || 0) + (analyticsReport.summary?.serverErrors || 0);
    const errorRate = rate(errorCount, analyticsReport.total || 0);
    const failureRate = rate(summary.failures, summary.checkoutStarted);

    return [
        createBusinessSignal(
            'Akvizice',
            statusFromThreshold(summary.visitors, { ok: 500, warning: 100 }),
            `${summary.visitors} návštěvníků`,
            'Dostatek návštěv za zvolené období určuje, jestli má smysl ladit konverzi nebo nejdřív přivést větší vzorek.',
            summary.visitors < 100 ? 'Zvýšit distribuci: short-form video, SEO clustery a newsletter.' : 'Pokračovat v měření zdrojů a škálovat nejlepší kanály.'
        ),
        createBusinessSignal(
            'Registrace',
            statusFromThreshold(summary.visitorToSignupRate, { ok: 4, warning: 1.5 }),
            `${summary.visitorToSignupRate} % visitor -> signup`,
            'Měří, jestli homepage, obsah a CTA mění anonymní návštěvu na účet.',
            summary.visitorToSignupRate < 1.5 ? 'Zjednodušit první CTA a posílit slib denního osobního rituálu.' : 'Rozšiřovat zdroje, které už přivádí registrace.'
        ),
        createBusinessSignal(
            'Monetizace',
            statusFromThreshold(summary.checkoutToPurchaseRate, { ok: 45, warning: 20 }),
            `${summary.checkoutToPurchaseRate} % checkout -> purchase`,
            'Měří, jestli pricing, důvěra a Stripe flow mění záměr v platbu.',
            summary.checkoutStarted === 0 ? 'Přivést víc lidí na pricing/paywall.' : 'Testovat trial, roční default a jednorázový PDF upsell.'
        ),
        createBusinessSignal(
            'Spolehlivost',
            statusFromThreshold(Math.max(errorRate, failureRate), { ok: 1, warning: 5, lowerIsBetter: true }),
            `${Math.max(errorRate, failureRate)} % rizikových eventů`,
            'Kombinuje client/server chyby a selhání checkoutu. V růstu musí být nízko.',
            Math.max(errorRate, failureRate) > 5 ? 'Nejdřív odstranit chyby a platební selhání.' : 'Technicky není vidět blokující obchodní riziko.'
        ),
        createBusinessSignal(
            'Předplatné',
            statusFromThreshold(userStats.activeSubscribers || 0, { ok: 25, warning: 5 }),
            `${userStats.activeSubscribers || 0} aktivních`,
            'Aktivní předplatitelé a MRR jsou hlavní dlouhodobý health signál.',
            (userStats.activeSubscribers || 0) < 5 ? 'Dostat první placené uživatele přes jednorázový produkt a onboarding.' : 'Zavést retenční a win-back sekvence.'
        )
    ];
}

function buildBusinessActions(summary, previousSummary, userStats, analyticsReport = {}) {
    const actions = [];
    const hasTrafficDrop = previousSummary.visitors > 0 && summary.visitors < previousSummary.visitors * 0.75;

    if (summary.visitors < 100 || hasTrafficDrop) {
        actions.push(createBusinessAction(
            1,
            'Zvýšit kvalitní návštěvnost',
            'Bez většího vzorku nebude možné spolehlivě vyhodnotit pricing ani onboarding.',
            'Growth',
            'Spustit 30denní plán: 3 short-form videa denně, interní linky z tarot/partnerských stránek a UTM pro každý kanál.'
        ));
    }

    if (summary.visitorToSignupRate < 3) {
        actions.push(createBusinessAction(
            2,
            'Zpřesnit hlavní slib a signup CTA',
            'Nejrychlejší páka na růst účtů je převést návštěvu na osobní denní rituál zdarma.',
            'CRO',
            'Otestovat hero headline kolem 3minutového denního rituálu a opakovat CTA u nejčtenějších nástrojů.'
        ));
    }

    if (summary.signups > 0 && summary.signupToCheckoutRate < 8) {
        actions.push(createBusinessAction(
            3,
            'Posílit aktivaci po registraci',
            'Signup bez prvního aha momentu nevytvoří ochotu platit.',
            'Product',
            'Po registraci navést uživatele na horoskop + kartu dne + uložení profilu a ukázat Premium až po hodnotě.'
        ));
    }

    if (summary.checkoutStarted > 0 && summary.checkoutToPurchaseRate < 35) {
        actions.push(createBusinessAction(
            4,
            'Otestovat trial a roční default',
            'Lidé už mají nákupní záměr, takže zlepšení checkout konverze se projeví přímo v příjmu.',
            'Pricing',
            'A/B test: 7denní trial Průvodce vs. současný model, roční plán jako doporučená volba.'
        ));
    }

    if ((userStats.activeSubscribers || 0) > 0 && summary.cancelRequests > 0) {
        actions.push(createBusinessAction(
            5,
            'Zavést retenční signály',
            'Každé zrušení je drahé, pokud acquisition teprve stavíme.',
            'Lifecycle',
            'U zrušení sbírat důvod, nabídnout pauzu a poslat win-back email po 14 dnech.'
        ));
    }

    const errorCount = (analyticsReport.summary?.clientErrors || 0) + (analyticsReport.summary?.serverErrors || 0);
    if (errorCount > 0 || summary.failures > 0) {
        actions.push(createBusinessAction(
            6,
            'Denně hlídat technické ztráty',
            'Chyby a selhání checkoutu přímo snižují důvěru i výkon placených kampaní.',
            'Engineering',
            'V adminu kontrolovat poslední chyby a segmenty se selháním; kritické zdroje řešit před škálováním.'
        ));
    }

    return actions.sort((a, b) => a.priority - b.priority).slice(0, 6);
}

function calculateBusinessScore(summary, userStats, analyticsReport = {}) {
    let score = 100;
    const errorCount = (analyticsReport.summary?.clientErrors || 0) + (analyticsReport.summary?.serverErrors || 0);
    const errorRate = rate(errorCount, analyticsReport.total || 0);
    const failureRate = rate(summary.failures, summary.checkoutStarted);

    if (summary.visitors < 100) score -= 18;
    else if (summary.visitors < 500) score -= 8;

    if (summary.visitorToSignupRate < 1.5) score -= 18;
    else if (summary.visitorToSignupRate < 4) score -= 8;

    if (summary.signups > 0 && summary.signupToCheckoutRate < 8) score -= 14;
    if (summary.checkoutStarted > 0 && summary.checkoutToPurchaseRate < 20) score -= 16;
    else if (summary.checkoutStarted > 0 && summary.checkoutToPurchaseRate < 45) score -= 8;

    if (failureRate > 10) score -= 10;
    else if (failureRate > 3) score -= 5;

    if (errorRate > 5) score -= 10;
    else if (errorRate > 1) score -= 4;

    if ((userStats.activeSubscribers || 0) === 0 && summary.purchases === 0) score -= 8;

    return clampScore(score);
}

export function buildBusinessReport({
    analyticsReport = {},
    previousAnalyticsReport = {},
    funnelReport = {},
    previousFunnelReport = {},
    userStats = {},
    days = DEFAULT_BUSINESS_DAYS
} = {}) {
    const summary = businessPeriodSummary(analyticsReport, funnelReport);
    const previousSummary = businessPeriodSummary(previousAnalyticsReport, previousFunnelReport);
    const activeSubscriptions = userStats.activeSubscriptions || [];
    const normalizedUserStats = {
        totalUsers: userStats.totalUsers || 0,
        newUsers: userStats.newUsers || 0,
        activeSubscribers: userStats.activeSubscribersCount ?? activeSubscriptions.length,
        estimatedMrrCzk: userStats.estimatedMrrCzk ?? estimateMrrCzk(activeSubscriptions)
    };

    return {
        generatedAt: new Date().toISOString(),
        periodDays: days,
        score: calculateBusinessScore(summary, normalizedUserStats, analyticsReport),
        summary,
        previousSummary,
        deltas: {
            visitors: countDelta(summary.visitors, previousSummary.visitors),
            signups: countDelta(summary.signups, previousSummary.signups),
            checkoutStarted: countDelta(summary.checkoutStarted, previousSummary.checkoutStarted),
            purchases: countDelta(summary.purchases, previousSummary.purchases),
            estimatedValueCzk: countDelta(summary.estimatedValueCzk, previousSummary.estimatedValueCzk)
        },
        userStats: normalizedUserStats,
        signals: buildBusinessSignals(summary, normalizedUserStats, analyticsReport),
        recommendedActions: buildBusinessActions(summary, previousSummary, normalizedUserStats, analyticsReport),
        topAcquisition: analyticsReport.attributionSegments || [],
        topFunnelSegments: funnelReport.sourceFeatureSegments || [],
        topPages: analyticsReport.topPaths || []
    };
}

export function buildFunnelReport(events = [], { days = DEFAULT_FUNNEL_DAYS, since = null, previousSince = null, periodEnd = null, limit = DEFAULT_FUNNEL_LIMIT } = {}) {
    const {
        hasComparison,
        currentEvents,
        previousEvents
    } = splitComparisonEvents(events, { since, previousSince, periodEnd });
    const byEvent = {};
    const bySource = {};
    const byFeature = {};
    const byPlan = {};
    const byDay = {};
    let estimatedMinorValue = 0;

    for (const event of currentEvents) {
        const eventName = normalizeDimension(event.event_name) || 'unknown';
        incrementCounter(byEvent, eventName);

        incrementCounter(bySource, normalizeDimension(event.source) || '(direct)');
        incrementCounter(byFeature, normalizeDimension(event.feature) || '(nezadano)');
        incrementCounter(byPlan, normalizeDimension(event.plan_id) || normalizeDimension(event.plan_type) || '(nezadano)');

        estimatedMinorValue += estimateEventMinorValue(event);

        const date = getEventDate(event.created_at);
        if (date) {
            if (!byDay[date]) byDay[date] = createDailyBucket(date);

            if (eventName === 'paywall_viewed' || eventName === 'login_gate_viewed') byDay[date].paywallViewed += 1;
            if (eventName === 'checkout_session_created') byDay[date].checkoutStarted += 1;
            if (eventName === 'subscription_checkout_completed') byDay[date].subscriptionCompleted += 1;
            if (eventName === 'one_time_purchase_completed') byDay[date].oneTimeCompleted += 1;
            if (FUNNEL_FAILURE_EVENTS.has(eventName)) byDay[date].failures += 1;
            if (FUNNEL_REFUND_EVENTS.has(eventName)) byDay[date].refunds += 1;
        }
    }

    const paywallViewed = (byEvent.paywall_viewed || 0) + (byEvent.login_gate_viewed || 0);
    const checkoutStarted = byEvent.checkout_session_created || 0;
    const subscriptionCompleted = byEvent.subscription_checkout_completed || 0;
    const oneTimeCompleted = byEvent.one_time_purchase_completed || 0;
    const invoicePaid = byEvent.subscription_invoice_paid || 0;
    const failures = [...FUNNEL_FAILURE_EVENTS].reduce((sum, eventName) => sum + (byEvent[eventName] || 0), 0);
    const refunds = [...FUNNEL_REFUND_EVENTS].reduce((sum, eventName) => sum + (byEvent[eventName] || 0), 0);
    const cancelRequests = byEvent.subscription_cancel_requested || 0;
    const conversionRate = checkoutStarted > 0
        ? Math.round((subscriptionCompleted / checkoutStarted) * 1000) / 10
        : 0;
    const paywallToCheckoutRate = paywallViewed > 0
        ? Math.round((checkoutStarted / paywallViewed) * 1000) / 10
        : 0;

    return {
        generatedAt: new Date().toISOString(),
        days,
        since,
        previousSince: hasComparison ? previousSince : null,
        periodEnd: hasComparison ? periodEnd : null,
        limit,
        totalEvents: currentEvents.length,
        metrics: {
            paywallViewed,
            checkoutStarted,
            subscriptionCompleted,
            oneTimeCompleted,
            invoicePaid,
            failures,
            refunds,
            cancelRequests,
            conversionRate,
            paywallToCheckoutRate,
            estimatedValueCzk: Math.round(estimatedMinorValue / 100)
        },
        byEvent,
        topSources: topCounter(bySource),
        sourceComparison: hasComparison
            ? buildSourceComparison(currentEvents, previousEvents)
            : [],
        sourceFeatureSegments: buildSourceFeatureSegments(currentEvents, hasComparison ? previousEvents : []),
        tarotCardSegments: buildTarotCardSegments(currentEvents),
        topFeatures: topCounter(byFeature),
        topPlans: topCounter(byPlan),
        daily: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
        recentEvents: currentEvents.slice(0, 50).map(event => ({
            id: event.id,
            eventName: event.event_name,
            source: event.source,
            feature: event.feature,
            planId: event.plan_id,
            planType: event.plan_type,
            createdAt: event.created_at
        }))
    };
}

function csvCell(value) {
    const text = value == null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
}

export function buildFunnelDailyCsv(report) {
    const header = [
        'date',
        'paywall_viewed',
        'checkout_started',
        'subscription_completed',
        'one_time_completed',
        'failures',
        'refunds'
    ];

    const rows = (report.daily || []).map(row => [
        row.date,
        row.paywallViewed,
        row.checkoutStarted,
        row.subscriptionCompleted,
        row.oneTimeCompleted,
        row.failures,
        row.refunds
    ]);

    return [header, ...rows]
        .map(row => row.map(csvCell).join(','))
        .join('\n');
}

export function buildFunnelSegmentsCsv(report) {
    const header = [
        'source',
        'feature',
        'total_events',
        'paywall_viewed',
        'checkout_started',
        'purchase_completed',
        'failures',
        'paywall_to_checkout_rate',
        'checkout_to_purchase_rate',
        'previous_paywall_to_checkout_rate',
        'previous_checkout_to_purchase_rate',
        'paywall_to_checkout_rate_delta',
        'checkout_to_purchase_rate_delta'
    ];

    const rows = (report.sourceFeatureSegments || []).map(row => [
        row.source,
        row.feature,
        row.totalEvents,
        row.paywallViewed,
        row.checkoutStarted,
        row.purchaseCompleted,
        row.failures,
        row.paywallToCheckoutRate,
        row.checkoutToPurchaseRate,
        row.previous?.paywallToCheckoutRate ?? 0,
        row.previous?.checkoutToPurchaseRate ?? 0,
        row.paywallToCheckoutRateDelta,
        row.checkoutToPurchaseRateDelta
    ]);

    return [header, ...rows]
        .map(row => row.map(csvCell).join(','))
        .join('\n');
}

export function buildFunnelTarotCardsCsv(report) {
    const header = [
        'card',
        'entry_source',
        'utm_source',
        'campaign',
        'total_events',
        'paywall_viewed',
        'checkout_started',
        'purchase_completed',
        'failures',
        'paywall_to_checkout_rate',
        'checkout_to_purchase_rate'
    ];

    const rows = (report.tarotCardSegments || []).map(row => [
        row.card,
        row.entrySource,
        row.utmSource,
        row.campaign,
        row.totalEvents,
        row.paywallViewed,
        row.checkoutStarted,
        row.purchaseCompleted,
        row.failures,
        row.paywallToCheckoutRate,
        row.checkoutToPurchaseRate
    ]);

    return [header, ...rows]
        .map(row => row.map(csvCell).join(','))
        .join('\n');
}

function analyticsPathFromEvent(event) {
    const metadata = event?.metadata && typeof event.metadata === 'object' ? event.metadata : {};
    return normalizeDimension(metadata.path || metadata.page) || '(unknown)';
}

const ANALYTICS_REDACTED_VALUE = '[redacted]';

function analyticsVisitorFromEvent(event) {
    const metadata = event?.metadata && typeof event.metadata === 'object' ? event.metadata : {};
    return normalizeDimension(event?.user_id || metadata.clientId || metadata.client_id);
}

function analyticsVisitFromEvent(event) {
    const metadata = event?.metadata && typeof event.metadata === 'object' ? event.metadata : {};
    return normalizeDimension(metadata.visitId || metadata.visit_id || metadata.sessionId || metadata.session_id);
}

function analyticsMetadataFromEvent(event) {
    return event?.metadata && typeof event.metadata === 'object' ? event.metadata : {};
}

function analyticsAttributionValue(metadata, keys, fallback) {
    for (const key of keys) {
        const value = normalizeDimension(metadata[key]);
        if (value) return value;
    }
    return fallback;
}

function createAnalyticsAttributionSegment(source, campaign, medium, entryFeature) {
    return {
        source,
        campaign,
        medium,
        entryFeature,
        totalEvents: 0,
        visitors: 0,
        pageViews: 0,
        ctaClicks: 0,
        signups: 0,
        checkouts: 0,
        purchases: 0,
        errors: 0,
        visitorToSignupRate: 0,
        visitorToCheckoutRate: 0,
        visitorIds: new Set()
    };
}

function getAnalyticsAttributionKey(source, campaign, medium, entryFeature) {
    return `${source}\u0000${campaign}\u0000${medium}\u0000${entryFeature}`;
}

function addAnalyticsAttributionEvent(segments, event) {
    const eventType = normalizeDimension(event.event_type) || 'unknown';
    const metadata = analyticsMetadataFromEvent(event);
    const source = analyticsAttributionValue(metadata, ['first_source', 'last_source', 'referrer_host'], '(direct)');
    const campaign = analyticsAttributionValue(metadata, ['first_campaign', 'last_campaign'], '(none)');
    const medium = analyticsAttributionValue(metadata, ['first_medium', 'last_medium'], '(none)');
    const entryFeature = analyticsAttributionValue(metadata, ['entry_feature', 'feature'], normalizeDimension(event.feature) || '(none)');
    const key = getAnalyticsAttributionKey(source, campaign, medium, entryFeature);

    if (!segments.has(key)) {
        segments.set(key, createAnalyticsAttributionSegment(source, campaign, medium, entryFeature));
    }

    const segment = segments.get(key);
    const visitorId = analyticsVisitorFromEvent(event);
    segment.totalEvents += 1;
    if (visitorId) segment.visitorIds.add(visitorId);
    if (eventType === 'page_view') segment.pageViews += 1;
    if (eventType === 'cta_clicked') segment.ctaClicks += 1;
    if (eventType === 'signup_completed') segment.signups += 1;
    if (eventType === 'begin_checkout') segment.checkouts += 1;
    if (eventType === 'purchase' || eventType === 'purchase_completed') segment.purchases += 1;
    if (eventType === 'client_error' || eventType === 'server_error' || eventType === 'error') segment.errors += 1;
}

function buildAnalyticsAttributionSegments(events, limit = 12) {
    const segments = new Map();

    for (const event of events) {
        addAnalyticsAttributionEvent(segments, event);
    }

    return [...segments.values()]
        .map(segment => {
            const visitors = segment.visitorIds.size;
            return {
                source: segment.source,
                campaign: segment.campaign,
                medium: segment.medium,
                entryFeature: segment.entryFeature,
                totalEvents: segment.totalEvents,
                visitors,
                pageViews: segment.pageViews,
                ctaClicks: segment.ctaClicks,
                signups: segment.signups,
                checkouts: segment.checkouts,
                purchases: segment.purchases,
                errors: segment.errors,
                visitorToSignupRate: visitors > 0 ? Math.round((segment.signups / visitors) * 1000) / 10 : 0,
                visitorToCheckoutRate: visitors > 0 ? Math.round((segment.checkouts / visitors) * 1000) / 10 : 0
            };
        })
        .sort((a, b) => b.checkouts - a.checkouts
            || b.signups - a.signups
            || b.ctaClicks - a.ctaClicks
            || b.pageViews - a.pageViews
            || b.totalEvents - a.totalEvents
            || a.source.localeCompare(b.source)
            || a.campaign.localeCompare(b.campaign))
        .slice(0, limit);
}

function createAnalyticsDailyBucket(date) {
    return {
        date,
        total: 0,
        visitors: 0,
        visits: 0,
        pageViews: 0,
        ctaClicks: 0,
        signups: 0,
        checkouts: 0,
        errors: 0
    };
}

export function buildAnalyticsReport(events = [], { days = DEFAULT_ANALYTICS_DAYS, limit = DEFAULT_ANALYTICS_LIMIT } = {}) {
    const byEvent = {};
    const byFeature = {};
    const byPath = {};
    const byDay = {};
    const visitorIds = new Set();
    const visitIds = new Set();
    const visitorsByDay = {};
    const visitsByDay = {};
    const recentErrors = [];
    const feedback = {
        total: 0,
        yes: 0,
        no: 0,
        positiveRate: null
    };

    for (const event of events.slice(0, limit)) {
        const eventType = normalizeDimension(event.event_type) || 'unknown';
        const feature = normalizeDimension(event.feature) || '(none)';
        const metadata = analyticsMetadataFromEvent(event);
        const path = analyticsPathFromEvent(event);
        const date = getEventDate(event.created_at) || 'unknown';
        const visitorId = analyticsVisitorFromEvent(event);
        const visitId = analyticsVisitFromEvent(event);

        incrementCounter(byEvent, eventType);
        incrementCounter(byFeature, feature);
        incrementCounter(byPath, path);

        if (!byDay[date]) byDay[date] = createAnalyticsDailyBucket(date);
        if (!visitorsByDay[date]) visitorsByDay[date] = new Set();
        if (!visitsByDay[date]) visitsByDay[date] = new Set();

        if (visitorId) {
            visitorIds.add(visitorId);
            visitorsByDay[date].add(visitorId);
        }
        if (visitId && visitId !== ANALYTICS_REDACTED_VALUE) {
            visitIds.add(visitId);
            visitsByDay[date].add(visitId);
        }

        byDay[date].total += 1;
        if (eventType === 'page_view') byDay[date].pageViews += 1;
        if (eventType === 'cta_clicked') byDay[date].ctaClicks += 1;
        if (eventType === 'signup_completed') byDay[date].signups += 1;
        if (eventType === 'begin_checkout') byDay[date].checkouts += 1;
        if (eventType === 'feedback_submitted') {
            const feedbackValue = normalizeDimension(metadata.value)?.toLowerCase();
            feedback.total += 1;
            if (feedbackValue === 'yes') feedback.yes += 1;
            if (feedbackValue === 'no') feedback.no += 1;
        }
        if (eventType === 'client_error' || eventType === 'server_error' || eventType === 'error') {
            byDay[date].errors += 1;
            recentErrors.push({
                id: event.id,
                eventType,
                feature,
                path,
                message: metadata.message || metadata.error || null,
                createdAt: event.created_at
            });
        }
    }

    for (const [date, day] of Object.entries(byDay)) {
        day.visitors = visitorsByDay[date]?.size || 0;
        day.visits = visitsByDay[date]?.size || 0;
    }

    const total = events.length;
    if (feedback.total > 0) {
        feedback.positiveRate = Math.round((feedback.yes / feedback.total) * 100);
    }

    return {
        periodDays: days,
        total,
        summary: {
            visitors: visitorIds.size,
            visits: visitIds.size,
            pageViews: byEvent.page_view || 0,
            ctaClicks: byEvent.cta_clicked || 0,
            signups: byEvent.signup_completed || 0,
            checkouts: byEvent.begin_checkout || 0,
            clientErrors: byEvent.client_error || 0,
            serverErrors: byEvent.server_error || 0,
            feedback
        },
        byEvent,
        topFeatures: topCounter(byFeature),
        topPaths: topCounter(byPath),
        attributionSegments: buildAnalyticsAttributionSegments(events.slice(0, limit)),
        daily: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
        recentErrors: recentErrors.slice(0, 25)
    };
}

export function buildAnalyticsDailyCsv(report) {
    const header = ['date', 'total', 'visitors', 'visits', 'page_views', 'cta_clicks', 'signups', 'checkouts', 'errors'];
    const rows = report.daily.map((day) => [
        day.date,
        day.total,
        day.visitors,
        day.visits,
        day.pageViews,
        day.ctaClicks,
        day.signups,
        day.checkouts,
        day.errors
    ].map(csvCell).join(','));

    return [header.join(','), ...rows].join('\n');
}

export function buildAnalyticsAttributionCsv(report) {
    const header = [
        'source',
        'campaign',
        'medium',
        'entry_feature',
        'total_events',
        'visitors',
        'page_views',
        'cta_clicks',
        'signups',
        'checkouts',
        'purchases',
        'errors',
        'visitor_to_signup_rate',
        'visitor_to_checkout_rate'
    ];
    const rows = (report.attributionSegments || []).map((segment) => [
        segment.source,
        segment.campaign,
        segment.medium,
        segment.entryFeature,
        segment.totalEvents,
        segment.visitors,
        segment.pageViews,
        segment.ctaClicks,
        segment.signups,
        segment.checkouts,
        segment.purchases,
        segment.errors,
        segment.visitorToSignupRate,
        segment.visitorToCheckoutRate
    ].map(csvCell).join(','));

    return [header.join(','), ...rows].join('\n');
}

function filterEventsByWindow(events = [], startIso, endIso) {
    const start = getEventTime(startIso);
    const end = getEventTime(endIso);

    return (events || []).filter(event => {
        const eventTime = getEventTime(event.created_at);
        if (!Number.isFinite(eventTime)) return false;
        return eventTime >= start && eventTime < end;
    });
}

async function fetchBusinessUserStats(since, nowIso) {
    const [
        totalUsersResult,
        newUsersResult,
        activeSubscriptionsResult
    ] = await Promise.all([
        supabase
            .from('users')
            .select('id', { count: 'exact', head: true }),
        supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', since),
        supabase
            .from('subscriptions')
            .select('plan_type, status, current_period_end')
            .eq('status', 'active')
            .gte('current_period_end', nowIso)
            .limit(DEFAULT_BUSINESS_LIMIT)
    ]);

    if (totalUsersResult.error) throw totalUsersResult.error;
    if (newUsersResult.error) throw newUsersResult.error;
    if (activeSubscriptionsResult.error) throw activeSubscriptionsResult.error;

    const activeSubscriptions = activeSubscriptionsResult.data || [];

    return {
        totalUsers: totalUsersResult.count || 0,
        newUsers: newUsersResult.count || 0,
        activeSubscriptions,
        activeSubscribersCount: activeSubscriptions.length,
        estimatedMrrCzk: estimateMrrCzk(activeSubscriptions)
    };
}

function normalizeModerationStatus(value) {
    if (value === 'approved' || value === 'all') return value;
    return 'pending';
}

function normalizeAdminListLimit(value, fallback = 50, max = 100) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(1, parsed));
}

function normalizePositiveIntegerId(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// Angel Post moderation queue
router.get('/angel-messages', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const status = normalizeModerationStatus(req.query.status);
        const limit = normalizeAdminListLimit(req.query.limit);
        const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);

        let query = supabase
            .from('angel_messages')
            .select('id, nickname, message, category, likes, approved, created_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status === 'pending') query = query.eq('approved', false);
        if (status === 'approved') query = query.eq('approved', true);

        const { data, error, count } = await query;
        if (error) throw error;

        res.json({
            success: true,
            status,
            messages: data || [],
            pagination: {
                limit,
                offset,
                total: count ?? (data || []).length
            }
        });
    } catch (error) {
        console.error('Admin Angel Messages Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se načíst andělské vzkazy.' });
    }
});

router.patch('/angel-messages/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const id = normalizePositiveIntegerId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'Neplatné ID vzkazu.' });
        }

        if (typeof req.body.approved !== 'boolean') {
            return res.status(400).json({ success: false, error: 'Hodnota approved musí být boolean.' });
        }

        const { data, error } = await supabase
            .from('angel_messages')
            .update({ approved: req.body.approved })
            .eq('id', id)
            .select('id, approved')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: data
        });
    } catch (error) {
        console.error('Admin Angel Message Update Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se upravit andělský vzkaz.' });
    }
});

router.delete('/angel-messages/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const id = normalizePositiveIntegerId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'Neplatné ID vzkazu.' });
        }

        const { error } = await supabase
            .from('angel_messages')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Admin Angel Message Delete Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se smazat andělský vzkaz.' });
    }
});

// Get all users with their subscriptions (with pagination)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 50);
        const offset = (page - 1) * limit;

        // Fetch users with pagination
        const { data: users, error, count } = await supabase
            .from('users')
            .select(`
                id,
                email,
                first_name,
                created_at,
                subscriptions (
                    plan_type,
                    status,
                    current_period_end
                )
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            success: true,
            users,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Admin Users Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se načíst uživatele.' });
    }
});

// Monetization funnel report
router.get('/funnel', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const days = normalizeFunnelDays(req.query.days);
        const limit = normalizeFunnelLimit(req.query.limit);
        const queryLimit = Math.min(MAX_FUNNEL_LIMIT, limit * 2);
        const periodEndDate = new Date();
        const sinceDate = new Date(periodEndDate.getTime() - days * 24 * 60 * 60 * 1000);
        const previousSinceDate = new Date(periodEndDate.getTime() - days * 2 * 24 * 60 * 60 * 1000);
        const since = sinceDate.toISOString();
        const previousSince = previousSinceDate.toISOString();
        const periodEnd = periodEndDate.toISOString();

        const { data: events, error } = await supabase
            .from('funnel_events')
            .select(`
                id,
                user_id,
                event_name,
                source,
                feature,
                plan_id,
                plan_type,
                stripe_session_id,
                stripe_event_id,
                metadata,
                created_at
            `)
            .gte('created_at', previousSince)
            .order('created_at', { ascending: false })
            .limit(queryLimit);

        if (error) throw error;

        const report = buildFunnelReport(events || [], { days, since, previousSince, periodEnd, limit });

        if (req.query.format === 'csv') {
            const csvView = ['segments', 'tarot-cards'].includes(req.query.view) ? req.query.view : 'daily';
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="funnel-${csvView}-${days}d.csv"`);
            if (csvView === 'segments') return res.send(buildFunnelSegmentsCsv(report));
            if (csvView === 'tarot-cards') return res.send(buildFunnelTarotCardsCsv(report));
            return res.send(buildFunnelDailyCsv(report));
        }

        res.json({
            success: true,
            report
        });
    } catch (error) {
        console.error('Admin Funnel Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se načíst funnel report.' });
    }
});

// First-party analytics report
router.get('/analytics', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const days = normalizeAnalyticsDays(req.query.days);
        const limit = normalizeAnalyticsLimit(req.query.limit);
        const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const { data: events, error } = await supabase
            .from('analytics_events')
            .select(`
                id,
                user_id,
                event_type,
                feature,
                metadata,
                created_at
            `)
            .gte('created_at', sinceDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        const report = buildAnalyticsReport(events || [], { days, limit });

        if (req.query.format === 'csv') {
            const csvView = req.query.view === 'attribution' ? 'attribution' : 'daily';
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="analytics-${csvView}-${days}d.csv"`);
            return res.send(csvView === 'attribution'
                ? buildAnalyticsAttributionCsv(report)
                : buildAnalyticsDailyCsv(report));
        }

        res.json({
            success: true,
            report
        });
    } catch (error) {
        console.error('Admin Analytics Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se načíst analytics report.' });
    }
});

// Business cockpit: acquisition, activation, monetization and prioritized next actions
router.get('/business', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const days = normalizeBusinessDays(req.query.days);
        const periodEndDate = new Date();
        const sinceDate = new Date(periodEndDate.getTime() - days * 24 * 60 * 60 * 1000);
        const previousSinceDate = new Date(periodEndDate.getTime() - days * 2 * 24 * 60 * 60 * 1000);
        const periodEnd = periodEndDate.toISOString();
        const since = sinceDate.toISOString();
        const previousSince = previousSinceDate.toISOString();

        const [
            analyticsEventsResult,
            funnelEventsResult,
            userStats
        ] = await Promise.all([
            supabase
                .from('analytics_events')
                .select(`
                    id,
                    user_id,
                    event_type,
                    feature,
                    metadata,
                    created_at
                `)
                .gte('created_at', previousSince)
                .order('created_at', { ascending: false })
                .limit(DEFAULT_BUSINESS_LIMIT),
            supabase
                .from('funnel_events')
                .select(`
                    id,
                    user_id,
                    event_name,
                    source,
                    feature,
                    plan_id,
                    plan_type,
                    stripe_session_id,
                    stripe_event_id,
                    metadata,
                    created_at
                `)
                .gte('created_at', previousSince)
                .order('created_at', { ascending: false })
                .limit(DEFAULT_BUSINESS_LIMIT),
            fetchBusinessUserStats(since, periodEnd)
        ]);

        if (analyticsEventsResult.error) throw analyticsEventsResult.error;
        if (funnelEventsResult.error) throw funnelEventsResult.error;

        const analyticsEvents = analyticsEventsResult.data || [];
        const funnelEvents = funnelEventsResult.data || [];
        const currentAnalyticsEvents = filterEventsByWindow(analyticsEvents, since, periodEnd);
        const previousAnalyticsEvents = filterEventsByWindow(analyticsEvents, previousSince, since);
        const currentFunnelEvents = filterEventsByWindow(funnelEvents, since, periodEnd);
        const previousFunnelEvents = filterEventsByWindow(funnelEvents, previousSince, since);
        const analyticsReport = buildAnalyticsReport(currentAnalyticsEvents, { days, limit: DEFAULT_BUSINESS_LIMIT });
        const previousAnalyticsReport = buildAnalyticsReport(previousAnalyticsEvents, { days, limit: DEFAULT_BUSINESS_LIMIT });
        const funnelReport = buildFunnelReport(currentFunnelEvents, { days, since, limit: DEFAULT_BUSINESS_LIMIT });
        const previousFunnelReport = buildFunnelReport(previousFunnelEvents, { days, since: previousSince, periodEnd: since, limit: DEFAULT_BUSINESS_LIMIT });

        res.json({
            success: true,
            report: buildBusinessReport({
                analyticsReport,
                previousAnalyticsReport,
                funnelReport,
                previousFunnelReport,
                userStats,
                days
            })
        });
    } catch (error) {
        console.error('Admin Business Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se načíst business cockpit.' });
    }
});

// Update user subscription manually
router.post('/user/:userId/subscription', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { plan_type } = req.body;

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
            return res.status(400).json({ success: false, error: 'Neplatné ID uživatele.' });
        }

        if (!plan_type || typeof plan_type !== 'string') {
            return res.status(400).json({ success: false, error: 'Typ plánu je povinný.' });
        }

        const VALID_PLAN_TYPES = ['free', 'premium_monthly', 'exclusive_monthly', 'vip_majestrat'];
        if (!VALID_PLAN_TYPES.includes(plan_type)) {
            return res.status(400).json({ success: false, error: `Neplatný typ plánu. Povolené hodnoty: ${VALID_PLAN_TYPES.join(', ')}` });
        }

        // Set expiry based on plan type
        const expiryDate = new Date();
        if (plan_type.includes('yearly')) {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        } else if (plan_type === 'free') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 100);
        } else {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
        }
        console.log(`[ADMIN] Subscription override: user=${userId}, plan=${plan_type}, expires=${expiryDate.toISOString()}, by admin=${req.user.email}`);

        const subData = {
            user_id: userId,
            plan_type: plan_type,
            status: 'active',
            current_period_end: expiryDate.toISOString()
        };

        const { error } = await supabase
            .from('subscriptions')
            .upsert(subData, { onConflict: 'user_id' });

        if (error) throw error;

        // Also update is_premium flag in users table
        await supabase
            .from('users')
            .update({ is_premium: plan_type !== 'free' })
            .eq('id', userId);

        res.json({ success: true, message: `User plan updated to ${plan_type}` });
    } catch (error) {
        console.error('Admin Update Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se aktualizovat předplatné.' });
    }
});

export default router;
