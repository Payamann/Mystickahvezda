import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index.js';
import { supabase } from '../db-supabase.js';
import { JWT_SECRET } from '../config/jwt.js';

async function getCsrfToken() {
    const res = await request(app).get('/api/csrf-token').expect(200);
    return res.body.csrfToken;
}

describe('Push notification API', () => {
    function createAdminToken() {
        return jwt.sign({
            id: 'push-admin-test',
            email: 'admin@example.com',
            role: 'admin'
        }, process.env.JWT_SECRET, { expiresIn: '1h' });
    }

    function createUserToken() {
        return jwt.sign({
            id: 'push-user-test',
            email: 'user@example.com',
            role: 'user'
        }, process.env.JWT_SECRET, { expiresIn: '1h' });
    }

    test('POST /api/push/subscribe rejects missing CSRF', async () => {
        const res = await request(app)
            .post('/api/push/subscribe')
            .send({
                subscription: {
                    endpoint: 'https://push.example.test/no-csrf',
                    keys: { p256dh: 'test-p256dh', auth: 'test-auth' }
                }
            });

        expect(res.status).toBe(403);
    });

    test('POST /api/push/subscribe validates subscription payload', async () => {
        const csrfToken = await getCsrfToken();

        const res = await request(app)
            .post('/api/push/subscribe')
            .set('x-csrf-token', csrfToken)
            .send({ subscription: {} });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('POST /api/push/unsubscribe validates endpoint payload', async () => {
        const csrfToken = await getCsrfToken();

        const res = await request(app)
            .post('/api/push/unsubscribe')
            .set('x-csrf-token', csrfToken)
            .send({ endpoint: '' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('can subscribe and unsubscribe a browser push endpoint', async () => {
        const csrfToken = await getCsrfToken();
        const subscription = {
            endpoint: `https://push.example.test/${Date.now()}`,
            keys: {
                p256dh: 'test-p256dh',
                auth: 'test-auth'
            }
        };

        const subscribeRes = await request(app)
            .post('/api/push/subscribe')
            .set('x-csrf-token', csrfToken)
            .send({ subscription })
            .expect(200);

        expect(subscribeRes.body.success).toBe(true);

        const unsubscribeRes = await request(app)
            .post('/api/push/unsubscribe')
            .set('x-csrf-token', csrfToken)
            .send({ endpoint: subscription.endpoint })
            .expect(200);

        expect(unsubscribeRes.body.success).toBe(true);
    });

    test('subscribe associates authenticated cookie user through shared JWT config', async () => {
        const originalJwtSecret = process.env.JWT_SECRET;
        const csrfToken = await getCsrfToken();
        const userId = 'push-cookie-user';
        const token = jwt.sign({ id: userId, email: 'push-cookie@example.com' }, JWT_SECRET, { expiresIn: '1h' });
        const subscription = {
            endpoint: `https://push.example.test/cookie-${Date.now()}`,
            keys: {
                p256dh: 'test-p256dh-cookie',
                auth: 'test-auth-cookie'
            }
        };

        delete process.env.JWT_SECRET;

        try {
            await request(app)
                .post('/api/push/subscribe')
                .set('x-csrf-token', csrfToken)
                .set('Cookie', [`auth_token=${token}`])
                .send({ subscription })
                .expect(200);

            const { data } = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('endpoint', subscription.endpoint)
                .maybeSingle();

            expect(data.user_id).toBe(userId);
        } finally {
            if (originalJwtSecret === undefined) {
                delete process.env.JWT_SECRET;
            } else {
                process.env.JWT_SECRET = originalJwtSecret;
            }
        }
    });

    test('POST /api/push/send-test rejects non-admin users', async () => {
        const csrfToken = await getCsrfToken();
        const res = await request(app)
            .post('/api/push/send-test')
            .set('x-csrf-token', csrfToken)
            .set('Authorization', `Bearer ${createUserToken()}`)
            .send({ body: 'Test push' })
            .expect(403);

        expect(res.body.error).toContain('Přístup odepřen');
    });

    test('POST /api/push/send-test loads web-push before VAPID validation', async () => {
        const originalAdminEmails = process.env.ADMIN_EMAILS;
        const originalPublicKey = process.env.VAPID_PUBLIC_KEY;
        const originalPrivateKey = process.env.VAPID_PRIVATE_KEY;

        delete process.env.ADMIN_EMAILS;
        delete process.env.VAPID_PUBLIC_KEY;
        delete process.env.VAPID_PRIVATE_KEY;

        try {
            const csrfToken = await getCsrfToken();
            const res = await request(app)
                .post('/api/push/send-test')
                .set('x-csrf-token', csrfToken)
                .set('Authorization', `Bearer ${createAdminToken()}`)
                .send({ body: 'Test push' })
                .expect(200);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('VAPID');
            expect(res.body.error).not.toContain('není nainstalován');
        } finally {
            if (originalAdminEmails === undefined) {
                delete process.env.ADMIN_EMAILS;
            } else {
                process.env.ADMIN_EMAILS = originalAdminEmails;
            }

            if (originalPublicKey === undefined) {
                delete process.env.VAPID_PUBLIC_KEY;
            } else {
                process.env.VAPID_PUBLIC_KEY = originalPublicKey;
            }

            if (originalPrivateKey === undefined) {
                delete process.env.VAPID_PRIVATE_KEY;
            } else {
                process.env.VAPID_PRIVATE_KEY = originalPrivateKey;
            }
        }
    });
});
