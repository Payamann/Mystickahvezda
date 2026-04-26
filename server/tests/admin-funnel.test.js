import { buildFunnelDailyCsv, buildFunnelReport, buildFunnelSegmentsCsv, normalizeFunnelDays, normalizeFunnelLimit } from '../admin.js';
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
        await supabase.from('funnel_events').insert([
            {
                event_name: 'paywall_viewed',
                source,
                feature: 'tarot',
                created_at: new Date().toISOString()
            },
            {
                event_name: 'checkout_session_created',
                source,
                feature: 'tarot',
                created_at: new Date().toISOString()
            },
            {
                event_name: 'subscription_checkout_completed',
                source,
                feature: 'tarot',
                plan_id: 'pruvodce',
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
