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
