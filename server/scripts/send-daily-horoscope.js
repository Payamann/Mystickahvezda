#!/usr/bin/env node
/**
 * Daily Horoscope Email Script
 * Runs every morning via Railway cron (or manually).
 * Fetches/generates today's horoscope for each zodiac sign and emails active subscribers.
 *
 * Usage: node server/scripts/send-daily-horoscope.js
 * Railway cron: 0 7 * * *  (7:00 UTC = 8:00 CET / 9:00 CEST)
 */
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure env is loaded from server/.env when running standalone
import { config } from 'dotenv';
config({ path: path.join(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { callGemini } from '../services/gemini.js';
import { SYSTEM_PROMPTS } from '../config/prompts.js';
import { EMAIL_TEMPLATES } from '../email-service.js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'noreply@mystickahvezda.cz';
const APP_URL = process.env.APP_URL || 'https://mystickahvezda.cz';

const SIGNS = ['Beran', 'Býk', 'Blíženci', 'Rak', 'Lev', 'Panna', 'Váhy', 'Štír', 'Střelec', 'Kozoroh', 'Vodnář', 'Ryby'];

async function getOrGenerateHoroscope(sign) {
    const today = new Date().toISOString().slice(0, 10);

    // Try DB cache first (reuse what the web already generated today)
    const { data: cached } = await supabase
        .from('horoscope_cache')
        .select('content')
        .eq('sign', sign)
        .eq('period', 'daily')
        .gte('created_at', `${today}T00:00:00Z`)
        .maybeSingle();

    if (cached?.content) return cached.content;

    // Generate fresh via Gemini
    const systemPrompt = SYSTEM_PROMPTS?.horoscope || 'Jsi astrologický asistent.';
    const userMsg = `Napiš denní horoskop pro znamení ${sign}. Buď inspirativní, konkrétní a osobní. Délka: 3-4 věty.`;
    const text = await callGemini(systemPrompt, userMsg);
    return text;
}

export async function run() {
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

        const template = EMAIL_TEMPLATES['daily_horoscope'];
        const html = template.getHtml({
            sign: sub.zodiac_sign,
            date: dateStr,
            horoscope_text: text,
            token: sub.unsubscribe_token
        });
        const subject = typeof template.subject === 'function'
            ? template.subject({ sign: sub.zodiac_sign, date: dateStr })
            : template.subject;

        try {
            await resend.emails.send({ from: FROM, to: sub.email, subject, html });
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

// Allow running standalone: node server/scripts/send-daily-horoscope.js
if (process.argv[1] && process.argv[1].endsWith('send-daily-horoscope.js')) {
    run().catch(e => {
        console.error('[DailyHoroscope] Fatal error:', e);
        process.exit(1);
    }).then(() => process.exit(0));
}
