import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index.js';

describe('Oracle AI fallbacks', () => {
    const originalForceError = process.env.MOCK_AI_FORCE_ERROR;

    async function getCsrfToken() {
        const res = await request(app).get('/api/csrf-token').expect(200);
        return res.body.csrfToken;
    }

    function createPremiumToken(overrides = {}) {
        return jwt.sign({
            id: 'oracle-fallback-user',
            email: 'oracle-fallback@example.com',
            role: 'user',
            isPremium: true,
            subscription_status: 'premium_monthly',
            ...overrides
        }, process.env.JWT_SECRET, { expiresIn: '1h' });
    }

    beforeEach(() => {
        process.env.MOCK_AI_FORCE_ERROR = 'true';
    });

    afterEach(() => {
        if (originalForceError === undefined) {
            delete process.env.MOCK_AI_FORCE_ERROR;
        } else {
            process.env.MOCK_AI_FORCE_ERROR = originalForceError;
        }
    });

    test('POST /api/angel-card returns fallback when AI fails', async () => {
        const csrfToken = await getCsrfToken();
        const token = createPremiumToken();
        const res = await request(app)
            .post('/api/angel-card')
            .set('x-csrf-token', csrfToken)
            .set('Cookie', `auth_token=${token}`)
            .send({
                card: { name: 'Hope', theme: 'Calm guidance' },
                intention: 'clarity'
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.fallback).toBe(true);
        expect(res.body.isTeaser).toBe(false);
        expect(res.body.response).toEqual(expect.stringContaining('Hope'));
    });

    test('POST /api/crystal-ball returns fallback when AI fails', async () => {
        const csrfToken = await getCsrfToken();
        const res = await request(app)
            .post('/api/crystal-ball')
            .set('x-csrf-token', csrfToken)
            .send({
                question: 'Should I change direction?'
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.fallback).toBe(true);
        expect(res.body.response).toEqual(expect.stringContaining('Should I change direction?'));
    });

    test('POST /api/dream returns fallback when AI fails', async () => {
        const csrfToken = await getCsrfToken();
        const token = createPremiumToken();
        const res = await request(app)
            .post('/api/dream')
            .set('x-csrf-token', csrfToken)
            .set('Cookie', `auth_token=${token}`)
            .send({
                dream: 'I was walking through a quiet city of mirrors.'
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.fallback).toBe(true);
        expect(res.body.response).toEqual(expect.stringContaining('quiet city of mirrors'));
    });

    test('POST /api/tarot returns fallback when AI fails', async () => {
        const csrfToken = await getCsrfToken();
        const token = createPremiumToken();
        const res = await request(app)
            .post('/api/tarot')
            .set('x-csrf-token', csrfToken)
            .set('Cookie', `auth_token=${token}`)
            .send({
                question: 'What needs attention?',
                spreadType: 'three-card',
                cards: ['The Sun', 'The Moon', 'The Star']
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.fallback).toBe(true);
        expect(res.body.response).toEqual(expect.stringContaining('The Sun'));
    });

    test('POST /api/tarot-summary returns fallback when AI fails', async () => {
        const csrfToken = await getCsrfToken();
        const token = createPremiumToken();
        const res = await request(app)
            .post('/api/tarot-summary')
            .set('x-csrf-token', csrfToken)
            .set('Cookie', `auth_token=${token}`)
            .send({
                spreadType: 'three-card',
                cards: [
                    { position: 'past', name: 'The Sun', meaning: 'clarity' },
                    { position: 'present', name: 'The Moon', meaning: 'uncertainty' },
                    { position: 'future', name: 'The Star', meaning: 'hope' }
                ]
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.fallback).toBe(true);
        expect(res.body.response).toEqual(expect.stringContaining('The Moon'));
        expect(res.body.response).toEqual(expect.stringContaining('Teď to pro tebe znamená'));
        expect(res.body.response).toEqual(expect.stringContaining('Praktický krok na příštích 24 hodin'));
    });

    test('POST /api/tarot-summary requires Premium for multi-card summaries', async () => {
        const csrfToken = await getCsrfToken();
        const token = createPremiumToken({ isPremium: false, subscription_status: 'free' });
        const res = await request(app)
            .post('/api/tarot-summary')
            .set('x-csrf-token', csrfToken)
            .set('Cookie', `auth_token=${token}`)
            .send({
                spreadType: 'three-card',
                cards: [
                    { position: 'past', name: 'The Sun', meaning: 'clarity' },
                    { position: 'present', name: 'The Moon', meaning: 'uncertainty' },
                    { position: 'future', name: 'The Star', meaning: 'hope' }
                ]
            })
            .expect(402);

        expect(res.body).toMatchObject({
            success: false,
            code: 'PREMIUM_REQUIRED',
            feature: 'tarot_multi_card'
        });
    });

    test('POST /api/tarot-summary maps Celtic Cross to the exclusive feature gate', async () => {
        const csrfToken = await getCsrfToken();
        const token = createPremiumToken({ isPremium: false, subscription_status: 'free' });
        const res = await request(app)
            .post('/api/tarot-summary')
            .set('x-csrf-token', csrfToken)
            .set('Cookie', `auth_token=${token}`)
            .send({
                spreadType: 'Celtic Cross',
                cards: Array.from({ length: 10 }, (_, index) => ({
                    position: `position-${index + 1}`,
                    name: `Card ${index + 1}`,
                    meaning: 'symbolic meaning'
                }))
            })
            .expect(402);

        expect(res.body).toMatchObject({
            success: false,
            code: 'PREMIUM_REQUIRED',
            feature: 'tarot_celtic_cross',
            requiredPlan: 'vip-majestrat'
        });
    });

    test('POST /api/runes returns fallback when AI fails', async () => {
        const csrfToken = await getCsrfToken();
        const token = createPremiumToken();
        const res = await request(app)
            .post('/api/runes')
            .set('x-csrf-token', csrfToken)
            .set('Cookie', `auth_token=${token}`)
            .send({
                rune: { name: 'Fehu', meaning: 'wealth and energy' },
                intention: 'work',
                history: ['career']
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.fallback).toBe(true);
        expect(res.body.isTeaser).toBe(false);
        expect(res.body.response).toEqual(expect.stringContaining('Fehu'));
    });

    test('POST /api/daily-wisdom returns fallback when AI fails', async () => {
        const csrfToken = await getCsrfToken();
        const token = createPremiumToken();
        const res = await request(app)
            .post('/api/daily-wisdom')
            .set('x-csrf-token', csrfToken)
            .set('Cookie', `auth_token=${token}`)
            .send({
                sign: 'Beran',
                moonPhase: 'dorustajici'
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.fallback).toBe(true);
        expect(res.body.response).toEqual(expect.stringContaining('Beran'));
    });

    test('POST /api/daily-wisdom requires Premium for authenticated free users', async () => {
        const csrfToken = await getCsrfToken();
        const token = createPremiumToken({ isPremium: false, subscription_status: 'free' });
        const res = await request(app)
            .post('/api/daily-wisdom')
            .set('x-csrf-token', csrfToken)
            .set('Cookie', `auth_token=${token}`)
            .send({
                sign: 'Beran',
                moonPhase: 'dorustajici'
            })
            .expect(402);

        expect(res.body).toMatchObject({
            success: false,
            code: 'PREMIUM_REQUIRED',
            feature: 'daily_guidance'
        });
    });
});
