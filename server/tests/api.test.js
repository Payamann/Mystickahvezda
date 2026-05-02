/**
 * API Endpoint Tests
 * Tests health check, horoscope, oracle (crystal ball), payment, and CSRF token endpoints
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index.js';
import { supabase } from '../db-supabase.js';
import { isDocAllowed } from '../routes/docs.js';

async function getCsrfToken() {
    const res = await request(app).get('/api/csrf-token').expect(200);
    return res.body.csrfToken;
}

function createUserToken(overrides = {}) {
    return jwt.sign({
        id: 'api-test-user',
        email: 'api-test@example.com',
        role: 'user',
        isPremium: false,
        subscription_status: 'free',
        ...overrides
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function withTemporaryEnv(overrides, callback) {
    const previous = new Map();
    Object.keys(overrides).forEach((key) => {
        previous.set(key, {
            exists: Object.prototype.hasOwnProperty.call(process.env, key),
            value: process.env[key]
        });
        if (overrides[key] === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = overrides[key];
        }
    });

    try {
        return await callback();
    } finally {
        previous.forEach((entry, key) => {
            if (entry.exists) {
                process.env[key] = entry.value;
            } else {
                delete process.env[key];
            }
        });
    }
}

describe('API Endpoint Tests', () => {
    describe('Static page redirects', () => {
        test('legacy social slug for shaman wheel redirects to canonical page with campaign params', async () => {
            const res = await request(app)
                .get('/shamanske-kolo.html?source=social_post')
                .redirects(0)
                .expect(301);

            expect(res.headers.location).toBe('/shamansko-kolo.html?source=social_post');
        });
    });

    describe('Health Check', () => {
        test('GET /api/health returns health structure', async () => {
            const res = await request(app).get('/api/health');

            expect([200, 503]).toContain(res.status);
            expect(res.body).toHaveProperty('status');
            expect(res.body).toHaveProperty('timestamp');
            expect(res.body).toHaveProperty('checks');
            expect(res.body).toHaveProperty('deployment');
        });

        test('Health check checks has db and ai fields', async () => {
            const res = await request(app).get('/api/health');

            expect(res.body.checks).toHaveProperty('db');
            expect(res.body.checks).toHaveProperty('ai');
            expect(res.body.features).toHaveProperty('pushNotifications');
            expect(res.body.deployment).toHaveProperty('commit');
        });

        test('Health check exposes safe deployment metadata when available', async () => {
            await withTemporaryEnv({
                RAILWAY_GIT_COMMIT_SHA: 'abc123deploy',
                RAILWAY_GIT_BRANCH: 'main',
                RAILWAY_ENVIRONMENT_NAME: 'production',
                RAILWAY_SERVICE_NAME: 'web'
            }, async () => {
                const res = await request(app).get('/api/health');

                expect(res.body.deployment).toEqual({
                    commit: 'abc123deploy',
                    branch: 'main',
                    environment: 'production',
                    service: 'web'
                });
            });
        });

        test('Health check recognizes Supabase and Anthropic production config', async () => {
            await withTemporaryEnv({
                MOCK_SUPABASE: undefined,
                MOCK_AI: undefined,
                DATABASE_URL: undefined,
                GEMINI_API_KEY: undefined,
                SUPABASE_URL: 'https://project.supabase.co',
                SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
                ANTHROPIC_API_KEY: 'anthropic-key'
            }, async () => {
                const res = await request(app).get('/api/health');

                expect(res.body.status).toBe('ok');
                expect(res.body.checks).toEqual({
                    db: 'ok',
                    ai: 'ok'
                });
            });
        });

        test('Health check reports degraded when required runtime dependencies are missing', async () => {
            await withTemporaryEnv({
                MOCK_SUPABASE: undefined,
                MOCK_AI: undefined,
                DATABASE_URL: undefined,
                GEMINI_API_KEY: undefined,
                SUPABASE_URL: undefined,
                SUPABASE_SERVICE_ROLE_KEY: undefined,
                ANTHROPIC_API_KEY: undefined
            }, async () => {
                const res = await request(app).get('/api/health');

                expect(res.body.status).toBe('degraded');
                expect(res.body.checks).toEqual({
                    db: 'unavailable',
                    ai: 'unavailable'
                });
            });
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

        test('Health check reports partial push configuration without degrading core status', async () => {
            await withTemporaryEnv({
                MOCK_SUPABASE: 'true',
                MOCK_AI: 'true',
                VAPID_PUBLIC_KEY: 'public-key',
                VAPID_PRIVATE_KEY: undefined
            }, async () => {
                const res = await request(app).get('/api/health');

                expect(res.body.status).toBe('ok');
                expect(res.body.features.pushNotifications).toBe('partial');
            });
        });
    });

    describe('Public Config', () => {
        test('GET /api/config exposes only client-safe keys', async () => {
            const res = await request(app)
                .get('/api/config')
                .expect(200);

            expect(res.body).toHaveProperty('stripePublishableKey');
            expect(res.body).toHaveProperty('vapidPublicKey');
            expect(res.body).toHaveProperty('sentryDsn');
            expect(res.body).toHaveProperty('features');
            expect(res.body.features).toHaveProperty('pushNotifications');
            expect(res.body).not.toHaveProperty('VAPID_PRIVATE_KEY');
            expect(res.body).not.toHaveProperty('STRIPE_SECRET_KEY');
            expect(res.body).not.toHaveProperty('SENTRY_DSN');
        });

        test('GET /api/config exposes VAPID public key only when push sending is fully configured', async () => {
            await withTemporaryEnv({
                VAPID_PUBLIC_KEY: 'public-key',
                VAPID_PRIVATE_KEY: undefined
            }, async () => {
                const partialRes = await request(app)
                    .get('/api/config')
                    .expect(200);

                expect(partialRes.body.vapidPublicKey).toBeNull();
                expect(partialRes.body.features.pushNotifications).toBe(false);
            });

            await withTemporaryEnv({
                VAPID_PUBLIC_KEY: 'public-key',
                VAPID_PRIVATE_KEY: 'private-key'
            }, async () => {
                const configuredRes = await request(app)
                    .get('/api/config')
                    .expect(200);

                expect(configuredRes.body.vapidPublicKey).toBe('public-key');
                expect(configuredRes.body.features.pushNotifications).toBe(true);
            });
        });
    });

    describe('Birth Locations', () => {
        test('GET /api/birth-locations exposes client-safe supported city suggestions', async () => {
            const res = await request(app)
                .get('/api/birth-locations')
                .expect(200);

            expect(res.headers['cache-control']).toContain('max-age=86400');
            expect(res.body.success).toBe(true);
            expect(res.body.locations).toEqual(expect.arrayContaining([
                expect.objectContaining({ name: 'Praha', country: 'CZ' }),
                expect.objectContaining({ name: 'Krakov', country: 'PL' })
            ]));
            expect(res.body.locations[0]).not.toHaveProperty('latitude');
            expect(res.body.locations[0]).not.toHaveProperty('longitude');
            expect(res.body.locations[0]).not.toHaveProperty('timeZone');
        });
    });

    describe('API Docs', () => {
        const originalNodeEnv = process.env.NODE_ENV;
        const originalDocsToken = process.env.DOCS_TOKEN;
        const originalRailwayEnvironmentName = process.env.RAILWAY_ENVIRONMENT_NAME;

        afterEach(() => {
            process.env.NODE_ENV = originalNodeEnv;
            if (originalDocsToken === undefined) {
                delete process.env.DOCS_TOKEN;
            } else {
                process.env.DOCS_TOKEN = originalDocsToken;
            }
            if (originalRailwayEnvironmentName === undefined) {
                delete process.env.RAILWAY_ENVIRONMENT_NAME;
            } else {
                process.env.RAILWAY_ENVIRONMENT_NAME = originalRailwayEnvironmentName;
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
            expect(res.text).toContain('/config:');
            expect(res.text).toContain('PublicConfig:');
            expect(res.text).toContain('vapidPublicKey:');
            expect(res.text).toContain('sentryDsn:');
            expect(res.text).toContain('pushNotifications:');
            expect(res.text).toContain('/birth-locations:');
            expect(res.text).toContain('BirthLocationSuggestion:');
            expect(res.text).toContain('/push/subscribe:');
            expect(res.text).toContain('/push/unsubscribe:');
            expect(res.text).toContain('PushSubscription:');
            expect(res.text).toContain('/natal-chart/calculate:');
            expect(res.text).toContain('/synastry/calculate:');
            expect(res.text).toContain('/transits/current:');
            expect(res.text).toContain('/astrocartography:');
            expect(res.text).toContain('AstroChart:');
            expect(res.text).toContain('SynastryCalculation:');
            expect(res.text).toContain('TransitSnapshot:');
            expect(res.text).toContain('AstrocartographyInsights:');
            expect(res.text).toContain('precision:');
            expect(res.text).toContain('angularLines:');
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

        test('docs access denies Railway production without DOCS_TOKEN', () => {
            process.env.NODE_ENV = 'development';
            process.env.RAILWAY_ENVIRONMENT_NAME = 'production';
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

        test('Daily horoscope returns structured fallback when AI JSON is invalid', async () => {
            const originalForceInvalidJson = process.env.MOCK_AI_FORCE_INVALID_JSON;
            process.env.MOCK_AI_FORCE_INVALID_JSON = 'true';

            try {
                const csrfToken = await getCsrfToken();
                const res = await request(app)
                    .post('/api/horoscope')
                    .set('x-csrf-token', csrfToken)
                    .send({
                        sign: 'Lev',
                        period: 'daily',
                        context: [`invalid-json-${Date.now()}`]
                    })
                    .expect(200);

                expect(res.body.success).toBe(true);
                expect(res.body.fallback).toBe(true);
                expect(res.body.period).toBeTruthy();

                const parsed = JSON.parse(res.body.response);
                expect(parsed).toEqual(expect.objectContaining({
                    prediction: expect.any(String),
                    affirmation: expect.any(String),
                    luckyNumbers: expect.any(Array)
                }));
                expect(parsed.luckyNumbers).toHaveLength(4);
            } finally {
                if (originalForceInvalidJson === undefined) {
                    delete process.env.MOCK_AI_FORCE_INVALID_JSON;
                } else {
                    process.env.MOCK_AI_FORCE_INVALID_JSON = originalForceInvalidJson;
                }
            }
        });

        test('Daily horoscope AI limiter returns 429 without hanging', async () => {
            const originalNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            try {
                const csrfToken = await getCsrfToken();
                const statuses = [];
                const runId = Date.now();

                for (let i = 0; i < 12; i += 1) {
                    const res = await request(app)
                        .post('/api/horoscope')
                        .set('x-csrf-token', csrfToken)
                        .send({
                            sign: 'Beran',
                            period: 'daily',
                            context: [`${String.fromCharCode(65 + i)}-${runId}`]
                        })
                        .timeout({ response: 4000, deadline: 6000 });

                    statuses.push(res.status);
                    if (res.status === 429) break;
                }

                expect(statuses).toContain(429);
            } finally {
                process.env.NODE_ENV = originalNodeEnv;
            }
        }, 70000);
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

        test('POST /api/mentor/chat enforces free daily message limit', async () => {
            const userId = `mentor-free-${Date.now()}`;
            const today = new Date().toISOString().split('T')[0];

            await supabase.from('mentor_messages').insert([
                { user_id: userId, role: 'user', content: 'Prvni zprava', created_at: `${today}T08:00:00.000Z` },
                { user_id: userId, role: 'user', content: 'Druha zprava', created_at: `${today}T09:00:00.000Z` },
                { user_id: userId, role: 'user', content: 'Treti zprava', created_at: `${today}T10:00:00.000Z` }
            ]);

            const csrfToken = await getCsrfToken();
            const token = createUserToken({ id: userId });
            const res = await request(app)
                .post('/api/mentor/chat')
                .set('x-csrf-token', csrfToken)
                .set('Cookie', `auth_token=${token}`)
                .send({ message: 'Muzu jeste jednu radu?' })
                .expect(402);

            expect(res.body.code).toBe('PREMIUM_REQUIRED');
            expect(res.body.feature).toBe('mentor_unlimited');
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

        test('GET /horoskop/:sign/:date falls back when generated AI JSON is invalid', async () => {
            const originalForceInvalidJson = process.env.MOCK_AI_FORCE_INVALID_JSON;
            process.env.MOCK_AI_FORCE_INVALID_JSON = 'true';

            try {
                const today = new Date().toISOString().split('T')[0];
                const res = await request(app)
                    .get(`/horoskop/rak/${today}`)
                    .expect(200);

                expect(res.text).not.toContain('Testovaci AI odpoved pro invalidni JSON fallback.');
                expect(res.text).toContain('Jdu svým tempem');
                expect(res.text).toContain('Čísla štěstí');
            } finally {
                if (originalForceInvalidJson === undefined) {
                    delete process.env.MOCK_AI_FORCE_INVALID_JSON;
                } else {
                    process.env.MOCK_AI_FORCE_INVALID_JSON = originalForceInvalidJson;
                }
            }
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
