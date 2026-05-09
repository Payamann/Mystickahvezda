import { parseQueuedEmailData } from '../jobs/email-queue.js';

describe('email queue helpers', () => {
    test('parses both historical JSON strings and Supabase JSONB objects', () => {
        expect(parseQueuedEmailData('{"plan":"pruvodce"}')).toEqual({ plan: 'pruvodce' });
        expect(parseQueuedEmailData({ plan: 'vip' })).toEqual({ plan: 'vip' });
        expect(parseQueuedEmailData(null)).toEqual({});
        expect(parseQueuedEmailData('not-json')).toEqual({});
    });
});
