import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index.js';

describe('Astro calculation routes', () => {
    async function getCsrfToken() {
        const res = await request(app).get('/api/csrf-token').expect(200);
        return res.body.csrfToken;
    }

    function createExclusiveToken(overrides = {}) {
        return jwt.sign({
            id: 'astro-test-user',
            email: 'astro@example.com',
            role: 'user',
            isPremium: true,
            subscription_status: 'exclusive_monthly',
            ...overrides
        }, process.env.JWT_SECRET, { expiresIn: '1h' });
    }

    test('GET /api/natal-chart/calculate returns public chart data', async () => {
        const res = await request(app)
            .get('/api/natal-chart/calculate')
            .query({
                birthDate: '1990-01-01',
                birthTime: '12:00',
                birthPlace: 'Praha',
                name: 'Test'
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.chart.engine.version).toBe('astro-engine-v1');
        expect(res.body.chart.summary.sunSign).toBe('Kozoroh');
        expect(res.body.chart.planets.sun.sign.name).toBe('Kozoroh');
        expect(res.body.chart.location.name).toBe('Praha');
        expect(res.body.chart.houses.available).toBe(true);
        expect(res.body.chart.summary.ascendantSign).toBeTruthy();
    });

    test('GET /api/natal-chart/calculate accepts exact coordinates and time zone', async () => {
        const res = await request(app)
            .get('/api/natal-chart/calculate')
            .query({
                birthDate: '1990-01-01',
                birthTime: '12:00',
                birthPlace: 'Praha - souradnice',
                latitude: '50.0755',
                longitude: '14.4378',
                timeZone: 'Europe/Prague',
                country: 'CZ',
                name: 'Test'
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.chart.engine.precision).toBe('birth_time_location_timezone');
        expect(res.body.chart.location).toEqual(expect.objectContaining({
            name: 'Praha - souradnice',
            country: 'CZ',
            source: 'coordinates',
            timeZone: 'Europe/Prague'
        }));
        expect(res.body.chart.houses.available).toBe(true);
        expect(res.body.chart.summary.ascendantSign).toBeTruthy();
    });

    test('GET /api/natal-chart/calculate rejects invalid dates', async () => {
        const res = await request(app)
            .get('/api/natal-chart/calculate')
            .query({ birthDate: '2026-02-31' })
            .expect(400);

        expect(res.body.success).toBe(false);
    });

    test('POST /api/natal-chart returns premium fallback when AI fails', async () => {
        const originalForceError = process.env.MOCK_AI_FORCE_ERROR;
        process.env.MOCK_AI_FORCE_ERROR = 'true';

        try {
            const csrfToken = await getCsrfToken();
            const token = createExclusiveToken();
            const res = await request(app)
                .post('/api/natal-chart')
                .set('x-csrf-token', csrfToken)
                .set('Cookie', `auth_token=${token}`)
                .send({
                    birthDate: '1990-01-01',
                    birthTime: '12:00',
                    birthPlace: 'Praha',
                    name: 'Anna'
                })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.fallback).toBe(true);
            expect(res.body.isTeaser).toBe(false);
            expect(res.body.response).toEqual(expect.stringContaining('Anna'));
            expect(res.body.chart.summary.sunSign).toBe('Kozoroh');
        } finally {
            if (originalForceError === undefined) {
                delete process.env.MOCK_AI_FORCE_ERROR;
            } else {
                process.env.MOCK_AI_FORCE_ERROR = originalForceError;
            }
        }
    });

    test('POST /api/synastry/calculate returns public server-side scores', async () => {
        const csrfToken = await getCsrfToken();
        const res = await request(app)
            .post('/api/synastry/calculate')
            .set('x-csrf-token', csrfToken)
            .send({
                person1: { name: 'A', birthDate: '1990-01-01' },
                person2: { name: 'B', birthDate: '1992-07-15' }
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.synastry.engine.version).toBe('astro-engine-v1');
        expect(res.body.synastry.scores.total).toBeGreaterThanOrEqual(0);
        expect(res.body.synastry.scores.total).toBeLessThanOrEqual(100);
        expect(res.body.synastry.crossAspects.length).toBeGreaterThan(0);
    });

    test('POST /api/synastry/calculate accepts optional times and birth places', async () => {
        const csrfToken = await getCsrfToken();
        const res = await request(app)
            .post('/api/synastry/calculate')
            .set('x-csrf-token', csrfToken)
            .send({
                person1: {
                    name: 'A',
                    birthDate: '1990-01-01',
                    birthTime: '12:00',
                    birthPlace: 'Praha'
                },
                person2: {
                    name: 'B',
                    birthDate: '1992-07-15',
                    birthTime: '08:30',
                    birthPlace: 'Brno'
                }
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.synastry.engine.precision).toBe('birth_time_location_timezone');
        expect(res.body.synastry.person1.chart.summary.ascendantSign).toBeTruthy();
        expect(res.body.synastry.person2.chart.summary.ascendantSign).toBeTruthy();
    });

    test('POST /api/synastry/calculate preserves exact coordinate birth profiles', async () => {
        const csrfToken = await getCsrfToken();
        const res = await request(app)
            .post('/api/synastry/calculate')
            .set('x-csrf-token', csrfToken)
            .send({
                person1: {
                    name: 'A',
                    birthDate: '1990-01-01',
                    birthTime: '12:00',
                    birthPlace: 'Praha - souradnice',
                    latitude: 50.0755,
                    longitude: 14.4378,
                    timeZone: 'Europe/Prague',
                    country: 'CZ'
                },
                person2: {
                    name: 'B',
                    birthDate: '1992-07-15',
                    birthTime: '08:30',
                    birthPlace: 'Brno'
                }
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.synastry.engine.person1Precision).toBe('birth_time_location_timezone');
        expect(res.body.synastry.person1.chart.location).toEqual(expect.objectContaining({
            source: 'coordinates',
            timeZone: 'Europe/Prague'
        }));
        expect(res.body.synastry.person1.chart.houses.available).toBe(true);
        expect(res.body.synastry.person2.chart.location.name).toBe('Brno');
    });

    test('POST /api/synastry returns premium fallback when AI fails', async () => {
        const originalForceError = process.env.MOCK_AI_FORCE_ERROR;
        process.env.MOCK_AI_FORCE_ERROR = 'true';

        try {
            const csrfToken = await getCsrfToken();
            const token = createExclusiveToken();
            const res = await request(app)
                .post('/api/synastry')
                .set('x-csrf-token', csrfToken)
                .set('Cookie', `auth_token=${token}`)
                .send({
                    person1: { name: 'Anna', birthDate: '1990-01-01' },
                    person2: { name: 'Pavel', birthDate: '1992-07-15' }
                })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.fallback).toBe(true);
            expect(res.body.isTeaser).toBe(false);
            expect(res.body.response).toEqual(expect.stringContaining('Anna'));
            expect(res.body.response).toEqual(expect.stringContaining('Pavel'));
            expect(res.body.synastry.scores.total).toEqual(expect.any(Number));
        } finally {
            if (originalForceError === undefined) {
                delete process.env.MOCK_AI_FORCE_ERROR;
            } else {
                process.env.MOCK_AI_FORCE_ERROR = originalForceError;
            }
        }
    });

    test('GET /api/transits/current returns current transit snapshot', async () => {
        const res = await request(app)
            .get('/api/transits/current')
            .query({
                birthDate: '1990-01-01',
                birthTime: '12:00',
                birthPlace: 'Praha'
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.transit.engine.version).toBe('astro-engine-v1');
        expect(res.body.transit.current.sunSign).toBeTruthy();
        expect(res.body.transit.natal.sunSign).toBe('Kozoroh');
        expect(res.body.transit.message).toBeTruthy();
    });

    test('POST /api/astrocartography returns structured destination insights for exclusive users', async () => {
        const csrfToken = await getCsrfToken();
        const token = createExclusiveToken();
        const res = await request(app)
            .post('/api/astrocartography')
            .set('x-csrf-token', csrfToken)
            .set('Cookie', `auth_token=${token}`)
            .send({
                birthDate: '1990-01-01',
                birthTime: '12:00',
                birthPlace: 'Praha',
                name: 'Test',
                intention: 'kariera'
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.response).toBe('Testovaci AI odpoved pro izolovane automatizovane testy.');
        expect(res.body.chart.summary.sunSign).toBe('Kozoroh');
        expect(res.body.astrocartography.engine.method).toBe('symbolic_destination_resonance');
        expect(res.body.astrocartography.intention.key).toBe('kariera');
        expect(res.body.astrocartography.precision).toBe('birth_time_location_timezone');
        expect(res.body.astrocartography.location).toEqual(expect.objectContaining({ name: 'Praha' }));
        expect(res.body.astrocartography.angularLines.length).toBeGreaterThan(0);
        expect(res.body.astrocartography.angularLines[0].map.x).toEqual(expect.any(Number));
        expect(res.body.astrocartography.recommendations).toHaveLength(5);
        expect(res.body.astrocartography.recommendations[0].city).toBeTruthy();
        expect(res.body.astrocartography.recommendations[0].primaryPlanet.name).toBeTruthy();
        expect(res.body.astrocartography.recommendations[0].primaryPlanet.degreeText).toMatch(/°/);
    });

    test('POST /api/astrocartography returns fallback when AI fails', async () => {
        const originalForceError = process.env.MOCK_AI_FORCE_ERROR;
        process.env.MOCK_AI_FORCE_ERROR = 'true';

        try {
            const csrfToken = await getCsrfToken();
            const token = createExclusiveToken();
            const res = await request(app)
                .post('/api/astrocartography')
                .set('x-csrf-token', csrfToken)
                .set('Cookie', `auth_token=${token}`)
                .send({
                    birthDate: '1990-01-01',
                    birthTime: '12:00',
                    birthPlace: 'Praha',
                    name: 'Anna',
                    intention: 'kariera'
                })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.fallback).toBe(true);
            expect(res.body.response).toEqual(expect.stringContaining('Anna'));
            expect(res.body.astrocartography.recommendations).toHaveLength(5);
            expect(res.body.astrocartography.recommendations[0].score).toEqual(expect.any(Number));
        } finally {
            if (originalForceError === undefined) {
                delete process.env.MOCK_AI_FORCE_ERROR;
            } else {
                process.env.MOCK_AI_FORCE_ERROR = originalForceError;
            }
        }
    });
});
