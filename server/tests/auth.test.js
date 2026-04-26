/**
 * Auth Endpoint Tests
 * Tests CSRF protection, input validation, and authentication requirements
 * for /api/auth/* routes
 */

import request from 'supertest';
import app from '../index.js';

async function getCsrfToken() {
    const res = await request(app).get('/api/csrf-token').expect(200);
    return res.body.csrfToken;
}

describe('🔐 Auth Endpoint Tests', () => {

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
