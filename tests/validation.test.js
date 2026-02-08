import { jest } from '@jest/globals';
import request from 'supertest';

// Mock Dependencies
jest.unstable_mockModule('../server/db-supabase.js', () => ({
    supabase: { from: jest.fn() }
}));

jest.unstable_mockModule('../server/middleware.js', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 'test-user', email: 'test@test.com' };
        next();
    },
    requirePremium: (req, res, next) => next(),
    requirePremiumSoft: (req, res, next) => next(),
    requireAdmin: (req, res, next) => next()
}));

jest.unstable_mockModule('../server/payment.js', () => ({
    __esModule: true,
    default: jest.fn((req, res, next) => next()),
    handleStripeWebhook: jest.fn(),
    isPremiumUser: jest.fn().mockResolvedValue(false)
}));

// Mock Gemini
global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text: "Mocked response" }] } }] })
});

// Import after mocks
const app = (await import('../server/index.js')).default;

describe('Input Validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ candidates: [{ content: { parts: [{ text: "Mocked response" }] } }] })
        });
    });

    describe('POST /api/crystal-ball', () => {
        it('should reject missing question', async () => {
            const res = await request(app)
                .post('/api/crystal-ball')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toBeDefined();
        });

        it('should reject non-string question', async () => {
            const res = await request(app)
                .post('/api/crystal-ball')
                .send({ question: 123 });

            expect(res.status).toBe(400);
        });

        it('should accept valid question', async () => {
            const res = await request(app)
                .post('/api/crystal-ball')
                .send({ question: 'What does the future hold?' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('POST /api/horoscope', () => {
        it('should reject missing sign', async () => {
            const res = await request(app)
                .post('/api/horoscope')
                .send({ period: 'daily' });

            expect(res.status).toBe(400);
        });

        it('should reject invalid period', async () => {
            const res = await request(app)
                .post('/api/horoscope')
                .send({ sign: 'beran', period: 'hourly' });

            expect(res.status).toBe(400);
        });

        it('should accept valid horoscope request', async () => {
            const res = await request(app)
                .post('/api/horoscope')
                .send({ sign: 'beran', period: 'daily' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('POST /api/natal-chart', () => {
        it('should reject missing birthDate', async () => {
            const res = await request(app)
                .post('/api/natal-chart')
                .send({ name: 'Test' });

            expect(res.status).toBe(400);
        });

        it('should accept valid natal chart request', async () => {
            const res = await request(app)
                .post('/api/natal-chart')
                .send({ birthDate: '1990-01-01', birthTime: '12:00', birthPlace: 'Praha', name: 'Test' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('POST /api/astrocartography', () => {
        it('should reject missing birthDate', async () => {
            const res = await request(app)
                .post('/api/astrocartography')
                .send({ name: 'Test' });

            expect(res.status).toBe(400);
        });

        it('should accept valid astrocartography request', async () => {
            const res = await request(app)
                .post('/api/astrocartography')
                .send({ birthDate: '1990-01-01', birthTime: '12:00', birthPlace: 'Praha', name: 'Test' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('POST /api/tarot-summary', () => {
        it('should reject non-array cards', async () => {
            const res = await request(app)
                .post('/api/tarot-summary')
                .send({ cards: 'not-array', spreadType: 'celtic' });

            expect(res.status).toBe(400);
        });

        it('should reject empty cards array', async () => {
            const res = await request(app)
                .post('/api/tarot-summary')
                .send({ cards: [], spreadType: 'celtic' });

            expect(res.status).toBe(400);
        });

        it('should accept valid tarot summary request', async () => {
            const res = await request(app)
                .post('/api/tarot-summary')
                .send({
                    cards: [{ position: 'Past', name: 'The Fool', meaning: 'New beginnings' }],
                    spreadType: 'tříkartový'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
