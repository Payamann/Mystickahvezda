/**
 * Payment Checkout Tests
 * Testuje /api/payment/create-checkout-session endpoint
 *
 * Kritické scénáře:
 * - Nepřihlášený uživatel dostane 401 (ne redirect, ne 500)
 * - Neplatný planId dostane 400
 * - Volný plan "poutnik" dostane 400 (nelze zaplatit zdarma)
 * - Platné planId hodnoty jsou přijaty (měsíční i roční plány)
 * - CSRF ochrana funguje
 */

import request from 'supertest';
import app from '../index.js';
import jwt from 'jsonwebtoken';
import { SUBSCRIPTION_PLANS } from '../config/constants.js';
import { buildPricingCancelUrl, buildProfileSuccessUrl } from '../payment.js';
import { supabase } from '../db-supabase.js';

async function getCsrfToken() {
    const res = await request(app).get('/api/csrf-token').expect(200);
    return res.body.csrfToken;
}

/**
 * Vygeneruje platný JWT token pro testovacího uživatele
 * (nepotřebuje reálné Supabase — stačí podepsaný token)
 */
function makeTestToken(userId = 'test-user-uuid') {
    return jwt.sign(
        { id: userId, email: 'test@example.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

describe('💳 Payment Checkout Session', () => {
    test('Stripe cancel URL preserves plan and funnel context', () => {
        const cancelUrl = new URL(buildPricingCancelUrl({
            planId: 'pruvodce',
            source: 'inline_paywall',
            feature: 'tarot_multi_card'
        }));

        expect(cancelUrl.pathname).toBe('/cenik.html');
        expect(cancelUrl.searchParams.get('payment')).toBe('cancel');
        expect(cancelUrl.searchParams.get('plan')).toBe('pruvodce');
        expect(cancelUrl.searchParams.get('source')).toBe('inline_paywall');
        expect(cancelUrl.searchParams.get('feature')).toBe('tarot_multi_card');
    });

    test('Stripe success URL preserves post-purchase activation context', () => {
        const successUrlString = buildProfileSuccessUrl({
            planId: 'pruvodce-rocne',
            source: 'personal_map_email_day3',
            feature: 'premium_membership',
            metadata: {
                entry_source: 'personal_map_email_day3',
                entry_feature: 'premium_membership',
                utm_source: 'email',
                utm_campaign: 'personal_map_day3',
                email: 'private@example.com',
                path: '/cenik.html'
            }
        });
        const successUrl = new URL(successUrlString);

        expect(successUrlString).toContain('session_id={CHECKOUT_SESSION_ID}');
        expect(successUrl.pathname).toBe('/profil.html');
        expect(successUrl.searchParams.get('payment')).toBe('success');
        expect(successUrl.searchParams.get('plan')).toBe('pruvodce-rocne');
        expect(successUrl.searchParams.get('source')).toBe('personal_map_email_day3');
        expect(successUrl.searchParams.get('feature')).toBe('premium_membership');
        expect(successUrl.searchParams.get('entry_source')).toBe('personal_map_email_day3');
        expect(successUrl.searchParams.get('entry_feature')).toBe('premium_membership');
        expect(successUrl.searchParams.get('utm_source')).toBe('email');
        expect(successUrl.searchParams.get('utm_campaign')).toBe('personal_map_day3');
        expect(successUrl.searchParams.has('email')).toBe(false);
        expect(successUrl.searchParams.has('path')).toBe(false);
    });

    // ── Autentizace ──────────────────────────────────────────────────────────

    describe('Autentizace', () => {
        test('bez tokenu vrátí 401', async () => {
            const csrf = await getCsrfToken();
            const res = await request(app)
                .post('/api/payment/create-checkout-session')
                .set('x-csrf-token', csrf)
                .send({ planId: 'pruvodce' });

            expect(res.status).toBe(401);
        });

        test('bez CSRF tokenu vrátí 403', async () => {
            const token = makeTestToken();
            const res = await request(app)
                .post('/api/payment/create-checkout-session')
                .set('Authorization', `Bearer ${token}`)
                .send({ planId: 'pruvodce' });

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/csrf/i);
        });
    });

    describe('Legacy endpoint', () => {
        test('authenticated /api/payment/process returns 410 Gone', async () => {
            const csrf = await getCsrfToken();
            const token = makeTestToken();
            const res = await request(app)
                .post('/api/payment/process')
                .set('Authorization', `Bearer ${token}`)
                .set('x-csrf-token', csrf);

            expect(res.status).toBe(410);
            expect(res.body).toEqual({
                success: false,
                error: 'Tento endpoint byl nahrazen Stripe Checkout.'
            });
        });
    });

    // ── Validace planId ──────────────────────────────────────────────────────

    describe('Validace planId', () => {
        test('subscription status normalizes legacy vip plan type for frontend premium checks', async () => {
            const userId = `legacy-vip-status-${Date.now()}`;
            await supabase.from('subscriptions').insert({
                user_id: userId,
                plan_type: 'vip',
                status: 'active',
                current_period_end: '2099-12-31T23:59:59+00:00'
            });

            const token = makeTestToken(userId);
            const res = await request(app)
                .get('/api/payment/subscription/status')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.planType).toBe('vip_majestrat');
            expect(res.body.status).toBe('active');
        });

        test('chybějící planId vrátí 400', async () => {
            const csrf = await getCsrfToken();
            const token = makeTestToken();
            const res = await request(app)
                .post('/api/payment/create-checkout-session')
                .set('Authorization', `Bearer ${token}`)
                .set('x-csrf-token', csrf)
                .send({});

            expect(res.status).toBe(400);
        });

        test('neznámý planId vrátí 400', async () => {
            const csrf = await getCsrfToken();
            const token = makeTestToken();
            const res = await request(app)
                .post('/api/payment/create-checkout-session')
                .set('Authorization', `Bearer ${token}`)
                .set('x-csrf-token', csrf)
                .send({ planId: 'neexistujici-plan' });

            expect(res.status).toBe(400);
        });

        test('volný plan "poutnik" vrátí 400 (nelze zaplatit)', async () => {
            const csrf = await getCsrfToken();
            const token = makeTestToken();
            const res = await request(app)
                .post('/api/payment/create-checkout-session')
                .set('Authorization', `Bearer ${token}`)
                .set('x-csrf-token', csrf)
                .send({ planId: 'poutnik' });

            expect(res.status).toBe(400);
        });

        test('injekce — planId s HTML vrátí 400', async () => {
            const csrf = await getCsrfToken();
            const token = makeTestToken();
            const res = await request(app)
                .post('/api/payment/create-checkout-session')
                .set('Authorization', `Bearer ${token}`)
                .set('x-csrf-token', csrf)
                .send({ planId: '<script>alert(1)</script>' });

            expect(res.status).toBe(400);
        });

        test('injekce — planId s SQL vrátí 400', async () => {
            const csrf = await getCsrfToken();
            const token = makeTestToken();
            const res = await request(app)
                .post('/api/payment/create-checkout-session')
                .set('Authorization', `Bearer ${token}`)
                .set('x-csrf-token', csrf)
                .send({ planId: "'; DROP TABLE subscriptions; --" });

            expect(res.status).toBe(400);
        });
    });

    // ── Platné plany — přijaté jako validní (i když Supabase selže) ──────────

    describe('Platné planId hodnoty', () => {
        const validPlans = Object.entries(SUBSCRIPTION_PLANS)
            .filter(([, plan]) => plan.price > 0)
            .map(([planId]) => planId);

        validPlans.forEach(planId => {
            test(`planId "${planId}" projde validací (ne 400)`, async () => {
                const csrf = await getCsrfToken();
                const token = makeTestToken();
                const res = await request(app)
                    .post('/api/payment/create-checkout-session')
                    .set('Authorization', `Bearer ${token}`)
                    .set('x-csrf-token', csrf)
                    .send({ planId });

                // V test prostředí Stripe/Supabase selžou — očekáváme 400 nebo 500,
                // ale NE 400 kvůli "Invalid plan" — to by znamenalo chybnou validaci.
                // Ověříme že error zpráva NENÍ o neplatném plánu.
                if (res.status === 400) {
                    expect(res.body.error).not.toMatch(/invalid plan/i);
                }
                // Nesmí být 401 (autentizace prošla) ani 403 (CSRF prošlo)
                expect(res.status).not.toBe(401);
                expect(res.status).not.toBe(403);
            });
        });
    });
});
