/**
 * Horoscope Email Subscription Routes
 * POST   /api/subscribe/horoscope  — subscribe
 * GET    /api/subscribe/horoscope/unsubscribe?token=xxx — one-click unsubscribe
 */
import express from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { supabase } from '../db-supabase.js';

const router = express.Router();

const subscribeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, error: 'Příliš mnoho pokusů. Zkuste to za 15 minut.' }
});

const VALID_SIGNS = ['Beran', 'Býk', 'Blíženci', 'Rak', 'Lev', 'Panna', 'Váhy', 'Štír', 'Střelec', 'Kozoroh', 'Vodnář', 'Ryby'];

function renderUnsubscribePage({ title, message }) {
    return `<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8">
            <title>${title} — Mystická Hvězda</title>
            <link rel="stylesheet" href="/css/style.v2.min.css?v=11">
            </head><body class="unsubscribe-page"><div class="unsubscribe-page__box">
            <h1>${title}</h1>
            <p>${message}</p>
            <a href="/">← Zpět na Mystickou Hvězdu</a>
            </div></body></html>`;
}

// POST /api/subscribe/horoscope
router.post('/', subscribeLimiter, async (req, res) => {
    const { email, zodiac_sign } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, error: 'Neplatná emailová adresa.' });
    }
    if (!zodiac_sign || !VALID_SIGNS.includes(zodiac_sign)) {
        return res.status(400).json({ success: false, error: 'Neplatné znamení. Vyberte ze seznamu.' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    try {
        const { error } = await supabase
            .from('horoscope_subscriptions')
            .upsert({
                email: email.toLowerCase().trim(),
                zodiac_sign,
                unsubscribe_token: token,
                active: true,
                subscribed_at: new Date().toISOString(),
                unsubscribed_at: null
            }, {
                onConflict: 'email',
                ignoreDuplicates: false
            });

        if (error) throw error;

        // Send confirmation email (non-blocking)
        sendConfirmationEmail(email, zodiac_sign).catch(e =>
            console.error('[HoroscopeSub] Confirmation email failed:', e.message)
        );

        res.json({ success: true, message: 'Odběr byl aktivován. Potvrzení přijde na email.' });
    } catch (err) {
        console.error('[HoroscopeSub] Subscribe error:', err);
        res.status(500).json({ success: false, error: 'Chyba serveru. Zkuste to prosím znovu.' });
    }
});

// GET /api/subscribe/horoscope/unsubscribe?token=xxx
router.get('/unsubscribe', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send(renderUnsubscribePage({
            title: 'Neplatný odkaz',
            message: 'Odkaz pro odhlášení není kompletní.'
        }));
    }

    try {
        const { data, error } = await supabase
            .from('horoscope_subscriptions')
            .update({ active: false, unsubscribed_at: new Date().toISOString() })
            .eq('unsubscribe_token', token)
            .eq('active', true)
            .select('id')
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return res.status(404).send(renderUnsubscribePage({
                title: 'Odkaz neexistuje',
                message: 'Odkaz pro odhlášení neexistuje nebo už byl použit.'
            }));
        }

        res.send(renderUnsubscribePage({
            title: 'Odhlášení úspěšné',
            message: 'Byl jsi odhlášen z denního horoskopu.'
        }));
    } catch (err) {
        console.error('[HoroscopeSub] Unsubscribe error:', err);
        res.status(500).send(renderUnsubscribePage({
            title: 'Chyba serveru',
            message: 'Zkuste to prosím znovu.'
        }));
    }
});

async function sendConfirmationEmail(email, sign) {
    const { sendEmail, EMAIL_TEMPLATES } = await import('../email-service.js');
    // Only send if template exists, otherwise skip silently
    if (!EMAIL_TEMPLATES['horoscope_subscription_confirm']) return;
    await sendEmail({ to: email, template: 'horoscope_subscription_confirm', data: { sign } });
}

export default router;
