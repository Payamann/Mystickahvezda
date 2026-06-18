import request from 'supertest';
import app from '../index.js';

async function getCsrfToken() {
    const res = await request(app).get('/api/csrf-token').expect(200);
    return res.body.csrfToken;
}

function authIp(testName) {
    const suffix = [...testName].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 200;
    return `203.0.113.${suffix + 1}`;
}

describe('Auth edge cases', () => {
    test('registration accepts omitted birth date without downgrading to a validation error', async () => {
        const csrfToken = await getCsrfToken();
        const email = `no-birth-date-${Date.now()}@example.com`;

        const res = await request(app)
            .post('/api/auth/register')
            .set('x-csrf-token', csrfToken)
            .set('X-Forwarded-For', authIp('register-no-birth-date'))
            .send({
                email,
                password: 'TestPassword123!',
                confirm_password: 'TestPassword123!',
                first_name: 'Jana'
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.requireEmailVerification).toBeUndefined();
        expect(res.body.emailVerificationSkipped).toBe(true);
        expect(res.body.user).toMatchObject({
            email,
            subscription_status: 'free',
            first_name: 'Jana'
        });
        expect(res.headers['set-cookie']?.join(';')).toContain('auth_token=');
        expect(res.body.error).toBeUndefined();
    });

    test('registration validates password_confirm from standalone auth form', async () => {
        const csrfToken = await getCsrfToken();

        const res = await request(app)
            .post('/api/auth/register')
            .set('x-csrf-token', csrfToken)
            .set('X-Forwarded-For', authIp('register-password-confirm-mismatch'))
            .send({
                email: `password-confirm-${Date.now()}@example.com`,
                password: 'TestPassword123!',
                password_confirm: 'DifferentPassword123!',
                first_name: 'Jana'
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    test('forgot password keeps invalid emails non-enumerable', async () => {
        const csrfToken = await getCsrfToken();

        const res = await request(app)
            .post('/api/auth/forgot-password')
            .set('x-csrf-token', csrfToken)
            .set('X-Forwarded-For', authIp('forgot-invalid-email'))
            .send({ email: 'not-an-email' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBeDefined();
        expect(res.body.error).toBeUndefined();
    });

    test('reset password with CSRF but without bearer token returns auth error', async () => {
        const csrfToken = await getCsrfToken();

        const res = await request(app)
            .post('/api/auth/reset-password')
            .set('x-csrf-token', csrfToken)
            .set('X-Forwarded-For', authIp('reset-missing-token'))
            .send({ password: 'NewPassword123!' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBeDefined();
    });
});
