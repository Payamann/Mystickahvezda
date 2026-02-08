import { jest } from '@jest/globals';
import request from 'supertest';

// Mock Dependencies
jest.unstable_mockModule('../server/db-supabase.js', () => ({
    supabase: {
        from: jest.fn(),
        auth: { admin: { updateUserById: jest.fn() } }
    }
}));

jest.unstable_mockModule('../server/middleware.js', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 'test-user-id' };
        next();
    },
    requirePremium: (req, res, next) => next(),
    requirePremiumSoft: (req, res, next) => next()
}));

const { supabase } = await import('../server/db-supabase.js');
const app = (await import('../server/index.js')).default;

describe('User Data APIs', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock builder for Supabase
        const mockBuilder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 1, type: 'tarot' }, error: null }),
            insert: jest.fn().mockReturnThis(), // Returns builder for select()
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            then: (resolve) => resolve({ data: [], error: null }) // List by default
        };
        supabase.from.mockReturnValue(mockBuilder);
    });

    describe('POST /api/user/readings', () => {
        it('should save a reading', async () => {
            const res = await request(app)
                .post('/api/user/readings')
                .send({ type: 'tarot', data: { cards: [] } });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(supabase.from).toHaveBeenCalledWith('readings');
        });
    });

    describe('GET /api/user/readings', () => {
        it('should fetch user readings', async () => {
            const res = await request(app).get('/api/user/readings');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('DELETE /api/user/readings/:id', () => {
        it('should delete a reading', async () => {
            const res = await request(app).delete('/api/user/readings/1');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('PUT /api/user/password', () => {
        it('should change password via admin api', async () => {
            supabase.auth.admin.updateUserById.mockResolvedValue({ error: null });

            const res = await request(app)
                .put('/api/user/password')
                .send({ password: 'newpassword123' });

            expect(res.status).toBe(200);
            expect(supabase.auth.admin.updateUserById).toHaveBeenCalledWith('test-user-id', { password: 'newpassword123' });
        });
    });
});
