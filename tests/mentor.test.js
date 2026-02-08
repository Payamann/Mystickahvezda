import { jest } from '@jest/globals';
import request from 'supertest';

// Mock Modules
jest.unstable_mockModule('../server/db-supabase.js', () => ({
    supabase: {
        from: jest.fn()
    }
}));

// Mock Middleware to bypass real auth
jest.unstable_mockModule('../server/middleware.js', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 'test-user-id' };
        next();
    },
    requirePremium: (req, res, next) => next(), // Skip premium check
    requirePremiumSoft: (req, res, next) => next(),
    requireAdmin: (req, res, next) => next()
}));

jest.unstable_mockModule('../server/payment.js', () => ({
    __esModule: true,
    default: jest.fn((req, res, next) => next()),
    handleStripeWebhook: jest.fn(),
    isPremiumUser: jest.fn().mockResolvedValue(false)
}));

// Mock Global Fetch (for Gemini)
global.fetch = jest.fn();

// Import dependencies
const { supabase } = await import('../server/db-supabase.js');
const app = (await import('../server/index.js')).default;

describe('Mentor API (POST /api/mentor/chat)', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default Supabase mock behavior (return nice chain)
        const mockChain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { name: 'TestUser' } }), // Profile
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            insert: jest.fn().mockResolvedValue({ error: null })
        };
        supabase.from.mockReturnValue(mockChain);
    });

    it('should return a response from Mentor', async () => {
        // Mock Gemini Response
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: "Hvězdy tě zdraví." }] } }]
            })
        });

        const res = await request(app)
            .post('/api/mentor/chat')
            .send({ message: "Ahoj" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.reply).toBe("Hvězdy tě zdraví.");

        // Check if message was saved to DB
        expect(supabase.from).toHaveBeenCalledWith('mentor_messages');
    });

    it('should handle database errors gracefully (Robustness Check)', async () => {
        // Mock Gemini Response
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: "Odpověď i přes chybu DB." }] } }]
            })
        });

        // Force DB Insert Error
        const mockInsert = jest.fn().mockRejectedValue(new Error("DB Connection Failed"));
        supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null }),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            insert: mockInsert
        });

        const res = await request(app)
            .post('/api/mentor/chat')
            .send({ message: "Test crash" });

        // Should still succeed because we added try/catch blocks!
        expect(res.status).toBe(200);
        expect(res.body.reply).toBe("Odpověď i přes chybu DB.");
    });
});
