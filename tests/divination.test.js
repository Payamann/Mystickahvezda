import { jest } from '@jest/globals';
import request from 'supertest';

// Mock Dependencies
jest.unstable_mockModule('../server/db-supabase.js', () => ({
    supabase: {}
}));

jest.unstable_mockModule('../server/middleware.js', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 'test-user' };
        next();
    },
    requirePremium: (req, res, next) => next(),
    requirePremiumSoft: (req, res, next) => next()
}));

// Mock Payment Module for Premium Checks
jest.unstable_mockModule('../server/payment.js', () => ({
    __esModule: true,
    default: jest.fn((req, res, next) => next()), // Mock router
    isPremiumUser: jest.fn()
}));

// Mock Fetch for Gemini
global.fetch = jest.fn();

// Import dependencies
const { isPremiumUser } = await import('../server/payment.js');
const app = (await import('../server/index.js')).default;

describe('Divination APIs', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: "Mystic Output" }] } }]
            })
        });
    });

    describe('POST /api/crystal-ball', () => {
        it('should return a mystical response', async () => {
            const res = await request(app)
                .post('/api/crystal-ball')
                .send({ question: "Will I win?" });

            expect(res.status).toBe(200);
            expect(res.body.response).toBe("Mystic Output");
        });
    });

    describe('POST /api/tarot', () => {
        it('should allow 1-card spread for free users', async () => {
            isPremiumUser.mockResolvedValue(false);

            const res = await request(app)
                .post('/api/tarot')
                .send({ question: "Love?", cards: ["The Fool"], spreadType: "one-card" });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should BLOCK 3-card spread for free users', async () => {
            isPremiumUser.mockResolvedValue(false);

            const res = await request(app)
                .post('/api/tarot')
                .send({ question: "Career?", cards: ["Fool", "Magician", "Sun"], spreadType: "three-card" });

            expect(res.status).toBe(403);
            expect(res.body.code).toBe('PREMIUM_REQUIRED');
        });

        it('should ALLOW 3-card spread for premium users', async () => {
            isPremiumUser.mockResolvedValue(true);

            const res = await request(app)
                .post('/api/tarot')
                .send({ question: "Career?", cards: ["Fool", "Magician", "Sun"], spreadType: "three-card" });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
