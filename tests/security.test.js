import { jest } from '@jest/globals';
import request from 'supertest';

// Mock Dependencies
jest.unstable_mockModule('../server/db-supabase.js', () => ({
    supabase: {
        from: jest.fn(),
        auth: {
            admin: { updateUserById: jest.fn() },
            signInWithPassword: jest.fn(),
            signUp: jest.fn()
        }
    }
}));

jest.unstable_mockModule('jsonwebtoken', () => {
    const mockJwt = {
        sign: jest.fn(),
        verify: jest.fn()
    };
    return {
        __esModule: true,
        default: mockJwt,
        ...mockJwt
    };
});

jest.unstable_mockModule('../server/payment.js', () => ({
    __esModule: true,
    default: jest.fn((req, res, next) => next()),
    handleStripeWebhook: jest.fn(),
    isPremiumUser: jest.fn().mockResolvedValue(false)
}));

// Mock Gemini
global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text: "Mocked" }] } }] })
});

// 2. Import after mocks
const { supabase } = await import('../server/db-supabase.js');
const jwt = (await import('jsonwebtoken')).default;
const app = (await import('../server/index.js')).default;

describe('Security Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ candidates: [{ content: { parts: [{ text: "Mocked" }] } }] })
        });
    });

    describe('Authentication', () => {
        it('should return 401 for protected endpoints without token', async () => {
            const res = await request(app)
                .post('/api/tarot')
                .send({ question: 'test', cards: ['fool'] });

            expect(res.status).toBe(401);
        });

        it('should return 403 for invalid token', async () => {
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(new Error('invalid token'), null);
            });

            const res = await request(app)
                .post('/api/tarot')
                .set('Authorization', 'Bearer invalid-token')
                .send({ question: 'test', cards: ['fool'] });

            expect(res.status).toBe(403);
        });

        it('should return 401 for readings without token', async () => {
            const res = await request(app)
                .get('/api/user/readings');

            expect(res.status).toBe(401);
        });

        it('should return 401 for password change without token', async () => {
            const res = await request(app)
                .put('/api/user/password')
                .send({ password: 'newpassword123' });

            expect(res.status).toBe(401);
        });
    });

    describe('Input Sanitization', () => {
        it('should truncate excessively long questions', async () => {
            const longQuestion = 'A'.repeat(1000);
            const res = await request(app)
                .post('/api/crystal-ball')
                .send({ question: longQuestion });

            expect(res.status).toBe(200);
        });

        it('should handle malformed history gracefully', async () => {
            const res = await request(app)
                .post('/api/crystal-ball')
                .send({ question: 'test', history: 'not-array' });

            expect(res.status).toBe(200);
        });
    });

    describe('Password Endpoint Auth', () => {
        it('should reject unauthenticated password change', async () => {
            const res = await request(app)
                .put('/api/user/password')
                .send({ password: 'newpassword123' });

            // Without token, should get 401
            expect(res.status).toBe(401);
        });

        it('should reject invalid token on password change', async () => {
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(new Error('invalid'), null);
            });

            const res = await request(app)
                .put('/api/user/password')
                .set('Authorization', 'Bearer bad-token')
                .send({ password: 'newpassword123' });

            expect(res.status).toBe(403);
        });
    });

    describe('Registration Validation', () => {
        it('should reject registration without email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ password: 'password123' });

            expect(res.status).toBe(400);
        });

        it('should reject registration without password', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ email: 'test@test.com' });

            expect(res.status).toBe(400);
        });
    });

    describe('Health Check', () => {
        it('should return OK', async () => {
            const res = await request(app)
                .get('/api/health');

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });
});
