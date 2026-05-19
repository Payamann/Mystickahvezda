/**
 * Auth Endpoint Tests
 * Tests CSRF protection, input validation, and authentication requirements
 * for /api/auth/* routes
 */

import request from 'supertest';
import app from '../index.js';
import jwt from 'jsonwebtoken';
import { supabase } from '../db-supabase.js';
import { getAuthSubscriptionState } from '../auth.js';

async function getCsrfToken() {
    const res = await request(app).get('/api/csrf-token').expect(200);
    return res.body.csrfToken;
}

async function getFunnelEvents(userId, eventName) {
    const { data } = await supabase
        .from('funnel_events')
        .select('*')
        .eq('user_id', userId)
        .eq('event_name', eventName);

    return data || [];
}

describe('🔐 Auth Endpoint Tests', () => {

    describe('Subscription auth state', () => {
        test('normalizes legacy vip plan type for premium access tokens', () => {
            const state = getAuthSubscriptionState({
                plan_type: 'vip',
                status: 'active',
                current_period_end: '2099-12-31T23:59:59+00:00'
            });

            expect(state).toMatchObject({
                status: 'vip_majestrat',
                isPremium: true,
                premiumExpires: '2099-12-31T23:59:59+00:00'
            });
        });

        test('does not grant premium for expired legacy subscriptions', () => {
            const state = getAuthSubscriptionState({
                plan_type: 'vip',
                status: 'active',
                current_period_end: '2020-01-01T00:00:00+00:00'
            });

            expect(state.status).toBe('vip_majestrat');
            expect(state.isPremium).toBe(false);
        });
    });

    // ============================================
    // CSRF PROTECTION
    // ============================================
    describe('CSRF Protection on POST Endpoints', () => {
        test('POST /api/auth/register without CSRF returns 403', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ email: 'test@example.com', password: 'Test123!', birth_date: '1990-01-01' });

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/csrf/i);
        });

        test('POST /api/auth/login without CSRF returns 403', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'Test123!' });

            expect(res.status).toBe(403);
        });

        test('POST /api/auth/logout without CSRF returns 403', async () => {
            const res = await request(app)
                .post('/api/auth/logout');

            expect(res.status).toBe(403);
        });

        test('POST /api/auth/forgot-password without CSRF returns 403', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: 'test@example.com' });

            expect(res.status).toBe(403);
        });

        test('PUT /api/auth/profile without CSRF returns 403', async () => {
            const res = await request(app)
                .put('/api/auth/profile')
                .send({ first_name: 'Test' });

            expect(res.status).toBe(403);
        });
    });

    // ============================================
    // REGISTRATION VALIDATION
    // ============================================
    describe('Registration Input Validation', () => {
        test('Missing email returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/auth/register')
                .set('x-csrf-token', csrfToken)
                .send({ password: 'TestPassword123!', birth_date: '1990-01-01' });

            expect(res.status).toBe(400);
        });

        test('Invalid email format returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/auth/register')
                .set('x-csrf-token', csrfToken)
                .send({ email: 'not-an-email', password: 'TestPassword123!', birth_date: '1990-01-01' });

            expect(res.status).toBe(400);
        });

        test('Email too long returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/auth/register')
                .set('x-csrf-token', csrfToken)
                .send({
                    email: 'a'.repeat(300) + '@example.com',
                    password: 'TestPassword123!',
                    birth_date: '1990-01-01'
                });

            expect(res.status).toBe(400);
        });

        test('Weak password (too short) returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/auth/register')
                .set('x-csrf-token', csrfToken)
                .send({ email: 'test@example.com', password: 'short', birth_date: '1990-01-01' });

            expect(res.status).toBe(400);
        });

        test('Password without complexity returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/auth/register')
                .set('x-csrf-token', csrfToken)
                .send({ email: 'test@example.com', password: 'password', birth_date: '1990-01-01' });

            expect(res.status).toBe(400);
        });

        test('Future birth_date returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);

            const res = await request(app)
                .post('/api/auth/register')
                .set('x-csrf-token', csrfToken)
                .send({
                    email: 'test@example.com',
                    password: 'TestPassword123!',
                    birth_date: futureDate.toISOString().split('T')[0]
                });

            expect(res.status).toBe(400);
        });

        test('Mismatched confirm_password returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/auth/register')
                .set('x-csrf-token', csrfToken)
                .send({
                    email: 'test@example.com',
                    password: 'TestPassword123!',
                    confirm_password: 'DifferentPassword456!',
                    birth_date: '1990-01-01'
                });

            expect(res.status).toBe(400);
        });
    });

    // ============================================
    // LOGIN VALIDATION
    // ============================================
    describe('Login Input Validation', () => {
        test('Missing email returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/auth/login')
                .set('x-csrf-token', csrfToken)
                .send({ password: 'TestPassword123!' });

            expect(res.status).toBe(400);
        });

        test('Invalid email format returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/auth/login')
                .set('x-csrf-token', csrfToken)
                .send({ email: 'not-valid', password: 'TestPassword123!' });

            expect(res.status).toBe(400);
        });

        test('Missing password returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/auth/login')
                .set('x-csrf-token', csrfToken)
                .send({ email: 'test@example.com' });

            // 400 = validation error, 429 = rate limited (auth limiter, 10/hour)
            expect([400, 429]).toContain(res.status);
        });
    });

    // ============================================
    // AUTHENTICATION REQUIREMENTS
    // ============================================
    describe('Protected Routes Require Authentication', () => {
        test('GET /api/auth/profile without auth returns 401', async () => {
            const res = await request(app)
                .get('/api/auth/profile');

            expect(res.status).toBe(401);
        });

        test('GET /api/auth/profile with invalid JWT returns 403', async () => {
            const res = await request(app)
                .get('/api/auth/profile')
                .set('Cookie', 'auth_token=invalid.jwt.token');

            expect(res.status).toBe(403);
        });

        test('POST /api/auth/logout without auth returns 401', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/auth/logout')
                .set('x-csrf-token', csrfToken);

            expect(res.status).toBe(401);
        });

        test('POST /api/auth/refresh-token without auth returns 401', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/auth/refresh-token')
                .set('x-csrf-token', csrfToken);

            expect(res.status).toBe(401);
        });

        test('POST /api/auth/onboarding/complete schedules activation lifecycle emails', async () => {
            const csrfToken = await getCsrfToken();
            const userId = `onboarding-email-${Date.now()}`;
            const email = `${userId}@example.com`;
            const token = jwt.sign({
                id: userId,
                email,
                subscription_status: 'free',
                isPremium: false
            }, process.env.JWT_SECRET, { expiresIn: '1h' });

            await supabase.from('users').insert({
                id: userId,
                email,
                first_name: 'Jana',
                is_onboarded: false
            });

            const res = await request(app)
                .post('/api/auth/onboarding/complete')
                .set('x-csrf-token', csrfToken)
                .set('Cookie', `auth_token=${token}`)
                .send({
                    source: 'life_number_result',
                    feature: 'numerologie_vyklad',
                    plan: 'pruvodce',
                    redirect: '/cenik.html?source=onboarding_return',
                    destination: '/numerologie.html?source=signup_activation&feature=numerologie_vyklad',
                    skipped: false
                });

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                success: true,
                activationLifecycleQueued: true,
                onboardingSkipped: false
            });

            const { data: queued } = await supabase
                .from('email_queue')
                .select('*')
                .eq('email_to', email)
                .order('scheduled_for', { ascending: true });

            expect(queued).toHaveLength(4);
            expect(queued.map(emailRecord => emailRecord.template)).toEqual([
                'activation_first_step_day0',
                'activation_quick_win_day1',
                'activation_depth_day3',
                'activation_one_time_offer_day6'
            ]);

            const firstPayload = typeof queued[0].data === 'string'
                ? JSON.parse(queued[0].data)
                : queued[0].data;
            expect(firstPayload).toMatchObject({
                source: 'life_number_result',
                feature: 'numerologie_vyklad',
                plan: 'pruvodce',
                redirect: '/cenik.html?source=onboarding_return',
                destination: '/numerologie.html?source=signup_activation&feature=numerologie_vyklad',
                dedupeKey: `activation:${userId}:day0`
            });

            const day6Payload = typeof queued[3].data === 'string'
                ? JSON.parse(queued[3].data)
                : queued[3].data;
            expect(day6Payload).toMatchObject({
                source: 'life_number_result',
                feature: 'numerologie_vyklad',
                skipIfPremium: true,
                dedupeKey: `activation:${userId}:day6`
            });

            const funnelEvents = await getFunnelEvents(userId, 'onboarding_completed');
            expect(funnelEvents).toHaveLength(1);
            expect(funnelEvents[0]).toMatchObject({
                source: 'life_number_result',
                feature: 'numerologie_vyklad'
            });
            expect(funnelEvents[0].metadata).toMatchObject({
                destination: '/numerologie.html?source=signup_activation&feature=numerologie_vyklad',
                plan: 'pruvodce',
                redirect: '/cenik.html?source=onboarding_return',
                onboarding_state: 'completed'
            });
        });

        test('POST /api/auth/onboarding/complete persists onboarding_skipped funnel event', async () => {
            const csrfToken = await getCsrfToken();
            const userId = `onboarding-skipped-${Date.now()}`;
            const email = `${userId}@example.com`;
            const token = jwt.sign({
                id: userId,
                email,
                subscription_status: 'free',
                isPremium: false
            }, process.env.JWT_SECRET, { expiresIn: '1h' });

            await supabase.from('users').insert({
                id: userId,
                email,
                first_name: 'Eva',
                is_onboarded: false
            });

            const destination = '/profil.html?source=onboarding_skip&feature=daily_guidance';
            const res = await request(app)
                .post('/api/auth/onboarding/complete')
                .set('x-csrf-token', csrfToken)
                .set('Cookie', `auth_token=${token}`)
                .send({
                    source: 'onboarding_modal',
                    feature: 'daily_guidance',
                    destination,
                    skipped: true
                });

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                success: true,
                onboardingSkipped: true
            });

            const funnelEvents = await getFunnelEvents(userId, 'onboarding_skipped');
            expect(funnelEvents).toHaveLength(1);
            expect(funnelEvents[0]).toMatchObject({
                source: 'onboarding_modal',
                feature: 'daily_guidance'
            });
            expect(funnelEvents[0].metadata).toMatchObject({
                destination,
                onboarding_state: 'skipped'
            });
        });
    });

    // ============================================
    // LEGACY ENDPOINT
    // ============================================
    describe('Legacy / Deprecated Endpoints', () => {
        test('POST /api/auth/activate-premium returns 410 Gone', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/auth/activate-premium')
                .set('x-csrf-token', csrfToken);

            expect(res.status).toBe(410);
        });
    });

    // ============================================
    // CSRF TOKEN EXPIRY
    // ============================================
    describe('CSRF Token Expiry', () => {
        test('Expired CSRF token (>15 min old) is rejected', async () => {
            const { default: crypto } = await import('crypto');
            const csrfSecret = process.env.CSRF_SECRET;

            // Build a token with a timestamp 20 minutes in the past
            const randomString = crypto.randomBytes(32).toString('hex');
            const oldTimestamp = (Date.now() - 20 * 60 * 1000).toString(36);
            const payload = `${randomString}.${oldTimestamp}`;
            const hmac = crypto.createHmac('sha256', csrfSecret);
            hmac.update(payload);
            const expiredToken = `${payload}.${hmac.digest('hex')}`;

            const res = await request(app)
                .post('/api/auth/register')
                .set('x-csrf-token', expiredToken)
                .send({ email: 'test@example.com', password: 'Test123!', birth_date: '1990-01-01' });

            // 403 = CSRF rejected (expected), 429 = rate-limited before CSRF check
            expect([403, 429]).toContain(res.status);
        });
    });
});
