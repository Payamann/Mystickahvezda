import {
    filterDueSubscriptions,
    getDailyHoroscopeDateKey,
    resolveSupabaseUrl
} from '../scripts/send-daily-horoscope.js';

describe('daily horoscope email script', () => {
    test('normalizes Supabase project refs for standalone script usage', () => {
        expect(resolveSupabaseUrl('abcd1234')).toBe('https://abcd1234.supabase.co');
        expect(resolveSupabaseUrl('https://example.supabase.co')).toBe('https://example.supabase.co');
    });

    test('uses Prague calendar day for idempotency', () => {
        expect(getDailyHoroscopeDateKey(new Date('2026-05-02T06:30:00Z'))).toBe('2026-05-02');
        expect(getDailyHoroscopeDateKey(new Date('2026-05-01T22:30:00Z'))).toBe('2026-05-02');
    });

    test('filters out subscribers already sent today', () => {
        const now = new Date('2026-05-02T07:05:00Z');
        const due = filterDueSubscriptions([
            { email: 'never@example.com', active: true, last_sent_at: null },
            { email: 'yesterday@example.com', active: true, last_sent_at: '2026-05-01T07:00:00Z' },
            { email: 'today@example.com', active: true, last_sent_at: '2026-05-02T07:00:00Z' },
            { email: 'inactive@example.com', active: false, last_sent_at: null },
            { email: 'invalid-date@example.com', active: true, last_sent_at: 'not-a-date' }
        ], now);

        expect(due.map(item => item.email)).toEqual([
            'never@example.com',
            'yesterday@example.com',
            'invalid-date@example.com'
        ]);
    });
});
