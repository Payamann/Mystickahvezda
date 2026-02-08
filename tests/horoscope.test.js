import { jest } from '@jest/globals';
import request from 'supertest';

// Mock Dependencies
jest.unstable_mockModule('../server/db-supabase.js', () => ({
    supabase: {
        from: jest.fn()
    }
}));

jest.unstable_mockModule('../server/config/secrets.js', () => ({
    JWT_SECRET: 'test-secret'
}));

jest.unstable_mockModule('../server/payment.js', () => ({
    __esModule: true,
    default: jest.fn((req, res, next) => next()),
    isPremiumUser: jest.fn(),
    handleStripeWebhook: jest.fn()
}));

// Mock Fetch for Gemini
global.fetch = jest.fn();

// Import dependencies
const { supabase } = await import('../server/db-supabase.js');
const app = (await import('../server/index.js')).default;

describe('Horoscope API (POST /api/horoscope)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should generate new horoscope on cache miss', async () => {
        // 1. Mock Cache MISS
        const mockSupabaseBuilder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }), // Not found
            upsert: jest.fn().mockResolvedValue({ error: null })
        };
        supabase.from.mockReturnValue(mockSupabaseBuilder);

        // 2. Mock Gemini Response
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: "Dnes bude skvělý den." }] } }]
            })
        });

        const res = await request(app)
            .post('/api/horoscope')
            .send({ sign: 'Lev', period: 'daily' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.response).toBe("Dnes bude skvělý den.");
        expect(res.body.cached).toBeUndefined(); // Or falsy

        // Verify it tried to check cache
        expect(supabase.from).toHaveBeenCalledWith('cache_horoscopes');
        // Verify it saved to cache
        expect(mockSupabaseBuilder.upsert).toHaveBeenCalled();
    });

    it('should return cached horoscope on cache hit', async () => {
        // 1. Mock Cache HIT
        const mockSupabaseBuilder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: { response: "Cached horoscope text", period_label: "Denní" },
                error: null
            })
        };
        supabase.from.mockReturnValue(mockSupabaseBuilder);

        const res = await request(app)
            .post('/api/horoscope')
            .send({ sign: 'Lev', period: 'daily' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.response).toBe("Cached horoscope text");
        expect(res.body.cached).toBe(true);

        // Should NOT call Gemini
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
