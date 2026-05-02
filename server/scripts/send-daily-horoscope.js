#!/usr/bin/env node
/**
 * Daily Horoscope Email Script
 * Runs every morning via Railway cron (or manually).
 * Fetches/generates today's horoscope for each zodiac sign and emails active subscribers.
 *
 * Usage:
 *   node server/scripts/send-daily-horoscope.js        # dry run guard
 *   node server/scripts/send-daily-horoscope.js --send # send manually
 * Railway cron: 0 7 * * *  (7:00 UTC = 8:00 CET / 9:00 CEST)
 */
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure env is loaded from server/.env when running standalone
import { config } from 'dotenv';
config({ path: path.join(__dirname, '../.env') });

let runtimeDeps;

export const DAILY_HOROSCOPE_TIME_ZONE = 'Europe/Prague';

export function resolveSupabaseUrl(value) {
    if (!value) return value;
    return value.startsWith('http') ? value : `https://${value}.supabase.co`;
}

export function getDailyHoroscopeDateKey(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: DAILY_HOROSCOPE_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

export function filterDueSubscriptions(subscriptions = [], now = new Date()) {
    const todayKey = getDailyHoroscopeDateKey(now);
    return subscriptions.filter((subscription) => {
        if (!subscription?.active && Object.prototype.hasOwnProperty.call(subscription || {}, 'active')) {
            return false;
        }

        if (!subscription?.last_sent_at) return true;

        const lastSent = new Date(subscription.last_sent_at);
        if (Number.isNaN(lastSent.getTime())) return true;

        return getDailyHoroscopeDateKey(lastSent) !== todayKey;
    });
}

async function getRuntimeDeps() {
    if (runtimeDeps) return runtimeDeps;

    const [
        { createClient },
        { callClaude },
        { SYSTEM_PROMPTS },
        { sendEmail },
        astrology
    ] = await Promise.all([
        import('@supabase/supabase-js'),
        import('../services/claude.js'),
        import('../config/prompts.js'),
        import('../email-service.js'),
        import('../services/astrology.js')
    ]);

    runtimeDeps = {
        supabase: createClient(
            resolveSupabaseUrl(process.env.SUPABASE_URL),
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
        ),
        callClaude,
        SYSTEM_PROMPTS,
        sendEmail,
        getHoroscopeCacheKey: astrology.getHoroscopeCacheKey,
        getCachedHoroscope: astrology.getCachedHoroscope,
        saveCachedHoroscope: astrology.saveCachedHoroscope
    };

    return runtimeDeps;
}

// Get or generate horoscope — uses the SAME cache table as the website
async function getOrGenerateHoroscope(sign) {
    const {
        callClaude,
        SYSTEM_PROMPTS,
        getHoroscopeCacheKey,
        getCachedHoroscope,
        saveCachedHoroscope
    } = await getRuntimeDeps();
    const cacheKey = getHoroscopeCacheKey(sign, 'daily');

    // Try the same cache the website uses
    const cached = await getCachedHoroscope(cacheKey);
    if (cached?.response) return cached.response;

    // Generate fresh via Claude and save to cache (website will reuse it)
    const systemPrompt = SYSTEM_PROMPTS?.horoscope || 'Jsi astrologický asistent.';
    const userMsg = `Napiš denní horoskop pro znamení ${sign}. Buď inspirativní, konkrétní a osobní. Délka: 3-4 věty.`;
    const text = await callClaude(systemPrompt, userMsg);

    const today = new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
    await saveCachedHoroscope(cacheKey, sign, 'daily', text, today);

    return text;
}

export async function run(options = {}) {
    const { supabase, sendEmail } = await getRuntimeDeps();
    const now = options.now instanceof Date ? options.now : new Date();
    console.log(`[DailyHoroscope] Starting — ${now.toISOString()}`);

    const { data: subs, error } = await supabase
        .from('horoscope_subscriptions')
        .select('id, email, zodiac_sign, unsubscribe_token, active, last_sent_at')
        .eq('active', true);

    if (error) {
        console.error('[DailyHoroscope] Failed to fetch subscribers:', error.message);
        return;
    }

    if (!subs || subs.length === 0) {
        console.log('[DailyHoroscope] No active subscribers.');
        return;
    }

    const dueSubs = options.force === true ? subs : filterDueSubscriptions(subs, now);

    if (dueSubs.length === 0) {
        console.log(`[DailyHoroscope] No subscribers due for ${getDailyHoroscopeDateKey(now)}.`);
        return { sent: 0, failed: 0, skipped: subs.length };
    }

    console.log(`[DailyHoroscope] ${dueSubs.length}/${subs.length} subscribers due across ${new Set(dueSubs.map(s => s.zodiac_sign)).size} signs`);

    const horoscopeCache = {};
    const uniqueSigns = [...new Set(dueSubs.map(s => s.zodiac_sign))];

    for (const sign of uniqueSigns) {
        try {
            horoscopeCache[sign] = await getOrGenerateHoroscope(sign);
            console.log(`[DailyHoroscope] ✓ Generated horoscope for ${sign}`);
        } catch (e) {
            console.error(`[DailyHoroscope] ✗ Failed to generate for ${sign}:`, e.message);
        }
    }

    const dateStr = now.toLocaleDateString('cs-CZ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: DAILY_HOROSCOPE_TIME_ZONE
    });
    let sent = 0, failed = 0;

    for (const sub of dueSubs) {
        const text = horoscopeCache[sub.zodiac_sign];
        if (!text) { failed++; continue; }

        try {
            await sendEmail({
                to: sub.email,
                template: 'daily_horoscope',
                data: {
                    sign: sub.zodiac_sign,
                    date: dateStr,
                    horoscope_text: text,
                    token: sub.unsubscribe_token
                }
            });
            const { error: markSentError } = await supabase
                .from('horoscope_subscriptions')
                .update({ last_sent_at: now.toISOString() })
                .eq('id', sub.id);
            if (markSentError) {
                console.error(`[DailyHoroscope] ✗ Sent but failed to mark ${sub.email}:`, markSentError.message);
                failed++;
                continue;
            }
            sent++;
        } catch (e) {
            console.error(`[DailyHoroscope] ✗ Failed to send to ${sub.email}:`, e.message);
            failed++;
        }

        await new Promise(r => setTimeout(r, 100));
    }

    console.log(`[DailyHoroscope] Done — sent: ${sent}, failed: ${failed}`);
    return { sent, failed, skipped: subs.length - dueSubs.length };
}

// Allow running standalone: node server/scripts/send-daily-horoscope.js --send
if (process.argv[1] && process.argv[1].endsWith('send-daily-horoscope.js')) {
    if (!process.argv.includes('--send')) {
        console.log('[DRY RUN] Denní horoskopy nebyly odeslány.');
        console.log('[DRY RUN] Pro ruční odeslání spusťte: node server/scripts/send-daily-horoscope.js --send');
        process.exit(0);
    }

    run({ force: process.argv.includes('--force') }).catch(e => {
        console.error('[DailyHoroscope] Fatal error:', e);
        process.exit(1);
    }).then(() => process.exit(0));
}
