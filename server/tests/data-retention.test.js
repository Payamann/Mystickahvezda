import {
    getRetentionCutoffDate,
    normalizeRetentionDays,
    pruneHoroscopeCaches,
    prunePersonalDataCaches
} from '../jobs/data-retention.js';

describe('Data retention helpers', () => {
    test('normalizes personal cache retention days with a safe minimum', () => {
        expect(normalizeRetentionDays(undefined)).toBe(180);
        expect(normalizeRetentionDays('7')).toBe(30);
        expect(normalizeRetentionDays('90')).toBe(90);
        expect(normalizeRetentionDays('bad')).toBe(180);
    });

    test('calculates cutoff date from retention window', () => {
        const now = new Date('2026-04-26T12:00:00.000Z');
        expect(getRetentionCutoffDate(30, now)).toBe('2026-03-27T12:00:00.000Z');
    });

    test('includes analytics events with a separate retention override', async () => {
        const originalAnalyticsRetention = process.env.ANALYTICS_RETENTION_DAYS;
        process.env.ANALYTICS_RETENTION_DAYS = '45';

        try {
            const summary = await prunePersonalDataCaches({ days: '90' });
            const analyticsResult = summary.results.find((row) => row.table === 'analytics_events');

            expect(analyticsResult).toMatchObject({
                ok: true,
                retentionDays: 45
            });
            expect(summary.results.map((row) => row.table)).toEqual(expect.arrayContaining([
                'cache_horoscopes',
                'cache_numerology',
                'cache_past_life',
                'cache_medicine_wheel',
                'one_time_order_inputs',
                'analytics_events',
                'login_attempts'
            ]));
        } finally {
            if (originalAnalyticsRetention === undefined) delete process.env.ANALYTICS_RETENTION_DAYS;
            else process.env.ANALYTICS_RETENTION_DAYS = originalAnalyticsRetention;
        }
    });

    test('supports a separate retention override for one-time order inputs', async () => {
        const originalOrderRetention = process.env.ONE_TIME_ORDER_RETENTION_DAYS;
        process.env.ONE_TIME_ORDER_RETENTION_DAYS = '60';

        try {
            const summary = await prunePersonalDataCaches({ days: '180' });
            const orderResult = summary.results.find((row) => row.table === 'one_time_order_inputs');

            expect(orderResult).toMatchObject({
                ok: true,
                retentionDays: 60
            });
        } finally {
            if (originalOrderRetention === undefined) delete process.env.ONE_TIME_ORDER_RETENTION_DAYS;
            else process.env.ONE_TIME_ORDER_RETENTION_DAYS = originalOrderRetention;
        }
    });

    test('prunes horoscope cache with period-specific short TTLs', async () => {
        const originalDailyRetention = process.env.HOROSCOPE_DAILY_CACHE_RETENTION_DAYS;
        process.env.HOROSCOPE_DAILY_CACHE_RETENTION_DAYS = '5';

        try {
            const results = await pruneHoroscopeCaches({
                now: new Date('2026-05-09T12:00:00.000Z')
            });

            expect(results).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    table: 'cache_horoscopes',
                    period: 'daily',
                    retentionDays: 5,
                    cutoff: '2026-05-04T12:00:00.000Z',
                    ok: true
                }),
                expect.objectContaining({
                    table: 'cache_horoscopes',
                    period: 'weekly',
                    retentionDays: 14,
                    ok: true
                }),
                expect.objectContaining({
                    table: 'cache_horoscopes',
                    period: 'monthly',
                    retentionDays: 60,
                    ok: true
                })
            ]));
        } finally {
            if (originalDailyRetention === undefined) delete process.env.HOROSCOPE_DAILY_CACHE_RETENTION_DAYS;
            else process.env.HOROSCOPE_DAILY_CACHE_RETENTION_DAYS = originalDailyRetention;
        }
    });
});
