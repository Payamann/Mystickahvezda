import express from 'express';
import { supabase } from './db-supabase.js';
import { authenticateToken, requireAdmin } from './middleware.js';
import { SUBSCRIPTION_PLANS } from './config/constants.js';

const router = express.Router();

const DEFAULT_FUNNEL_DAYS = 30;
const MAX_FUNNEL_DAYS = 365;
const DEFAULT_FUNNEL_LIMIT = 1000;
const MAX_FUNNEL_LIMIT = 5000;

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

function addSourceFeatureEvent(segments, event) {
    const eventName = normalizeDimension(event.event_name) || 'unknown';
    const source = normalizeDimension(event.source) || '(direct)';
    const feature = normalizeDimension(event.feature) || '(nezadano)';
    const key = getSourceFeatureSegmentKey(source, feature);

    if (!segments.has(key)) {
        segments.set(key, createSourceFeatureSegment(source, feature));
    }

    const segment = segments.get(key);
    segment.totalEvents += 1;

    if (eventName === 'paywall_viewed' || eventName === 'login_gate_viewed') segment.paywallViewed += 1;
    if (eventName === 'checkout_session_created') segment.checkoutStarted += 1;
    if (eventName === 'subscription_checkout_completed' || eventName === 'one_time_purchase_completed') segment.purchaseCompleted += 1;
    if (FUNNEL_FAILURE_EVENTS.has(eventName)) segment.failures += 1;
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
            const csvView = req.query.view === 'segments' ? 'segments' : 'daily';
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="funnel-${csvView}-${days}d.csv"`);
            return res.send(csvView === 'segments'
                ? buildFunnelSegmentsCsv(report)
                : buildFunnelDailyCsv(report));
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
