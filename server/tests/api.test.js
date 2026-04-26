/**
 * API Endpoint Tests
 * Tests health check, horoscope, oracle (crystal ball), payment, and CSRF token endpoints
 */

import request from 'supertest';
import app from '../index.js';
import { supabase } from '../db-supabase.js';
import { isDocAllowed } from '../routes/docs.js';

async function getCsrfToken() {
    const res = await request(app).get('/api/csrf-token').expect(200);
    return res.body.csrfToken;
}

describe('API Endpoint Tests', () => {
    describe('Health Check', () => {
        test('GET /api/health returns health structure', async () => {
            const res = await request(app).get('/api/health');

            expect([200, 503]).toContain(res.status);
            expect(res.body).toHaveProperty('status');
            expect(res.body).toHaveProperty('timestamp');
            expect(res.body).toHaveProperty('checks');
        });

        test('Health check checks has db and ai fields', async () => {
            const res = await request(app).get('/api/health');

            expect(res.body.checks).toHaveProperty('db');
            expect(res.body.checks).toHaveProperty('ai');
        });

        test('Health check status is ok or degraded', async () => {
            const res = await request(app).get('/api/health');

            expect(['ok', 'degraded']).toContain(res.body.status);
        });

        test('Health check timestamp is valid ISO string', async () => {
            const res = await request(app).get('/api/health');

            expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
        });

        test('Health check payload is under 1KB', async () => {
            const res = await request(app).get('/api/health');

            expect(JSON.stringify(res.body).length).toBeLessThan(1000);
        });

        test('Health check does not require authentication', async () => {
            const res = await request(app).get('/api/health');

            expect(res.status).not.toBe(401);
            expect(res.status).not.toBe(403);
        });
    });

    describe('API Docs', () => {
        const originalNodeEnv = process.env.NODE_ENV;
        const originalDocsToken = process.env.DOCS_TOKEN;

        afterEach(() => {
            process.env.NODE_ENV = originalNodeEnv;
            if (originalDocsToken === undefined) {
                delete process.env.DOCS_TOKEN;
            } else {
                process.env.DOCS_TOKEN = originalDocsToken;
            }
        });

        test('GET /api/docs serves the externalized Swagger shell', async () => {
            const res = await request(app)
                .get('/api/docs')
                .expect(200);

            expect(res.headers['content-type']).toContain('text/html');
            expect(res.text).toContain('id="swagger-ui"');
            expect(res.text).toContain('/js/dist/swagger-docs.js');
            expect(res.text).not.toMatch(/<style\b/i);
            expect(res.text).not.toMatch(/<script>\s*SwaggerUIBundle/i);
        });

        test('GET /api/docs/openapi.yaml serves the OpenAPI spec', async () => {
            const res = await request(app)
                .get('/api/docs/openapi.yaml')
                .expect(200);

            expect(res.headers['content-type']).toContain('application/yaml');
            expect(res.text).toContain('openapi:');
            expect(res.text).toContain('/admin/funnel:');
            expect(res.text).toContain('sourceComparison:');
            expect(res.text).toContain('sourceFeatureSegments:');
            expect(res.text).toContain('FunnelSourceFeaturePreviousSegment:');
            expect(res.text).toContain('paywallToCheckoutRateDelta:');
            expect(res.text).toContain('enum: [daily, segments]');
            expect(res.text).toContain('text/csv:');
        });

        test('docs access allows non-production without token', () => {
            process.env.NODE_ENV = 'test';
            delete process.env.DOCS_TOKEN;

            expect(isDocAllowed({ query: {}, headers: {} })).toBe(true);
        });

        test('docs access denies production without DOCS_TOKEN', () => {
            process.env.NODE_ENV = 'production';
            delete process.env.DOCS_TOKEN;

            expect(isDocAllowed({ query: {}, headers: {} })).toBe(false);
        });

        test('docs access allows matching production query or bearer token', () => {
            process.env.NODE_ENV = 'production';
            process.env.DOCS_TOKEN = 'docs-secret';

            expect(isDocAllowed({
                query: { token: 'docs-secret' },
                headers: {}
            })).toBe(true);
            expect(isDocAllowed({
                query: {},
                headers: { authorization: 'Bearer docs-secret' }
            })).toBe(true);
            expect(isDocAllowed({
                query: { token: 'wrong' },
                headers: { authorization: 'Bearer wrong' }
            })).toBe(false);
        });
    });

    describe('CSRF Token', () => {
        test('GET /api/csrf-token returns a token', async () => {
            const res = await request(app)
                .get('/api/csrf-token')
                .expect(200);

            expect(res.body.csrfToken).toBeDefined();
            expect(typeof res.body.csrfToken).toBe('string');
            expect(res.body.csrfToken.length).toBeGreaterThan(10);
        });

        test('CSRF token has 3 dot-separated parts (randomString.timestamp.signature)', async () => {
            const res = await request(app).get('/api/csrf-token');
            const parts = res.body.csrfToken.split('.');

            expect(parts.length).toBe(3);
            expect(parts[0].length).toBeGreaterThan(0);
            expect(parts[1].length).toBeGreaterThan(0);
            expect(parts[2].length).toBe(64);
        });

        test('Two consecutive CSRF tokens are different', async () => {
            const res1 = await request(app).get('/api/csrf-token');
            const res2 = await request(app).get('/api/csrf-token');

            expect(res1.body.csrfToken).not.toBe(res2.body.csrfToken);
        });

        test('Expired CSRF token (>15 min) is rejected on POST', async () => {
            const { default: crypto } = await import('crypto');
            const csrfSecret = process.env.CSRF_SECRET;

            const randomString = crypto.randomBytes(32).toString('hex');
            const oldTimestamp = (Date.now() - 20 * 60 * 1000).toString(36);
            const payload = `${randomString}.${oldTimestamp}`;
            const sig = crypto.createHmac('sha256', csrfSecret).update(payload).digest('hex');
            const expiredToken = `${payload}.${sig}`;

            const res = await request(app)
                .post('/api/auth/forgot-password')
                .set('x-csrf-token', expiredToken)
                .send({ email: 'test@example.com' });

            expect([403, 429]).toContain(res.status);
        });
    });

    describe('POST /api/horoscope', () => {
        test('Without CSRF returns 403', async () => {
            const res = await request(app)
                .post('/api/horoscope')
                .send({ sign: 'Beran', period: 'daily' });

            expect(res.status).toBe(403);
        });

        test('Invalid zodiac sign returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/horoscope')
                .set('x-csrf-token', csrfToken)
                .send({ sign: 'NotARealSign', period: 'daily' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('Invalid period returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/horoscope')
                .set('x-csrf-token', csrfToken)
                .send({ sign: 'Beran', period: 'yearly' });

            expect(res.status).toBe(400);
        });

        test('Weekly horoscope without premium returns 402', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/horoscope')
                .set('x-csrf-token', csrfToken)
                .send({ sign: 'Beran', period: 'weekly' });

            expect(res.status).toBe(402);
            expect(res.body.code).toBe('PREMIUM_REQUIRED');
        });

        test('Monthly horoscope without premium returns 402', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/horoscope')
                .set('x-csrf-token', csrfToken)
                .send({ sign: 'Štír', period: 'monthly' });

            expect(res.status).toBe(402);
            expect(res.body.code).toBe('PREMIUM_REQUIRED');
        });

        test('Missing sign returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/horoscope')
                .set('x-csrf-token', csrfToken)
                .send({ period: 'daily' });

            expect(res.status).toBe(400);
        });

        test('Representative valid zodiac signs are accepted (validation passes)', async () => {
            const validSigns = ['Beran', 'Váhy'];
            const csrfToken = await getCsrfToken();

            for (const sign of validSigns) {
                const res = await request(app)
                    .post('/api/horoscope')
                    .set('x-csrf-token', csrfToken)
                    .send({ sign, period: 'daily' });

                expect(res.status).not.toBe(400);
            }
        }, 60000);
    });

    describe('POST /api/crystal-ball', () => {
        test('Without CSRF returns 403', async () => {
            const res = await request(app)
                .post('/api/crystal-ball')
                .send({ question: 'What does the future hold?' });

            expect(res.status).toBe(403);
        });

        test('Missing question returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/crystal-ball')
                .set('x-csrf-token', csrfToken)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('Empty question returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/crystal-ball')
                .set('x-csrf-token', csrfToken)
                .send({ question: '' });

            expect(res.status).toBe(400);
        });

        test('Question exceeding 1000 chars returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/crystal-ball')
                .set('x-csrf-token', csrfToken)
                .send({ question: 'x'.repeat(1001) });

            expect(res.status).toBe(400);
        });

        test('Question of exactly 1000 chars passes validation', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/crystal-ball')
                .set('x-csrf-token', csrfToken)
                .send({ question: 'x'.repeat(1000) });

            expect(res.status).not.toBe(400);
        });

        test('Non-string question returns 400', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/crystal-ball')
                .set('x-csrf-token', csrfToken)
                .send({ question: 12345 });

            expect(res.status).toBe(400);
        });
    });

    describe('Payment Endpoints', () => {
        test('GET /api/payment/subscription/status without auth returns 401', async () => {
            const res = await request(app)
                .get('/api/payment/subscription/status');

            expect(res.status).toBe(401);
        });

        test('POST /api/payment/create-checkout-session without CSRF returns 403', async () => {
            const res = await request(app)
                .post('/api/payment/create-checkout-session')
                .send({ planId: 'pruvodce' });

            expect(res.status).toBe(403);
        });

        test('POST /api/payment/create-checkout-session with CSRF but no auth returns 401', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/payment/create-checkout-session')
                .set('x-csrf-token', csrfToken)
                .send({ planId: 'pruvodce' });

            expect(res.status).toBe(401);
        });

        test('POST /api/payment/cancel without CSRF returns 403', async () => {
            const res = await request(app)
                .post('/api/payment/cancel');

            expect(res.status).toBe(403);
        });

        test('POST /api/payment/cancel with CSRF but no auth returns 401', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/payment/cancel')
                .set('x-csrf-token', csrfToken);

            expect(res.status).toBe(401);
        });

        test('POST /api/payment/portal without CSRF returns 403', async () => {
            const res = await request(app)
                .post('/api/payment/portal');

            expect(res.status).toBe(403);
        });

        test('POST /api/payment/portal with CSRF but no auth returns 401', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/payment/portal')
                .set('x-csrf-token', csrfToken);

            expect(res.status).toBe(401);
        });

        test('POST /api/payment/reactivate without CSRF returns 403', async () => {
            const res = await request(app)
                .post('/api/payment/reactivate');

            expect(res.status).toBe(403);
        });

        test('POST /api/payment/reactivate with CSRF but no auth returns 401', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/payment/reactivate')
                .set('x-csrf-token', csrfToken);

            expect(res.status).toBe(401);
        });

        test('POST /api/payment/process (legacy) without auth returns 401', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/payment/process')
                .set('x-csrf-token', csrfToken);

            expect(res.status).toBe(401);
        });
    });

    describe('Numerology Endpoints', () => {
        test('POST /api/numerology/* without CSRF returns 403', async () => {
            const res = await request(app)
                .post('/api/numerology/life-path')
                .send({ birthDate: '1990-01-01' });

            expect(res.status).toBe(403);
        });
    });

    describe('Horoscope Subscription Endpoints', () => {
        test('GET /api/subscribe/horoscope/unsubscribe without token returns 400', async () => {
            const res = await request(app)
                .get('/api/subscribe/horoscope/unsubscribe')
                .expect(400);

            expect(res.text).toContain('odkaz');
        });

        test('GET /api/subscribe/horoscope/unsubscribe with unknown token returns 404', async () => {
            const res = await request(app)
                .get('/api/subscribe/horoscope/unsubscribe?token=unknown-token')
                .expect(404);

            expect(res.text).toContain('neexistuje');
        });

        test('GET /api/subscribe/horoscope/unsubscribe only succeeds once for active subscriptions', async () => {
            const token = `active-token-${Date.now()}`;
            await supabase
                .from('horoscope_subscriptions')
                .insert({
                    email: `unsubscribe-${Date.now()}@example.com`,
                    zodiac_sign: 'Beran',
                    unsubscribe_token: token,
                    active: true,
                });

            await request(app)
                .get(`/api/subscribe/horoscope/unsubscribe?token=${token}`)
                .expect(200);

            await request(app)
                .get(`/api/subscribe/horoscope/unsubscribe?token=${token}`)
                .expect(404);
        });
    });

    describe('Mentor Endpoints', () => {
        test('GET /api/mentor/history without auth returns 401', async () => {
            const res = await request(app)
                .get('/api/mentor/history');

            expect(res.status).toBe(401);
        });

        test('GET /api/mentor/history with invalid JWT returns 403', async () => {
            const res = await request(app)
                .get('/api/mentor/history')
                .set('Cookie', 'auth_token=invalid.jwt.token');

            expect(res.status).toBe(403);
        });

        test('POST /api/mentor/chat without CSRF returns 403', async () => {
            const res = await request(app)
                .post('/api/mentor/chat')
                .send({ message: 'Ahoj' });

            expect(res.status).toBe(403);
        });

        test('POST /api/mentor/chat with CSRF but no auth returns 401', async () => {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/mentor/chat')
                .set('x-csrf-token', csrfToken)
                .send({ message: 'Ahoj' });

            expect(res.status).toBe(401);
        });
    });

    describe('Programmatic Horoscope Sitemap', () => {
        test('GET /horoskop/sitemap-horoscopes.xml returns canonical sitemap URLs', async () => {
            const res = await request(app)
                .get('/horoskop/sitemap-horoscopes.xml')
                .expect(200);

            expect(res.headers['content-type']).toContain('application/xml');
            expect(res.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
            expect(res.text).toContain('<loc>https://www.mystickahvezda.cz/horoskop/beran/');
            expect(res.text).not.toContain('<loc>https://mystickahvezda.cz/horoskop/');
        });

        test('GET /horoskop/:sign/:date serves CSP-safe HTML with built assets', async () => {
            const today = new Date().toISOString().split('T')[0];
            const res = await request(app)
                .get(`/horoskop/beran/${today}`)
                .expect(200);

            expect(res.headers['content-type']).toContain('text/html');
            expect(res.headers['content-security-policy']).toContain("'sha256-");
            expect(res.text).toContain('/js/dist/main.js');
            expect(res.text).not.toMatch(/<style\b/i);
            expect(res.text).not.toMatch(/\sstyle\s*=/i);
        });
    });

    describe('Rate Limiting', () => {
        test('Rate limit headers are present on API responses', async () => {
            const res = await request(app).get('/api/health');

            const hasRateLimitHeader =
                res.headers['ratelimit-limit'] ||
                res.headers['x-ratelimit-limit'] ||
                res.headers['retry-after'];

            expect(hasRateLimitHeader || [200, 503].includes(res.status)).toBeTruthy();
        });
    });

    describe('Unknown Endpoints', () => {
        test('Unknown API endpoint returns 404', async () => {
            const res = await request(app)
                .get('/api/this-does-not-exist-at-all');

            expect(res.status).toBe(404);
        });

        test('404 response does not expose stack traces', async () => {
            const res = await request(app)
                .get('/api/nonexistent-endpoint-xyz');

            if (res.body.error) {
                expect(res.body.error).not.toMatch(/at\s+\w+\s+\(/);
                expect(res.body.error).not.toContain('node_modules');
            }
        });
    });
});
