import {
    parseQueuedEmailData,
    processEmailQueue,
    shouldSkipQueuedEmailForPremium
} from '../jobs/email-queue.js';
import { supabase } from '../db-supabase.js';

describe('email queue helpers', () => {
    test('parses both historical JSON strings and Supabase JSONB objects', () => {
        expect(parseQueuedEmailData('{"plan":"pruvodce"}')).toEqual({ plan: 'pruvodce' });
        expect(parseQueuedEmailData({ plan: 'vip' })).toEqual({ plan: 'vip' });
        expect(parseQueuedEmailData(null)).toEqual({});
        expect(parseQueuedEmailData('not-json')).toEqual({});
    });

    test('detects premium users for gated queued emails', async () => {
        const userId = `premium-email-skip-${Date.now()}`;
        await supabase.from('users').insert({
            id: userId,
            email: `${userId}@example.com`,
            is_premium: true
        });

        await expect(shouldSkipQueuedEmailForPremium(
            { id: 'queued-skip-test', user_id: userId },
            { skipIfPremium: true }
        )).resolves.toBe(true);

        await expect(shouldSkipQueuedEmailForPremium(
            { id: 'queued-no-flag-test', user_id: userId },
            { skipIfPremium: false }
        )).resolves.toBe(false);
    });

    test('skips premium-gated queued email before sending', async () => {
        const userId = `premium-process-skip-${Date.now()}`;
        const email = `${userId}@example.com`;
        await supabase.from('users').insert({
            id: userId,
            email,
            is_premium: true
        });
        await supabase.from('email_queue').insert({
            user_id: userId,
            email_to: email,
            template: 'activation_one_time_offer_day6',
            data: {
                skipIfPremium: true,
                dedupeKey: `activation:${userId}:day6`
            },
            scheduled_for: new Date(Date.now() - 1000).toISOString(),
            status: 'pending',
            retry_count: 0
        });

        await processEmailQueue();

        const { data: queued } = await supabase
            .from('email_queue')
            .select('*')
            .eq('email_to', email)
            .maybeSingle();

        expect(queued).toMatchObject({
            status: 'skipped',
            last_error: 'Skipped because user became premium before send.'
        });
    });
});
