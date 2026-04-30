/**
 * One-time annual horoscope product tests
 */

import request from 'supertest';
import app from '../index.js';

async function getCsrfToken() {
    const res = await request(app).get('/api/csrf-token').expect(200);
    return res.body.csrfToken;
}

describe('Roční horoskop one-time product', () => {
    test('GET /api/rocni-horoskop/product returns public product metadata', async () => {
        const res = await request(app)
            .get('/api/rocni-horoskop/product')
            .expect(200);

        expect(res.body).toMatchObject({
            id: 'rocni_horoskop_2026',
            name: 'Roční horoskop na míru 2026',
            price: 19900,
            currency: 'czk',
            year: '2026'
        });
    });

    test('POST /api/rocni-horoskop/checkout requires CSRF token', async () => {
        const res = await request(app)
            .post('/api/rocni-horoskop/checkout')
            .send({
                name: 'Test User',
                email: 'test@example.com',
                birthDate: '1990-01-01',
                sign: 'beran'
            });

        expect(res.status).toBe(403);
    });

    test('POST /api/rocni-horoskop/checkout validates e-mail before Stripe', async () => {
        const csrfToken = await getCsrfToken();
        const res = await request(app)
            .post('/api/rocni-horoskop/checkout')
            .set('x-csrf-token', csrfToken)
            .send({
                name: 'Test User',
                email: 'not-an-email',
                birthDate: '1990-01-01',
                sign: 'beran'
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/e-mail/i);
    });

    test('POST /api/rocni-horoskop/checkout validates zodiac sign before Stripe', async () => {
        const csrfToken = await getCsrfToken();
        const res = await request(app)
            .post('/api/rocni-horoskop/checkout')
            .set('x-csrf-token', csrfToken)
            .send({
                name: 'Test User',
                email: 'test@example.com',
                birthDate: '1990-01-01',
                sign: 'invalid'
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/znamen/i);
    });

    test('POST /api/rocni-horoskop/checkout rejects rollover birth date before Stripe', async () => {
        const csrfToken = await getCsrfToken();
        const res = await request(app)
            .post('/api/rocni-horoskop/checkout')
            .set('x-csrf-token', csrfToken)
            .send({
                name: 'Test User',
                email: 'test@example.com',
                birthDate: '1990-02-31',
                sign: 'beran'
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/datum/i);
    });

    test('POST /api/osobni-mapa/checkout rejects rollover birth date before Stripe', async () => {
        const csrfToken = await getCsrfToken();
        const res = await request(app)
            .post('/api/osobni-mapa/checkout')
            .set('x-csrf-token', csrfToken)
            .send({
                name: 'Test User',
                email: 'test@example.com',
                birthDate: '1990-02-31',
                birthTime: '12:30',
                birthPlace: 'Praha',
                sign: 'beran',
                grammaticalGender: 'neutral',
                focus: 'Chci pochopit hlavni tema roku.'
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/datum/i);
    });
});
