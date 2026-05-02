import {
    buildAnalyticsAttributionCsv,
    buildAnalyticsDailyCsv,
    buildAnalyticsReport,
    buildFunnelDailyCsv,
    buildFunnelReport,
    buildFunnelSegmentsCsv,
    buildFunnelTarotCardsCsv,
    normalizeAnalyticsDays,
    normalizeAnalyticsLimit,
    normalizeFunnelDays,
    normalizeFunnelLimit
} from '../admin.js';
import request from 'supertest';
import app from '../index.js';
import jwt from 'jsonwebtoken';
import { supabase } from '../db-supabase.js';

describe('Admin funnel report helpers', () => {
    test('normalizes report query bounds', () => {
        expect(normalizeFunnelDays(undefined)).toBe(30);
        expect(normalizeFunnelDays('0')).toBe(1);
        expect(normalizeFunnelDays('999')).toBe(365);
        expect(normalizeFunnelDays('90')).toBe(90);

        expect(normalizeFunnelLimit(undefined)).toBe(1000);
        expect(normalizeFunnelLimit('12')).toBe(100);
        expect(normalizeFunnelLimit('9000')).toBe(5000);
        expect(normalizeFunnelLimit('1500')).toBe(1500);
    });

    test('aggregates monetization events into dashboard metrics', () => {
        const report = buildFunnelReport([
            {
                id: 'evt-1',
                event_name: 'checkout_session_created',
                source: 'pricing',
                feature: 'tarot',
                plan_id: 'pruvodce',
                created_at: '2026-04-20T10:00:00.000Z',
                metadata: { amount: 19900 }
            },
            {
                id: 'evt-2',
                event_name: 'checkout_session_created',
                source: 'pricing',
                feature: 'mentor',
                plan_id: 'osviceni',
                created_at: '2026-04-20T10:10:00.000Z',
                metadata: { amount: 49900 }
            },
            {
                id: 'evt-3',
                event_name: 'subscription_checkout_completed',
                source: 'pricing',
                feature: 'tarot',
                plan_id: 'pruvodce',
                plan_type: 'premium_monthly',
                created_at: '2026-04-20T10:20:00.000Z',
                metadata: { status: 'active' }
            },
            {
                id: 'evt-4',
                event_name: 'one_time_purchase_completed',
                source: 'rocni-horoskop',
                feature: 'rocni_horoskop',
                created_at: '2026-04-21T08:00:00.000Z',
                metadata: { amount: 29900 }
            },
            {
                id: 'evt-5',
                event_name: 'checkout_session_failed',
                source: 'pricing',
                feature: 'mentor',
                plan_id: 'osviceni',
                created_at: '2026-04-21T09:00:00.000Z',
                metadata: {}
            },
            {
                id: 'evt-6',
                event_name: 'subscription_payment_failed',
                source: 'email',
                feature: 'renewal',
                plan_type: 'premium_monthly',
                created_at: '2026-04-22T09:00:00.000Z',
                metadata: {}
            },
            {
                id: 'evt-7',
                event_name: 'payment_refunded',
                source: 'support',
                feature: 'refund',
                created_at: '2026-04-23T09:00:00.000Z',
                metadata: {}
            },
            {
                id: 'evt-8',
                event_name: 'subscription_cancel_requested',
                source: 'profile',
                feature: 'billing',
                created_at: '2026-04-24T09:00:00.000Z',
                metadata: {}
            }
        ], {
            days: 30,
            since: '2026-03-26T00:00:00.000Z',
            limit: 1000
        });

        expect(report.totalEvents).toBe(8);
        expect(report.metrics.checkoutStarted).toBe(2);
        expect(report.metrics.paywallViewed).toBe(0);
        expect(report.metrics.paywallToCheckoutRate).toBe(0);
        expect(report.metrics.subscriptionCompleted).toBe(1);
        expect(report.metrics.oneTimeCompleted).toBe(1);
        expect(report.metrics.failures).toBe(2);
        expect(report.metrics.refunds).toBe(1);
        expect(report.metrics.cancelRequests).toBe(1);
        expect(report.metrics.conversionRate).toBe(50);
        expect(report.metrics.estimatedValueCzk).toBe(498);
        expect(report.topSources[0]).toEqual({ key: 'pricing', count: 4 });
        expect(report.topPlans).toContainEqual({ key: 'pruvodce', count: 2 });
        expect(report.daily).toContainEqual(expect.objectContaining({
            date: '2026-04-20',
            checkoutStarted: 2,
            subscriptionCompleted: 1,
            oneTimeCompleted: 0,
            failures: 0,
            refunds: 0
        }));
        expect(report.recentEvents).toHaveLength(8);
    });

    test('calculates paywall to checkout rate', () => {
        const report = buildFunnelReport([
            { event_name: 'paywall_viewed', source: 'inline_paywall', feature: 'tarot', created_at: '2026-04-20T10:00:00.000Z' },
            { event_name: 'paywall_viewed', source: 'inline_paywall', feature: 'tarot', created_at: '2026-04-20T10:01:00.000Z' },
            { event_name: 'login_gate_viewed', source: 'inline_login_gate', feature: 'mentor', created_at: '2026-04-20T10:02:00.000Z' },
            { event_name: 'login_gate_viewed', source: 'inline_login_gate', feature: 'mentor', created_at: '2026-04-20T10:03:00.000Z' },
            { event_name: 'checkout_session_created', source: 'inline_paywall', feature: 'tarot', created_at: '2026-04-20T10:04:00.000Z' },
            { event_name: 'checkout_session_created', source: 'inline_login_gate', feature: 'mentor', created_at: '2026-04-20T10:05:00.000Z' },
        ]);

        expect(report.metrics.paywallViewed).toBe(4);
        expect(report.metrics.checkoutStarted).toBe(2);
        expect(report.metrics.paywallToCheckoutRate).toBe(50);
        expect(report.daily[0]).toEqual(expect.objectContaining({
            date: '2026-04-20',
            paywallViewed: 4,
            checkoutStarted: 2
        }));
    });

    test('compares source volume against the previous period', () => {
        const report = buildFunnelReport([
            { id: 'current-1', event_name: 'paywall_viewed', source: 'pricing', created_at: '2026-04-24T10:00:00.000Z' },
            { id: 'current-2', event_name: 'checkout_session_created', source: 'pricing', created_at: '2026-04-24T10:05:00.000Z' },
            { id: 'current-3', event_name: 'checkout_session_created', source: 'email', created_at: '2026-04-25T10:05:00.000Z' },
            { id: 'previous-1', event_name: 'paywall_viewed', source: 'pricing', created_at: '2026-04-17T10:00:00.000Z' },
            { id: 'previous-2', event_name: 'checkout_session_created', source: 'profile', created_at: '2026-04-18T10:05:00.000Z' },
            { id: 'previous-3', event_name: 'checkout_session_created', source: 'profile', created_at: '2026-04-18T10:10:00.000Z' },
            { id: 'old-1', event_name: 'checkout_session_created', source: 'pricing', created_at: '2026-04-01T10:05:00.000Z' },
        ], {
            days: 7,
            previousSince: '2026-04-13T00:00:00.000Z',
            since: '2026-04-20T00:00:00.000Z',
            periodEnd: '2026-04-27T00:00:00.000Z'
        });

        expect(report.totalEvents).toBe(3);
        expect(report.metrics.checkoutStarted).toBe(2);
        expect(report.recentEvents.map(event => event.id)).toEqual(['current-1', 'current-2', 'current-3']);
        expect(report.sourceComparison).toContainEqual({
            key: 'pricing',
            current: 2,
            previous: 1,
            delta: 1,
            deltaPercent: 100
        });
        expect(report.sourceComparison).toContainEqual({
            key: 'email',
            current: 1,
            previous: 0,
            delta: 1,
            deltaPercent: null
        });
        expect(report.sourceComparison).toContainEqual({
            key: 'profile',
            current: 0,
            previous: 2,
            delta: -2,
            deltaPercent: -100
        });
    });

    test('builds source and feature conversion segments', () => {
        const report = buildFunnelReport([
            { event_name: 'paywall_viewed', source: 'pricing', feature: 'tarot', created_at: '2026-04-20T10:00:00.000Z' },
            { event_name: 'paywall_viewed', source: 'pricing', feature: 'tarot', created_at: '2026-04-20T10:01:00.000Z' },
            { event_name: 'checkout_session_created', source: 'pricing', feature: 'tarot', created_at: '2026-04-20T10:02:00.000Z' },
            { event_name: 'subscription_checkout_completed', source: 'pricing', feature: 'tarot', created_at: '2026-04-20T10:03:00.000Z' },
            { event_name: 'paywall_viewed', source: 'inline_paywall', feature: 'mentor', created_at: '2026-04-20T10:04:00.000Z' },
            { event_name: 'checkout_session_failed', source: 'inline_paywall', feature: 'mentor', created_at: '2026-04-20T10:05:00.000Z' },
        ]);

        expect(report.sourceFeatureSegments[0]).toMatchObject({
            source: 'pricing',
            feature: 'tarot',
            totalEvents: 4,
            paywallViewed: 2,
            checkoutStarted: 1,
            purchaseCompleted: 1,
            failures: 0,
            paywallToCheckoutRate: 50,
            checkoutToPurchaseRate: 100
        });
        expect(report.sourceFeatureSegments[0].previous).toMatchObject({
            totalEvents: 0,
            paywallViewed: 0,
            checkoutStarted: 0,
            purchaseCompleted: 0,
            paywallToCheckoutRate: 0,
            checkoutToPurchaseRate: 0
        });
        expect(report.sourceFeatureSegments[0].paywallToCheckoutRateDelta).toBeNull();
        expect(report.sourceFeatureSegments[0].checkoutToPurchaseRateDelta).toBeNull();

        expect(report.sourceFeatureSegments).toContainEqual(expect.objectContaining({
            source: 'inline_paywall',
            feature: 'mentor',
            totalEvents: 2,
            paywallViewed: 1,
            checkoutStarted: 0,
            purchaseCompleted: 0,
            failures: 1,
            paywallToCheckoutRate: 0,
            checkoutToPurchaseRate: 0
        }));
    });

    test('compares source and feature conversion segments against the previous period', () => {
        const report = buildFunnelReport([
            { event_name: 'paywall_viewed', source: 'pricing', feature: 'tarot', created_at: '2026-04-17T10:00:00.000Z' },
            { event_name: 'checkout_session_created', source: 'pricing', feature: 'tarot', created_at: '2026-04-17T10:01:00.000Z' },
            { event_name: 'paywall_viewed', source: 'pricing', feature: 'tarot', created_at: '2026-04-24T10:00:00.000Z' },
            { event_name: 'paywall_viewed', source: 'pricing', feature: 'tarot', created_at: '2026-04-24T10:01:00.000Z' },
            { event_name: 'checkout_session_created', source: 'pricing', feature: 'tarot', created_at: '2026-04-24T10:02:00.000Z' },
            { event_name: 'subscription_checkout_completed', source: 'pricing', feature: 'tarot', created_at: '2026-04-24T10:03:00.000Z' },
        ], {
            since: '2026-04-24T00:00:00.000Z',
            previousSince: '2026-04-17T00:00:00.000Z',
            periodEnd: '2026-04-25T00:00:00.000Z'
        });

        expect(report.sourceFeatureSegments[0]).toMatchObject({
            source: 'pricing',
            feature: 'tarot',
            totalEvents: 4,
            paywallToCheckoutRate: 50,
            checkoutToPurchaseRate: 100,
            paywallToCheckoutRateDelta: -50,
            checkoutToPurchaseRateDelta: 100,
            previous: expect.objectContaining({
                totalEvents: 2,
                paywallViewed: 1,
                checkoutStarted: 1,
                purchaseCompleted: 0,
                paywallToCheckoutRate: 100,
                checkoutToPurchaseRate: 0
            })
        });
    });

    test('exports daily funnel report as CSV', () => {
        const report = buildFunnelReport([
            { event_name: 'paywall_viewed', source: 'inline_paywall', feature: 'tarot', created_at: '2026-04-20T10:00:00.000Z' },
            { event_name: 'checkout_session_created', source: 'inline_paywall', feature: 'tarot', created_at: '2026-04-20T10:04:00.000Z' },
            { event_name: 'subscription_checkout_completed', source: 'pricing', feature: 'tarot', plan_id: 'pruvodce', created_at: '2026-04-21T10:04:00.000Z' },
        ]);

        expect(buildFunnelDailyCsv(report)).toBe([
            '"date","paywall_viewed","checkout_started","subscription_completed","one_time_completed","failures","refunds"',
            '"2026-04-20","1","1","0","0","0","0"',
            '"2026-04-21","0","0","1","0","0","0"'
        ].join('\n'));
    });

    test('exports source and feature segments as CSV', () => {
        const report = buildFunnelReport([
            { event_name: 'paywall_viewed', source: 'pricing', feature: 'tarot', created_at: '2026-04-20T10:00:00.000Z' },
            { event_name: 'checkout_session_created', source: 'pricing', feature: 'tarot', created_at: '2026-04-20T10:01:00.000Z' },
            { event_name: 'subscription_checkout_completed', source: 'pricing', feature: 'tarot', created_at: '2026-04-20T10:02:00.000Z' },
        ]);

        expect(buildFunnelSegmentsCsv(report)).toBe([
            '"source","feature","total_events","paywall_viewed","checkout_started","purchase_completed","failures","paywall_to_checkout_rate","checkout_to_purchase_rate","previous_paywall_to_checkout_rate","previous_checkout_to_purchase_rate","paywall_to_checkout_rate_delta","checkout_to_purchase_rate_delta"',
            '"pricing","tarot","3","1","1","1","0","100","100","0","0","",""'
        ].join('\n'));
    });

    test('builds tarot card conversion segments from funnel metadata', () => {
        const hvezdaMetadata = {
            requested_card: 'Hvězda',
            entry_source: 'tarot_card_detail',
            utm_source: 'pinterest',
            utm_campaign: 'tarot_card_hvezda'
        };
        const smrtMetadata = {
            requested_card: 'Smrt',
            entry_source: 'tarot_card_detail',
            utm_source: 'pinterest',
            utm_campaign: 'tarot_card_smrt'
        };
        const report = buildFunnelReport([
            { event_name: 'paywall_viewed', source: 'tarot_teaser_banner', feature: 'tarot_multi_card', created_at: '2026-04-20T10:00:00.000Z', metadata: hvezdaMetadata },
            { event_name: 'checkout_session_created', source: 'tarot_teaser_banner', feature: 'tarot_multi_card', created_at: '2026-04-20T10:01:00.000Z', metadata: hvezdaMetadata },
            { event_name: 'subscription_checkout_completed', source: 'tarot_teaser_banner', feature: 'tarot_multi_card', created_at: '2026-04-20T10:02:00.000Z', metadata: hvezdaMetadata },
            { event_name: 'paywall_viewed', source: 'tarot_teaser_banner', feature: 'tarot_multi_card', created_at: '2026-04-20T10:03:00.000Z', metadata: smrtMetadata },
            { event_name: 'checkout_session_failed', source: 'tarot_teaser_banner', feature: 'tarot_multi_card', created_at: '2026-04-20T10:04:00.000Z', metadata: smrtMetadata },
        ]);

        expect(report.tarotCardSegments[0]).toMatchObject({
            card: 'Hvězda',
            entrySource: 'tarot_card_detail',
            utmSource: 'pinterest',
            campaign: 'tarot_card_hvezda',
            totalEvents: 3,
            paywallViewed: 1,
            checkoutStarted: 1,
            purchaseCompleted: 1,
            failures: 0,
            paywallToCheckoutRate: 100,
            checkoutToPurchaseRate: 100
        });
        expect(report.tarotCardSegments[1]).toMatchObject({
            card: 'Smrt',
            campaign: 'tarot_card_smrt',
            failures: 1
        });
        expect(buildFunnelTarotCardsCsv(report)).toBe([
            '"card","entry_source","utm_source","campaign","total_events","paywall_viewed","checkout_started","purchase_completed","failures","paywall_to_checkout_rate","checkout_to_purchase_rate"',
            '"Hvězda","tarot_card_detail","pinterest","tarot_card_hvezda","3","1","1","1","0","100","100"',
            '"Smrt","tarot_card_detail","pinterest","tarot_card_smrt","2","1","0","0","1","0","0"'
        ].join('\n'));
    });
});

describe('Admin first-party analytics helpers', () => {
    test('normalizes analytics report query bounds', () => {
        expect(normalizeAnalyticsDays(undefined)).toBe(7);
        expect(normalizeAnalyticsDays('0')).toBe(1);
        expect(normalizeAnalyticsDays('120')).toBe(90);
        expect(normalizeAnalyticsLimit(undefined)).toBe(1000);
        expect(normalizeAnalyticsLimit('12')).toBe(100);
        expect(normalizeAnalyticsLimit('9000')).toBe(5000);
    });

    test('aggregates first-party analytics into daily and error summaries', () => {
        const report = buildAnalyticsReport([
            {
                id: 'evt-1',
                event_type: 'page_view',
                feature: null,
                metadata: { path: '/', clientId: 'client-1', visitId: 'visit-1' },
                created_at: '2026-04-28T08:00:00.000Z'
            },
            {
                id: 'evt-2',
                event_type: 'cta_clicked',
                feature: 'daily_guidance',
                metadata: { path: '/', label: 'Začít zdarma', clientId: 'client-1', visitId: 'visit-1' },
                created_at: '2026-04-28T08:10:00.000Z'
            },
            {
                id: 'evt-3',
                event_type: 'client_error',
                feature: 'homepage',
                metadata: { path: '/', message: 'Script failed', clientId: 'client-2', visitId: 'visit-2' },
                created_at: '2026-04-28T08:20:00.000Z'
            },
            {
                id: 'evt-4',
                event_type: 'feedback_submitted',
                feature: null,
                metadata: { path: '/', value: 'yes' },
                created_at: '2026-04-28T08:30:00.000Z'
            },
            {
                id: 'evt-5',
                event_type: 'feedback_submitted',
                feature: null,
                metadata: { path: '/', value: 'no' },
                created_at: '2026-04-28T08:40:00.000Z'
            }
        ], { days: 7 });

        expect(report.summary).toMatchObject({
            visitors: 2,
            visits: 2,
            pageViews: 1,
            ctaClicks: 1,
            clientErrors: 1,
            feedback: {
                total: 2,
                yes: 1,
                no: 1,
                positiveRate: 50
            }
        });
        expect(report.topPaths[0]).toEqual({ key: '/', count: 5 });
        expect(report.daily[0]).toMatchObject({
            date: '2026-04-28',
            total: 5,
            visitors: 2,
            visits: 2,
            errors: 1
        });
        expect(report.recentErrors[0]).toMatchObject({
            eventType: 'client_error',
            message: 'Script failed'
        });
        expect(buildAnalyticsDailyCsv(report)).toContain('date,total,visitors,visits,page_views');
        expect(buildAnalyticsDailyCsv(report)).toContain('2026-04-28');
    });

    test('segments first-party analytics by campaign attribution', () => {
        const report = buildAnalyticsReport([
            {
                id: 'pin-1',
                event_type: 'page_view',
                feature: null,
                metadata: {
                    path: '/tarot-vyznam-karet.html',
                    clientId: 'client-pin',
                    visitId: 'visit-pin',
                    first_source: 'pinterest',
                    first_medium: 'organic',
                    first_campaign: 'tarot_meanings',
                    entry_feature: 'tarot'
                },
                created_at: '2026-04-28T08:00:00.000Z'
            },
            {
                id: 'pin-2',
                event_type: 'cta_clicked',
                feature: 'tarot',
                metadata: {
                    path: '/tarot-vyznam-karet.html',
                    clientId: 'client-pin',
                    visitId: 'visit-pin',
                    first_source: 'pinterest',
                    first_medium: 'organic',
                    first_campaign: 'tarot_meanings',
                    entry_feature: 'tarot'
                },
                created_at: '2026-04-28T08:02:00.000Z'
            },
            {
                id: 'pin-3',
                event_type: 'signup_completed',
                feature: 'tarot',
                metadata: {
                    path: '/prihlaseni.html',
                    clientId: 'client-pin',
                    visitId: 'visit-pin',
                    first_source: 'pinterest',
                    first_medium: 'organic',
                    first_campaign: 'tarot_meanings',
                    entry_feature: 'tarot'
                },
                created_at: '2026-04-28T08:04:00.000Z'
            },
            {
                id: 'pin-4',
                event_type: 'begin_checkout',
                feature: 'tarot',
                metadata: {
                    path: '/cenik.html',
                    clientId: 'client-pin',
                    visitId: 'visit-pin',
                    first_source: 'pinterest',
                    first_medium: 'organic',
                    first_campaign: 'tarot_meanings',
                    entry_feature: 'tarot'
                },
                created_at: '2026-04-28T08:06:00.000Z'
            },
            {
                id: 'fb-1',
                event_type: 'page_view',
                feature: null,
                metadata: {
                    path: '/',
                    clientId: 'client-fb',
                    visitId: 'visit-fb',
                    first_source: 'facebook',
                    first_medium: 'social',
                    first_campaign: 'daily_horoscope'
                },
                created_at: '2026-04-28T09:00:00.000Z'
            }
        ], { days: 7 });

        expect(report.attributionSegments[0]).toMatchObject({
            source: 'pinterest',
            campaign: 'tarot_meanings',
            medium: 'organic',
            entryFeature: 'tarot',
            totalEvents: 4,
            visitors: 1,
            pageViews: 1,
            ctaClicks: 1,
            signups: 1,
            checkouts: 1,
            visitorToSignupRate: 100,
            visitorToCheckoutRate: 100
        });
        expect(report.attributionSegments).toContainEqual(expect.objectContaining({
            source: 'facebook',
            campaign: 'daily_horoscope',
            medium: 'social',
            pageViews: 1
        }));
        expect(buildAnalyticsAttributionCsv(report)).toContain('source,campaign,medium,entry_feature');
        expect(buildAnalyticsAttributionCsv(report)).toContain('"pinterest","tarot_meanings","organic","tarot"');
    });
});

describe('Admin funnel API access control', () => {
    test('requires authentication', async () => {
        const res = await request(app).get('/api/admin/funnel');

        expect(res.status).toBe(401);
    });

    test('requires admin privileges', async () => {
        const token = jwt.sign(
            { id: 'user-1', email: 'user@example.com', role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const res = await request(app)
            .get('/api/admin/funnel')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });

    test('admin can export source feature segments as CSV', async () => {
        const source = `route-segment-${Date.now()}`;
        const metadata = {
            requested_card: 'Hvězda',
            entry_source: 'tarot_card_detail',
            utm_source: 'pinterest',
            utm_campaign: 'tarot_card_hvezda'
        };
        await supabase.from('funnel_events').insert([
            {
                event_name: 'paywall_viewed',
                source,
                feature: 'tarot',
                metadata,
                created_at: new Date().toISOString()
            },
            {
                event_name: 'checkout_session_created',
                source,
                feature: 'tarot',
                metadata,
                created_at: new Date().toISOString()
            },
            {
                event_name: 'subscription_checkout_completed',
                source,
                feature: 'tarot',
                plan_id: 'pruvodce',
                metadata,
                created_at: new Date().toISOString()
            }
        ]);

        const token = jwt.sign(
            { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const res = await request(app)
            .get('/api/admin/funnel?days=1&format=csv&view=segments')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.headers['content-disposition']).toContain('funnel-segments-1d.csv');
        expect(res.text).toContain('"source","feature","total_events"');
        expect(res.text).toContain(`"${source}","tarot","3","1","1","1","0","100","100"`);

        const tarotCardsRes = await request(app)
            .get('/api/admin/funnel?days=1&format=csv&view=tarot-cards')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(tarotCardsRes.headers['content-type']).toContain('text/csv');
        expect(tarotCardsRes.headers['content-disposition']).toContain('funnel-tarot-cards-1d.csv');
        expect(tarotCardsRes.text).toContain('"card","entry_source","utm_source","campaign"');
        expect(tarotCardsRes.text).toContain('"Hvězda","tarot_card_detail","pinterest","tarot_card_hvezda","3","1","1","1","0","100","100"');
    });

    test('admin can fetch first-party analytics report and CSV', async () => {
        const uniquePath = `/admin-analytics-test-${Date.now()}`;
        await supabase.from('analytics_events').insert([
            {
                event_type: 'page_view',
                feature: null,
                metadata: {
                    path: uniquePath,
                    clientId: `client-${Date.now()}`,
                    first_source: 'pinterest',
                    first_medium: 'organic',
                    first_campaign: 'admin_analytics_test'
                },
                created_at: new Date().toISOString()
            },
            {
                event_type: 'feedback_submitted',
                feature: null,
                metadata: { path: uniquePath, value: 'yes' },
                created_at: new Date().toISOString()
            }
        ]);

        const token = jwt.sign(
            { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const jsonRes = await request(app)
            .get('/api/admin/analytics?days=1')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(jsonRes.body.success).toBe(true);
        expect(jsonRes.body.report.topPaths).toContainEqual(expect.objectContaining({ key: uniquePath }));
        expect(jsonRes.body.report.summary.feedback.total).toBeGreaterThanOrEqual(1);

        const csvRes = await request(app)
            .get('/api/admin/analytics?days=1&format=csv')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(csvRes.headers['content-type']).toContain('text/csv');
        expect(csvRes.headers['content-disposition']).toContain('analytics-daily-1d.csv');
        expect(csvRes.text).toContain('date,total,visitors,visits,page_views');

        const attributionCsvRes = await request(app)
            .get('/api/admin/analytics?days=1&format=csv&view=attribution')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(attributionCsvRes.headers['content-type']).toContain('text/csv');
        expect(attributionCsvRes.headers['content-disposition']).toContain('analytics-attribution-1d.csv');
        expect(attributionCsvRes.text).toContain('source,campaign,medium,entry_feature');
        expect(attributionCsvRes.text).toContain('"pinterest","admin_analytics_test","organic"');
    });
});

describe('Mock Supabase query behavior', () => {
    test('orders selected rows like production queries expect', async () => {
        const table = `mock_order_test_${Date.now()}`;
        await supabase.from(table).insert([
            { name: 'oldest', created_at: '2026-04-20T10:00:00.000Z' },
            { name: 'newest', created_at: '2026-04-20T12:00:00.000Z' },
            { name: 'middle', created_at: '2026-04-20T11:00:00.000Z' }
        ]);

        const { data: descending } = await supabase
            .from(table)
            .select('*')
            .order('created_at', { ascending: false });

        const { data: ascending } = await supabase
            .from(table)
            .select('*')
            .order('created_at', { ascending: true });

        expect(descending.map(row => row.name)).toEqual(['newest', 'middle', 'oldest']);
        expect(ascending.map(row => row.name)).toEqual(['oldest', 'middle', 'newest']);
    });
});
