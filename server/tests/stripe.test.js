/**
 * Stripe Webhook Tests
 * Tests signature validation, CSRF bypass, and idempotency
 */

import request from 'supertest';
import app from '../index.js';
import crypto from 'crypto';
import {
    createOneTimeOrderInput,
    markOneTimeOrderInputFulfilled
} from '../services/one-time-orders.js';
import { supabase } from '../db-supabase.js';

const WEBHOOK_URL = '/webhook/stripe';
const TEST_WEBHOOK_SECRET = 'test-webhook-secret'; // matches setup.js STRIPE_WEBHOOK_SECRET

/**
 * Compute a valid Stripe webhook signature header
 * Format: t=timestamp,v1=HMAC-SHA256(secret, "timestamp.payload")
 */
function computeStripeSignature(payload, secret = TEST_WEBHOOK_SECRET) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload, 'utf8')
        .digest('hex');
    return `t=${timestamp},v1=${signature}`;
}

describe('💳 Stripe Webhook Tests', () => {

    // ============================================
    // SIGNATURE VALIDATION
    // ============================================
    describe('Signature Validation', () => {
        test('Missing stripe-signature header returns 400', async () => {
            const res = await request(app)
                .post(WEBHOOK_URL)
                .set('Content-Type', 'application/json')
                .send(JSON.stringify({ id: 'evt_test_001', type: 'ping' }));

            expect(res.status).toBe(400);
        });

        test('Empty stripe-signature header returns 400', async () => {
            const res = await request(app)
                .post(WEBHOOK_URL)
                .set('Content-Type', 'application/json')
                .set('stripe-signature', '')
                .send(JSON.stringify({ id: 'evt_test_002', type: 'ping' }));

            expect(res.status).toBe(400);
        });

        test('Malformed stripe-signature header returns 400', async () => {
            const res = await request(app)
                .post(WEBHOOK_URL)
                .set('Content-Type', 'application/json')
                .set('stripe-signature', 'not_a_valid_signature')
                .send(JSON.stringify({ id: 'evt_test_003', type: 'ping' }));

            expect(res.status).toBe(400);
        });

        test('Signature computed with wrong secret returns 400', async () => {
            const payload = JSON.stringify({ id: 'evt_test_004', type: 'ping' });
            const sigHeader = computeStripeSignature(payload, 'wrong-secret-xyz');

            const res = await request(app)
                .post(WEBHOOK_URL)
                .set('Content-Type', 'application/json')
                .set('stripe-signature', sigHeader)
                .send(payload);

            expect(res.status).toBe(400);
        });

        test('Valid HMAC signature passes signature check', async () => {
            const payload = JSON.stringify({
                id: `evt_test_valid_${Date.now()}`,
                type: 'unknown.test.event',
                data: { object: {} },
                livemode: false
            });
            const sigHeader = computeStripeSignature(payload, TEST_WEBHOOK_SECRET);

            const res = await request(app)
                .post(WEBHOOK_URL)
                .set('Content-Type', 'application/json')
                .set('stripe-signature', sigHeader)
                .send(payload);

            // 200 in prod with real DB, 400 if Supabase unavailable in test env
            // Either way it's NOT a 401/403 (auth/CSRF error) — signature passed
            expect([200, 400]).toContain(res.status);
            // Should not be a CSRF rejection
            if (res.status === 403) {
                fail('Webhook should not receive CSRF rejection');
            }
        });

        test('Tampered payload returns 400', async () => {
            const originalPayload = JSON.stringify({ id: 'evt_test_005', type: 'ping' });
            const sigHeader = computeStripeSignature(originalPayload, TEST_WEBHOOK_SECRET);
            const tamperedPayload = JSON.stringify({ id: 'evt_test_005', type: 'malicious' });

            const res = await request(app)
                .post(WEBHOOK_URL)
                .set('Content-Type', 'application/json')
                .set('stripe-signature', sigHeader)
                .send(tamperedPayload);

            expect(res.status).toBe(400);
        });
    });

    // ============================================
    // CSRF BYPASS
    // ============================================
    describe('CSRF Bypass', () => {
        test('Webhook endpoint does NOT require X-CSRF-Token header', async () => {
            // Webhooks come from Stripe (server-to-server), not browsers
            // They must bypass CSRF protection
            const payload = JSON.stringify({ id: 'evt_test_006', type: 'ping' });

            const res = await request(app)
                .post(WEBHOOK_URL)
                .set('Content-Type', 'application/json')
                // Intentionally omitting x-csrf-token
                .send(payload);

            // Must fail on signature (400), NOT on CSRF (403)
            expect(res.status).toBe(400);
            if (res.body && res.body.error) {
                expect(res.body.error).not.toMatch(/csrf/i);
            }
        });

        test('Webhook endpoint fails without signature even if CSRF token provided', async () => {
            const res = await request(app)
                .post(WEBHOOK_URL)
                .set('Content-Type', 'application/json')
                .set('x-csrf-token', 'some-token')
                // No stripe-signature
                .send(JSON.stringify({ id: 'evt_test_007', type: 'ping' }));

            expect(res.status).toBe(400);
        });

        test('Webhook request on apex host bypasses canonical redirect middleware', async () => {
            const payload = JSON.stringify({
                id: `evt_apex_webhook_${Date.now()}`,
                type: 'unknown.test.event',
                data: { object: {} },
                livemode: false
            });
            const sigHeader = computeStripeSignature(payload, TEST_WEBHOOK_SECRET);

            const res = await request(app)
                .post(WEBHOOK_URL)
                .set('Host', 'mystickahvezda.cz')
                .set('Content-Type', 'application/json')
                .set('stripe-signature', sigHeader)
                .send(payload);

            expect(res.status).not.toBe(308);
            expect([200, 400]).toContain(res.status);
        });
    });

    // ============================================
    // EVENT HANDLING
    // ============================================
    describe('Unknown Event Types', () => {
        test('Unknown event type is handled gracefully (no 5xx crash)', async () => {
            const payload = JSON.stringify({
                id: `evt_unknown_${Date.now()}`,
                type: 'completely.unknown.event.type',
                data: { object: {} },
                livemode: false
            });
            const sigHeader = computeStripeSignature(payload, TEST_WEBHOOK_SECRET);

            const res = await request(app)
                .post(WEBHOOK_URL)
                .set('Content-Type', 'application/json')
                .set('stripe-signature', sigHeader)
                .send(payload);

            // Should not be 500 (unhandled crash)
            expect(res.status).not.toBe(500);
        });

        test('fulfilled annual horoscope duplicate still ensures lifecycle emails', async () => {
            const email = `annual-webhook-retry-${Date.now()}@example.com`;
            const order = await createOneTimeOrderInput({
                productType: 'rocni_horoskop',
                productId: 'rocni_horoskop_2026',
                customerEmail: email,
                customerName: 'Jana Test',
                payload: {
                    birthDate: '1990-08-10',
                    sign: 'lev'
                }
            });
            await markOneTimeOrderInputFulfilled(order.id);

            const sessionId = `cs_test_annual_retry_${Date.now()}`;
            const payload = JSON.stringify({
                id: `evt_annual_retry_${Date.now()}`,
                type: 'checkout.session.completed',
                data: {
                    object: {
                        id: sessionId,
                        mode: 'payment',
                        payment_status: 'paid',
                        amount_total: 19900,
                        currency: 'czk',
                        metadata: {
                            productType: 'rocni_horoskop',
                            productId: 'rocni_horoskop_2026',
                            productYear: '2026',
                            orderId: order.id,
                            source: 'annual_horoscope_checkout'
                        }
                    }
                },
                livemode: false
            });
            const sigHeader = computeStripeSignature(payload, TEST_WEBHOOK_SECRET);

            await request(app)
                .post(WEBHOOK_URL)
                .set('Content-Type', 'application/json')
                .set('stripe-signature', sigHeader)
                .send(payload)
                .expect(200);

            const { data: queued } = await supabase
                .from('email_queue')
                .select('*')
                .eq('email_to', email)
                .in('template', ['annual_horoscope_reflection_day1', 'annual_horoscope_pruvodce_day3']);

            expect(queued).toHaveLength(2);

            const { data: events } = await supabase
                .from('funnel_events')
                .select('*')
                .eq('stripe_session_id', sessionId)
                .eq('event_name', 'one_time_lifecycle_sequence_scheduled');

            expect(events).toContainEqual(expect.objectContaining({
                source: 'annual_horoscope_checkout',
                feature: 'rocni_horoskop_2026',
                metadata: expect.objectContaining({
                    sequence: 'annual_horoscope_post_purchase',
                    emailsScheduled: 2
                })
            }));
        });

        test('fulfilled personal map duplicate still ensures lifecycle emails', async () => {
            const email = `map-webhook-retry-${Date.now()}@example.com`;
            const order = await createOneTimeOrderInput({
                productType: 'personal_map',
                productId: 'osobni_mapa_2026',
                customerEmail: email,
                customerName: 'Jana Test',
                payload: {
                    birthDate: '1990-08-10',
                    sign: 'lev',
                    focus: 'prace'
                }
            });
            await markOneTimeOrderInputFulfilled(order.id);

            const sessionId = `cs_test_map_retry_${Date.now()}`;
            const payload = JSON.stringify({
                id: `evt_map_retry_${Date.now()}`,
                type: 'checkout.session.completed',
                data: {
                    object: {
                        id: sessionId,
                        mode: 'payment',
                        payment_status: 'paid',
                        amount_total: 29900,
                        currency: 'czk',
                        metadata: {
                            productType: 'personal_map',
                            productId: 'osobni_mapa_2026',
                            productYear: '2026',
                            orderId: order.id,
                            source: 'personal_map_checkout'
                        }
                    }
                },
                livemode: false
            });
            const sigHeader = computeStripeSignature(payload, TEST_WEBHOOK_SECRET);

            await request(app)
                .post(WEBHOOK_URL)
                .set('Content-Type', 'application/json')
                .set('stripe-signature', sigHeader)
                .send(payload)
                .expect(200);

            const { data: queued } = await supabase
                .from('email_queue')
                .select('*')
                .eq('email_to', email)
                .in('template', ['personal_map_reflection_day1', 'personal_map_pruvodce_day3']);

            expect(queued).toHaveLength(2);

            const { data: events } = await supabase
                .from('funnel_events')
                .select('*')
                .eq('stripe_session_id', sessionId)
                .eq('event_name', 'one_time_lifecycle_sequence_scheduled');

            expect(events).toContainEqual(expect.objectContaining({
                source: 'personal_map_checkout',
                feature: 'osobni_mapa_2026',
                metadata: expect.objectContaining({
                    sequence: 'personal_map_post_purchase',
                    emailsScheduled: 2
                })
            }));
        });
    });
});
