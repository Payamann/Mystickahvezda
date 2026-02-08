import { jest } from '@jest/globals';
import request from 'supertest';

// 1. Mock dependencies BEFORE importing app
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



jest.unstable_mockModule('../server/payment.js', () => ({
    __esModule: true,
    default: jest.fn((req, res, next) => next()),
    handleStripeWebhook: jest.fn(),
    isPremiumUser: jest.fn().mockResolvedValue(false)
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

// 2. Import Mocks & App
const { supabase } = await import('../server/db-supabase.js');
const jwt = (await import('jsonwebtoken')).default;
const app = (await import('../server/index.js')).default;

describe('Auth API (POST /api/auth/login)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should login successfully with valid credentials', async () => {
        // Setup Mocks
        const mockUser = {
            id: '123',
            email: 'test@test.com',
            password_hash: 'hashed_password'
        };

        // Supabase mock chain (Builder pattern)
        const mockBuilder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            insert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
            // Make it awaitable to return list by default
            then: (resolve) => resolve({ data: [mockUser], error: null })
        };
        supabase.from.mockReturnValue(mockBuilder);

        // Supabase Auth Mock
        supabase.auth.signInWithPassword.mockResolvedValue({
            data: { user: mockUser },
            error: null
        });

        // JWT mock
        jwt.sign.mockReturnValue('fake_token');

        // Run Request
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com', password: 'password123' });

        // Assertions
        expect(res.status).toBe(200);
        expect(res.body.token).toEqual(expect.any(String));
        expect(res.body.user).toBeDefined();
        expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('should return 401 for invalid password', async () => {
        // Setup Mocks
        const mockUser = { id: '123', email: 'test@test.com' };

        // Mock Auth Failure
        supabase.auth.signInWithPassword.mockResolvedValue({
            data: { user: null },
            error: { message: "Invalid login credentials" }
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com', password: 'wrong' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/nesprávné/i);
    });
});
