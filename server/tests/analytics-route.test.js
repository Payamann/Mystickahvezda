import request from 'supertest';
import app from '../index.js';
import {
    normalizeAnalyticsEventName,
    sanitizeAnalyticsMetadata
} from '../routes/analytics.js';
import { sanitizeServerTelemetryMetadata } from '../services/telemetry.js';

async function getCsrfToken() {
    const res = await request(app).get('/api/csrf-token').expect(200);
    return res.body.csrfToken;
}

describe('First-party analytics endpoint', () => {
    test('requires CSRF protection', async () => {
        const res = await request(app)
            .post('/api/analytics/event')
            .send({
                eventName: 'cta_clicked',
                metadata: { location: 'homepage_hero' }
            });

        expect(res.status).toBe(403);
    });

    test('rejects unknown event names', async () => {
        const csrfToken = await getCsrfToken();
        const res = await request(app)
            .post('/api/analytics/event')
            .set('x-csrf-token', csrfToken)
            .send({
                eventName: 'totally_unknown_event',
                metadata: { location: 'homepage_hero' }
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('accepts whitelisted client events', async () => {
        const csrfToken = await getCsrfToken();
        const res = await request(app)
            .post('/api/analytics/event')
            .set('x-csrf-token', csrfToken)
            .send({
                eventName: 'cta_clicked',
                feature: 'daily_guidance',
                page: 'Homepage',
                path: '/',
                metadata: {
                    location: 'homepage_hero',
                    label: 'Začít zdarma'
                }
            });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, accepted: 1 });
    });

    test('accepts bounded batches and ignores invalid events', async () => {
        const csrfToken = await getCsrfToken();
        const res = await request(app)
            .post('/api/analytics/batch')
            .set('x-csrf-token', csrfToken)
            .send({
                events: [
                    { eventName: 'page_view', page: 'Homepage', path: '/' },
                    { eventName: 'action_profile_opened', feature: 'profile' },
                    { eventName: 'feedback_submitted', metadata: { value: 'yes', component: 'footer_feedback' } },
                    { eventName: 'not_allowed' }
                ]
            });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, accepted: 3 });
    });

    test('sanitizes metadata and event names', () => {
        expect(normalizeAnalyticsEventName('CTA_CLICKED')).toBe('cta_clicked');
        expect(normalizeAnalyticsEventName('action_saved_reading')).toBe('action_saved_reading');
        expect(normalizeAnalyticsEventName('astrocartography_calculated')).toBe('astrocartography_calculated');
        expect(normalizeAnalyticsEventName('password_reset_requested')).toBe('password_reset_requested');
        expect(normalizeAnalyticsEventName('bad-event-name')).toBeNull();

        const metadata = sanitizeAnalyticsMetadata({
            email: 'jana@example.com',
            label: 'Kliknout',
            url: '/prihlaseni.html?email=jana@example.com&token=abc123&source=test',
            message: 'Failed for jana@example.com',
            sessionId: 'session-secret',
            count: 2,
            nested: { unsafe: true }
        });

        expect(metadata).toEqual({
            email: '[redacted]',
            label: 'Kliknout',
            url: '/prihlaseni.html?email=[redacted]&token=[redacted]&source=test',
            message: 'Failed for [redacted-email]',
            sessionId: '[redacted]',
            count: 2
        });
    });

    test('redacts sensitive server telemetry metadata', () => {
        const metadata = sanitizeServerTelemetryMetadata({
            path: '/prihlaseni.html?email=jana@example.com&token=abc123&source=test',
            message: 'Failed for jana@example.com',
            sessionId: 'session-secret',
            statusCode: 500
        });

        expect(metadata).toEqual({
            path: '/prihlaseni.html?email=[redacted]&token=[redacted]&source=test',
            message: 'Failed for [redacted-email]',
            sessionId: '[redacted]',
            statusCode: 500
        });
    });
});
