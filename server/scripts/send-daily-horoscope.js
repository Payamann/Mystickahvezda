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
            process.env.SUPABASE_URL,
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

export async function run() {
    const { supabase, sendEmail } = await getRuntimeDeps();
    console.log(`[DailyHoroscope] Starting — ${new Date().toISOString()}`);

    const { data: subs, error } = await supabase
        .from('horoscope_subscriptions')
        .select('email, zodiac_sign, unsubscribe_token')
        .eq('active', true);

    if (error) {
        console.error('[DailyHoroscope] Failed to fetch subscribers:', error.message);
        return;
    }

    if (!subs || subs.length === 0) {
        console.log('[DailyHoroscope] No active subscribers.');
        return;
    }

    console.log(`[DailyHoroscope] ${subs.length} subscribers across ${new Set(subs.map(s => s.zodiac_sign)).size} signs`);

    const horoscopeCache = {};
    const uniqueSigns = [...new Set(subs.map(s => s.zodiac_sign))];

    for (const sign of uniqueSigns) {
        try {
            horoscopeCache[sign] = await getOrGenerateHoroscope(sign);
            console.log(`[DailyHoroscope] ✓ Generated horoscope for ${sign}`);
        } catch (e) {
            console.error(`[DailyHoroscope] ✗ Failed to generate for ${sign}:`, e.message);
        }
    }

    const dateStr = new Date().toLocaleDateString('cs-CZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let sent = 0, failed = 0;

    for (const sub of subs) {
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
            sent++;
        } catch (e) {
            console.error(`[DailyHoroscope] ✗ Failed to send to ${sub.email}:`, e.message);
            failed++;
        }

        await new Promise(r => setTimeout(r, 100));
    }

    await supabase
        .from('horoscope_subscriptions')
        .update({ last_sent_at: new Date().toISOString() })
        .eq('active', true);

    console.log(`[DailyHoroscope] Done — sent: ${sent}, failed: ${failed}`);
}

// Allow running standalone: node server/scripts/send-daily-horoscope.js --send
if (process.argv[1] && process.argv[1].endsWith('send-daily-horoscope.js')) {
    if (!process.argv.includes('--send')) {
        console.log('[DRY RUN] Denní horoskopy nebyly odeslány.');
        console.log('[DRY RUN] Pro ruční odeslání spusťte: node server/scripts/send-daily-horoscope.js --send');
        process.exit(0);
    }

    run().catch(e => {
        console.error('[DailyHoroscope] Fatal error:', e);
        process.exit(1);
    }).then(() => process.exit(0));
}
