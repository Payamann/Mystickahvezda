import { jest } from '@jest/globals';
import request from 'supertest';

// Mock Dependencies
jest.unstable_mockModule('../server/db-supabase.js', () => ({
    supabase: { from: jest.fn() }
}));

jest.unstable_mockModule('../server/middleware.js', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 'test-user' };
        next();
    },
    requirePremium: (req, res, next) => next(),
    requirePremiumSoft: (req, res, next) => next()
}));

jest.unstable_mockModule('../server/payment.js', () => ({
    __esModule: true,
    default: jest.fn(),
    isPremiumUser: jest.fn()
}));

global.fetch = jest.fn();

const { isPremiumUser } = await import('../server/payment.js');
const { supabase } = await import('../server/db-supabase.js');
const app = (await import('../server/index.js')).default;

describe('Astrology APIs', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ candidates: [{ content: { parts: [{ text: "Astrological Output" }] } }] })
        });
    });

    describe('POST /api/natal-chart', () => {
        it('should return natal chart analysis', async () => {
            const res = await request(app)
                .post('/api/natal-chart')
                .send({ birthDate: '1990-01-01', birthTime: '12:00', birthPlace: 'Prague', name: 'Test' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.response).toBe("Astrological Output");
        });
    });

    describe('POST /api/synastry', () => {
        it('should return TEASER for free users', async () => {
            isPremiumUser.mockResolvedValue(false);

            const res = await request(app)
                .post('/api/synastry')
                .send({ person1: { name: 'A' }, person2: { name: 'B' } });

            expect(res.status).toBe(200);
            expect(res.body.isTeaser).toBe(true);
            expect(res.body.response).toBeNull(); // No API call
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should return FULL analysis for premium users', async () => {
            isPremiumUser.mockResolvedValue(true);

            const res = await request(app)
                .post('/api/synastry')
                .send({ person1: { name: 'A' }, person2: { name: 'B' } });

            expect(res.status).toBe(200);
            expect(res.body.isTeaser).toBe(false);
            expect(global.fetch).toHaveBeenCalled();
        });
    });

    describe('POST /api/numerology', () => {
        it('should use cache if available', async () => {
            // Mock Cache Hit
            supabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: { response: "Cached Numero" }, error: null })
                    })
                })
            });

            const res = await request(app)
                .post('/api/numerology')
                .send({ name: 'Test', lifePath: 1 });

            expect(res.status).toBe(200);
            expect(res.body.cached).toBe(true);
            expect(res.body.response).toBe("Cached Numero");
        });
    });

    describe('POST /api/astrocartography', () => {
        it('should return astrocartography analysis', async () => {
            const res = await request(app)
                .post('/api/astrocartography')
                .send({ birthPlace: 'Prague' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
