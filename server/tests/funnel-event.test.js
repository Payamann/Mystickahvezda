import request from 'supertest';
import app from '../index.js';
import { buildCheckoutContextMetadata, buildPricingCancelUrl } from '../payment.js';

async function getCsrfToken() {
    const res = await request(app).get('/api/csrf-token').expect(200);
    return res.body.csrfToken;
}

describe('Public funnel event endpoint', () => {
    test('requires CSRF protection', async () => {
        const res = await request(app)
            .post('/api/payment/funnel-event')
            .send({
                eventName: 'paywall_viewed',
                source: 'inline_paywall',
                feature: 'tarot_multi_card',
                planId: 'pruvodce'
            });

        expect(res.status).toBe(403);
    });

    test('rejects non-whitelisted event names before writing', async () => {
        const csrfToken = await getCsrfToken();
        const res = await request(app)
            .post('/api/payment/funnel-event')
            .set('x-csrf-token', csrfToken)
            .send({
                eventName: 'arbitrary_event',
                source: 'inline_paywall',
                feature: 'tarot_multi_card',
                planId: 'pruvodce'
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('accepts paywall CTA click events with funnel context', async () => {
        const csrfToken = await getCsrfToken();
        const res = await request(app)
            .post('/api/payment/funnel-event')
            .set('x-csrf-token', csrfToken)
            .send({
                eventName: 'paywall_cta_clicked',
                source: 'inline_paywall',
                feature: 'numerologie_vyklad',
                planId: 'pruvodce',
                metadata: {
                    path: '/numerologie.html',
                    label: 'Odemknout Hvězdného Průvodce'
                }
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('accepts pricing recovery events with original funnel context', async () => {
        const csrfToken = await getCsrfToken();
        const res = await request(app)
            .post('/api/payment/funnel-event')
            .set('x-csrf-token', csrfToken)
            .send({
                eventName: 'pricing_preview_clicked',
                source: 'inline_paywall',
                feature: 'numerologie_vyklad',
                planId: 'pruvodce',
                metadata: {
                    path: '/cenik.html',
                    destination: '/numerologie.html?source=pricing_recommendation_preview'
                }
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const downsellRes = await request(app)
            .post('/api/payment/funnel-event')
            .set('x-csrf-token', csrfToken)
            .send({
                eventName: 'pricing_downsell_clicked',
                source: 'inline_paywall',
                feature: 'numerologie_vyklad',
                planId: 'pruvodce',
                metadata: {
                    path: '/cenik.html',
                    product: 'rocni_horoskop_2026'
                }
            });

        expect(downsellRes.status).toBe(200);
        expect(downsellRes.body.success).toBe(true);
    });
});

describe('Checkout funnel context metadata', () => {
    test('keeps only attribution fields that are safe for checkout metadata', () => {
        const metadata = buildCheckoutContextMetadata({
            entry_source: 'tarot_card_detail',
            utm_source: 'pinterest',
            utm_campaign: 'tarot_card_hvezda',
            requested_card: 'Hvězda',
            path: '/tarot.html',
            email: 'test@example.com',
            card_param: ''
        });

        expect(metadata).toEqual({
            entry_source: 'tarot_card_detail',
            utm_source: 'pinterest',
            utm_campaign: 'tarot_card_hvezda',
            requested_card: 'Hvězda'
        });
    });

    test('preserves tarot card context in checkout cancel URL', () => {
        const cancelUrl = new URL(buildPricingCancelUrl({
            planId: 'pruvodce',
            source: 'tarot_teaser_banner',
            feature: 'tarot_multi_card',
            metadata: {
                entry_source: 'tarot_card_detail',
                utm_source: 'pinterest',
                requested_card: 'Hvězda'
            }
        }));

        expect(cancelUrl.pathname).toBe('/cenik.html');
        expect(cancelUrl.searchParams.get('payment')).toBe('cancel');
        expect(cancelUrl.searchParams.get('source')).toBe('tarot_teaser_banner');
        expect(cancelUrl.searchParams.get('entry_source')).toBe('tarot_card_detail');
        expect(cancelUrl.searchParams.get('utm_source')).toBe('pinterest');
        expect(cancelUrl.searchParams.get('card')).toBe('Hvězda');
    });
});
